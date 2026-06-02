const ApiError = require("../../shared/errors/apiError");
const { ATTENDANCE_STATUS } = require("../../shared/constants/attendance-status");
const timeTrackingService = require("../time-tracking/time-tracking.service");
const User = require("../users/user.model");
const repository = require("./attendance.repository");

const getWorkspaceId = (user) => user.adminRef || user._id;

const getUserId = (user) => user._id || user.id;

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const minutesBetween = (start, end) => Math.max(0, Math.round((end - start) / (1000 * 60)));

const getMonday = (date = new Date()) => {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getWeekRange = (weekStartInput) => {
  const weekStart = weekStartInput ? new Date(`${weekStartInput}T00:00:00.000Z`) : getMonday();

  if (Number.isNaN(weekStart.getTime())) {
    throw ApiError.badRequest("Invalid weekStart. Use YYYY-MM-DD format.", [
      {
        field: "weekStart",
        example: "2026-06-02",
        guidance: "Pass any Monday date as YYYY-MM-DD for Monday-Sunday attendance reports.",
      },
    ]);
  }

  const monday = getMonday(weekStart);
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd };
};

const normalizePagination = ({ page = "1", limit = "10" }) => {
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));

  return { page: parsedPage, limit: parsedLimit };
};

const getAttendanceAccessScope = async ({ user, query = {} }) => {
  const userId = getUserId(user);

  if (user.role === "admin") {
    const filter = { workspace: userId };
    if (query.userId) filter.user = query.userId;

    return { accessScope: "workspace", filter, allowedUserIds: null };
  }

  if (user.role === "manager") {
    const teamMembers = await User.find({ manager: userId }).select("_id");
    const allowedUserIds = teamMembers.map((member) => member._id);

    if (query.userId && !allowedUserIds.some((id) => String(id) === String(query.userId))) {
      throw ApiError.forbidden("Managers can only view attendance for their assigned team.");
    }

    return {
      accessScope: "team",
      filter: {
        workspace: getWorkspaceId(user),
        user: query.userId || { $in: allowedUserIds },
      },
      allowedUserIds,
    };
  }

  if (query.userId && String(query.userId) !== String(userId)) {
    throw ApiError.forbidden("Employees can only view their own attendance.");
  }

  return {
    accessScope: "self",
    filter: { workspace: getWorkspaceId(user), user: userId },
    allowedUserIds: [userId],
  };
};

const applyWeeklyFilters = async ({ filter, accessScope, allowedUserIds, query }) => {
  const nextFilter = { ...filter };

  if (query.status) {
    const allowedStatuses = Object.values(ATTENDANCE_STATUS).filter((status) => status !== ATTENDANCE_STATUS.NONE);
    if (!allowedStatuses.includes(query.status)) {
      throw ApiError.badRequest("Invalid attendance status filter", [
        { field: "status", allowedValues: allowedStatuses },
      ]);
    }
    nextFilter.status = query.status;
  }

  if (query.search && accessScope !== "self") {
    const userSearch = {
      $or: [
        { name: new RegExp(query.search, "i") },
        { email: new RegExp(query.search, "i") },
        { role: new RegExp(query.search, "i") },
      ],
    };

    if (Array.isArray(allowedUserIds)) {
      userSearch._id = { $in: allowedUserIds };
    } else {
      userSearch.adminRef = nextFilter.workspace;
    }

    const users = await User.find(userSearch).select("_id");
    nextFilter.user = { $in: users.map((foundUser) => foundUser._id) };
  }

  return nextFilter;
};

const migrateLegacyAttendanceRecord = ({ attendance, workspaceId, fallbackCheckInAt }) => {
  if (!attendance) return attendance;

  const legacyLoginTime = attendance.get?.("loginTime");
  const legacyLogoutTime = attendance.get?.("logoutTime");
  const legacyTotalHours = attendance.get?.("totalHours");

  attendance.workspace = workspaceId;
  attendance.checkInAt = attendance.checkInAt || legacyLoginTime || fallbackCheckInAt;
  attendance.checkOutAt = attendance.checkOutAt || legacyLogoutTime;
  attendance.totalMinutes = attendance.totalMinutes || Math.round((legacyTotalHours || 0) * 60);

  return attendance;
};

const getStoredCheckInAt = (attendance) => attendance?.checkInAt || attendance?.get?.("loginTime");

const getStoredCheckOutAt = (attendance) => attendance?.checkOutAt || attendance?.get?.("logoutTime");

const checkIn = async ({ user }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const today = getToday();
  const checkInAt = new Date();
  const existing = await repository.findByUserWorkspaceAndDate(userId, workspaceId, today);
  const legacyAttendance = existing || await repository.findLegacyByUserAndDate(userId, today);
  const storedCheckInAt = getStoredCheckInAt(legacyAttendance);
  const storedCheckOutAt = getStoredCheckOutAt(legacyAttendance);
  const attendance = legacyAttendance
    ? migrateLegacyAttendanceRecord({ attendance: legacyAttendance, workspaceId, fallbackCheckInAt: checkInAt })
    : repository.create({
      user: userId,
      workspace: workspaceId,
      date: today,
    });

  if (storedCheckOutAt) {
    throw ApiError.badRequest("Already checked out for today.");
  }

  if (storedCheckInAt && !storedCheckOutAt) {
    attendance.status = ATTENDANCE_STATUS.PRESENT;
    await attendance.save();
    return attendance;
  }

  attendance.checkInAt = checkInAt;
  attendance.status = ATTENDANCE_STATUS.PRESENT;
  await attendance.save();

  return attendance;
};

const checkOut = async ({ user, io, req }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const today = getToday();
  const attendance = await repository.findByUserWorkspaceAndDate(userId, workspaceId, today);

  if (!attendance?.checkInAt) {
    throw ApiError.notFound("No attendance check-in found for today.");
  }

  if (attendance.checkOutAt) {
    throw ApiError.badRequest("Already checked out for today.");
  }

  const checkOutAt = new Date();
  attendance.checkOutAt = checkOutAt;
  attendance.totalMinutes = minutesBetween(attendance.checkInAt, checkOutAt);
  attendance.status = ATTENDANCE_STATUS.PRESENT;
  await attendance.save();

  await timeTrackingService.stopActiveEntryForAttendanceCheckout({
    user,
    clockOutAt,
    io,
    req,
  });

  return attendance;
};

const getMyHistory = (userId) => repository.findUserHistory(userId);

const getWorkspaceAttendance = (user) => {
  const workspaceId = user.role === "admin" ? user._id : user.adminRef;
  return repository.findWorkspaceAttendance(workspaceId);
};

const assertCanManageRecord = async ({ user, attendance }) => {
  if (!attendance) {
    throw ApiError.notFound("Attendance record not found.");
  }

  if (user.role === "admin" && String(attendance.workspace) === String(user._id)) {
    return;
  }

  if (user.role === "manager") {
    const employee = attendance.user;
    if (employee?.manager && String(employee.manager) === String(user._id)) {
      return;
    }
  }

  throw ApiError.forbidden("You do not have permission to manage this attendance record.");
};

const manualClose = async ({ id, user, payload = {} }) => {
  if (!["admin", "manager"].includes(user.role)) {
    throw ApiError.forbidden("Only admins and managers can manually close attendance.");
  }

  const attendance = await repository.findById(id);
  await assertCanManageRecord({ user, attendance });

  if (!attendance.checkInAt) {
    throw ApiError.badRequest("Cannot manually close attendance without a check-in time.");
  }

  if (attendance.checkOutAt) {
    throw ApiError.badRequest("Attendance is already closed.");
  }

  const closeAt = payload.checkOutAt ? new Date(payload.checkOutAt) : new Date();
  if (Number.isNaN(closeAt.getTime()) || closeAt < attendance.checkInAt) {
    throw ApiError.badRequest("Manual close time must be after check-in time.");
  }

  attendance.checkOutAt = closeAt;
  attendance.totalMinutes = minutesBetween(attendance.checkInAt, closeAt);
  attendance.status = payload.status || ATTENDANCE_STATUS.PRESENT;
  attendance.closedBy = getUserId(user);
  attendance.closedReason = payload.closedReason || "Manual close";
  await attendance.save();

  return attendance;
};

const getWeeklyAttendance = async ({ user, query = {} }) => {
  const { page, limit } = normalizePagination(query);
  const { weekStart, weekEnd } = getWeekRange(query.weekStart);
  const access = await getAttendanceAccessScope({ user, query });
  const filter = await applyWeeklyFilters({ ...access, query });
  const [result, summary] = await Promise.all([
    repository.findWeeklyAttendance({ filter, page, limit, weekStart, weekEnd }),
    repository.summarizeWeeklyAttendance({ filter, weekStart, weekEnd }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / limit));

  return {
    records: result.records,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    week: {
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    },
    accessScope: access.accessScope,
    summary,
  };
};

const markIncompleteOpenRecords = async () => {
  const today = getToday();
  const records = await repository.model.find({
    date: { $lt: today },
    checkInAt: { $exists: true },
    checkOutAt: { $exists: false },
    status: ATTENDANCE_STATUS.PRESENT,
  });

  await Promise.all(records.map((record) => {
    record.status = ATTENDANCE_STATUS.INCOMPLETE;
    return record.save();
  }));

  return records.length;
};

module.exports = {
  repository,
  checkIn,
  checkOut,
  manualClose,
  getWeeklyAttendance,
  markIncompleteOpenRecords,
  getAttendanceAccessScope,
  clockIn: checkIn,
  clockOut: checkOut,
  getMyHistory,
  getWorkspaceAttendance,
};
