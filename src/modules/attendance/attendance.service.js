const ApiError = require("../../utils/apiError");
const User = require("../../models/user.model");
const { getShiftDate, validateTimezone } = require("../../shared/utils/timezone");
const workspacePolicyService = require("../workspace-policy/workspace-policy.service");
const repository = require("./attendance.repository");

const ACTIVE_STATES = ["working", "break"];

const getWorkspaceId = (user) => user.adminRef || user._id || user.id;
const normalizeDateInput = (date = new Date()) => (date instanceof Date ? date : new Date(date));

const addDaysToShiftDate = (shiftDate, days) => {
  const date = new Date(`${shiftDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getWeekRange = (weekStart) => {
  const base = weekStart ? new Date(`${weekStart}T00:00:00.000Z`) : new Date();
  const day = base.getUTCDay();
  const diff = base.getUTCDate() - day + (day === 0 ? -6 : 1);
  base.setUTCDate(diff);
  const start = base.toISOString().slice(0, 10);
  return { weekStart: start, weekEnd: addDaysToShiftDate(start, 6) };
};

const invalidTransition = (message, currentState, attendanceMode = "fixed", allowedActions = []) =>
  ApiError.badRequest(message, [], {
    errorCode: "INVALID_STATE_TRANSITION",
    attendanceMode,
    currentState,
    allowedActions,
  });

const getActiveSession = (attendance) => attendance.sessions.find((session) => !session.endAt);
const minutesBetween = (startAt, endAt) => Math.max(0, Math.round((endAt.getTime() - new Date(startAt).getTime()) / 60000));

const getPolicyForUser = async (user) => workspacePolicyService.ensureWorkspacePolicy(getWorkspaceId(user));

const calculateImplicitBreakMinutes = (sessions = []) => {
  const completedWorkSessions = sessions
    .filter((session) => session.type === "work" && session.startAt && session.endAt)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return completedWorkSessions.reduce((total, session, index) => {
    if (index === 0) return total;
    const previous = completedWorkSessions[index - 1];
    return total + minutesBetween(previous.endAt, new Date(session.startAt));
  }, 0);
};

const getAllowedActions = (attendance, attendanceMode = "fixed") => {
  const currentState = attendance?.currentState || "offline";
  const hasActiveSession = Boolean(attendance && getActiveSession(attendance));

  if (attendanceMode === "flexible") {
    return hasActiveSession ? ["check-out"] : ["check-in"];
  }

  if (currentState === "offline") return ["check-in"];
  if (currentState === "working") return ["start-break", "check-out"];
  if (currentState === "break") return ["end-break", "check-out"];
  return [];
};

const computeTotals = (attendance, attendanceMode = "fixed") => {
  attendance.totalWorkMinutes = attendance.sessions
    .filter((session) => session.type === "work" && session.endAt)
    .reduce((sum, session) => sum + minutesBetween(session.startAt, session.endAt), 0);
  attendance.totalBreakMinutes = attendanceMode === "flexible"
    ? calculateImplicitBreakMinutes(attendance.sessions)
    : attendance.sessions
      .filter((session) => session.type === "break" && session.endAt)
      .reduce((sum, session) => sum + minutesBetween(session.startAt, session.endAt), 0);
  attendance.totalMinutes = attendance.totalWorkMinutes;
  return attendance;
};

const syncLegacyAliases = (attendance) => {
  attendance.user = attendance.user || attendance.userId;
  attendance.workspace = attendance.workspace || attendance.workspaceId;
  attendance.date = attendance.date || new Date(`${attendance.shiftDate}T00:00:00.000Z`);
  attendance.checkInAt = attendance.sessions[0]?.startAt || attendance.checkInAt;
  const closedSessions = attendance.sessions.filter((session) => session.endAt);
  attendance.checkOutAt = closedSessions[closedSessions.length - 1]?.endAt || attendance.checkOutAt;
  attendance.status = attendance.attendanceStatus === "half_day" ? "half-day" : attendance.attendanceStatus;
  return attendance;
};

const saveAttendance = async (attendance, attendanceMode = "fixed") => {
  computeTotals(attendance, attendanceMode);
  syncLegacyAliases(attendance);
  return repository.save(attendance);
};

const findToday = ({ user, timezone = "UTC", at = new Date() }) => {
  const workspaceId = getWorkspaceId(user);
  const shiftDate = getShiftDate(normalizeDateInput(at), timezone);
  return repository.findByUserWorkspaceAndShiftDate(user._id || user.id, workspaceId, shiftDate);
};

const getOrCreateToday = async ({ user, timezone = "UTC", at = new Date() }) => {
  const workspaceId = getWorkspaceId(user);
  const userId = user._id || user.id;
  const safeTimezone = validateTimezone(timezone);
  const actionAt = normalizeDateInput(at);
  const shiftDate = getShiftDate(actionAt, safeTimezone);
  let attendance = await repository.findByUserWorkspaceAndShiftDate(userId, workspaceId, shiftDate);

  if (!attendance) {
    attendance = repository.create({
      userId,
      workspaceId,
      shiftDate,
      user: userId,
      workspace: workspaceId,
      date: new Date(`${shiftDate}T00:00:00.000Z`),
      currentState: "offline",
      attendanceStatus: "present",
      approvalStatus: "none",
      sessions: [],
    });
  }

  return { attendance, actionAt, timezone: safeTimezone };
};

const closeActiveSession = (attendance, actionAt) => {
  const activeSession = getActiveSession(attendance);
  if (activeSession) activeSession.endAt = actionAt;
};

const handleFixedCheckIn = async ({ user, timezone = "UTC", at = new Date(), attendanceMode = "fixed" }) => {
  const { attendance, actionAt, timezone: safeTimezone } = await getOrCreateToday({ user, timezone, at });

  if (attendance.currentState === "checked_out") {
    throw invalidTransition("Attendance is already checked out for this shift.", attendance.currentState, attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  if (ACTIVE_STATES.includes(attendance.currentState)) {
    throw invalidTransition("Attendance is already active for this shift.", attendance.currentState, attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  attendance.currentState = "working";
  attendance.attendanceStatus = "present";
  attendance.sessions.push({ type: "work", startAt: actionAt, timezone: safeTimezone });
  return saveAttendance(attendance, attendanceMode);
};

const handleFlexibleCheckIn = async ({ user, timezone = "UTC", at = new Date(), attendanceMode = "flexible" }) => {
  const { attendance, actionAt, timezone: safeTimezone } = await getOrCreateToday({ user, timezone, at });
  const activeSession = getActiveSession(attendance);

  if (activeSession) {
    throw invalidTransition("Attendance session is already running.", attendance.currentState, attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  attendance.currentState = "working";
  attendance.attendanceStatus = "present";
  attendance.sessions.push({ type: "work", startAt: actionAt, timezone: safeTimezone });
  return saveAttendance(attendance, attendanceMode);
};

const checkIn = async ({ user, timezone = "UTC", at = new Date() }) => {
  const policy = await getPolicyForUser(user);
  const attendanceMode = policy.attendanceMode || "fixed";

  if (attendanceMode === "fixed") {
    return handleFixedCheckIn({ user, timezone, at, attendanceMode });
  }

  if (attendanceMode === "flexible") {
    return handleFlexibleCheckIn({ user, timezone, at, attendanceMode });
  }

  throw ApiError.badRequest("Unsupported attendance mode.");
};

const startBreak = async ({ user, timezone = "UTC", at = new Date() }) => {
  const policy = await getPolicyForUser(user);
  const attendanceMode = policy.attendanceMode || "fixed";
  if (attendanceMode === "flexible") {
    throw invalidTransition("Breaks are implicit in flexible attendance mode.", "working", attendanceMode, ["check-out"]);
  }

  const attendance = await findToday({ user, timezone, at });
  if (!attendance || attendance.currentState !== "working") {
    throw invalidTransition("You must be working before starting a break.", attendance?.currentState || "offline", attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  const actionAt = normalizeDateInput(at);
  closeActiveSession(attendance, actionAt);
  attendance.currentState = "break";
  attendance.sessions.push({ type: "break", startAt: actionAt, timezone: validateTimezone(timezone) });
  return saveAttendance(attendance, attendanceMode);
};

const endBreak = async ({ user, timezone = "UTC", at = new Date() }) => {
  const policy = await getPolicyForUser(user);
  const attendanceMode = policy.attendanceMode || "fixed";
  if (attendanceMode === "flexible") {
    throw invalidTransition("Breaks are implicit in flexible attendance mode.", "offline", attendanceMode, ["check-in"]);
  }

  const attendance = await findToday({ user, timezone, at });
  if (!attendance || attendance.currentState !== "break") {
    throw invalidTransition("You must be on break before ending a break.", attendance?.currentState || "offline", attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  const actionAt = normalizeDateInput(at);
  closeActiveSession(attendance, actionAt);
  attendance.currentState = "working";
  attendance.sessions.push({ type: "work", startAt: actionAt, timezone: validateTimezone(timezone) });
  return saveAttendance(attendance, attendanceMode);
};

const handleFixedCheckOut = async ({ user, timezone = "UTC", at = new Date(), attendanceMode = "fixed" }) => {
  const attendance = await findToday({ user, timezone, at });
  if (!attendance) throw invalidTransition("You must check in before checking out.", "offline", attendanceMode, ["check-in"]);
  if (attendance.currentState === "checked_out") return attendance;
  if (!ACTIVE_STATES.includes(attendance.currentState)) {
    throw invalidTransition("You must be working or on break before checking out.", attendance.currentState, attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  closeActiveSession(attendance, normalizeDateInput(at));
  attendance.currentState = "checked_out";
  attendance.attendanceStatus = attendance.sessions.some((session) => session.type === "work") ? "present" : "incomplete";
  return saveAttendance(attendance, attendanceMode);
};

const handleFlexibleCheckOut = async ({ user, timezone = "UTC", at = new Date(), attendanceMode = "flexible" }) => {
  const attendance = await findToday({ user, timezone, at });
  if (!attendance) throw invalidTransition("You must check in before checking out.", "offline", attendanceMode, ["check-in"]);

  const activeSession = getActiveSession(attendance);
  if (!activeSession) {
    throw invalidTransition("No active attendance session found.", attendance.currentState || "offline", attendanceMode, getAllowedActions(attendance, attendanceMode));
  }

  closeActiveSession(attendance, normalizeDateInput(at));
  attendance.currentState = "offline";
  attendance.attendanceStatus = attendance.sessions.some((session) => session.type === "work") ? "present" : "incomplete";
  return saveAttendance(attendance, attendanceMode);
};

const checkOut = async ({ user, timezone = "UTC", at = new Date() }) => {
  const policy = await getPolicyForUser(user);
  const attendanceMode = policy.attendanceMode || "fixed";

  if (attendanceMode === "fixed") {
    return handleFixedCheckOut({ user, timezone, at, attendanceMode });
  }

  if (attendanceMode === "flexible") {
    return handleFlexibleCheckOut({ user, timezone, at, attendanceMode });
  }

  throw ApiError.badRequest("Unsupported attendance mode.");
};

const clockIn = checkIn;
const clockOut = checkOut;

const ensureAttendanceAccess = (attendance, user) => {
  const workspaceId = String(getWorkspaceId(user));
  const attendanceWorkspaceId = String(attendance.workspaceId || attendance.workspace || attendance.userId?.adminRef || "");

  if (user.role === "manager" && String(attendance.userId?.manager || attendance.user?.manager || "") !== String(user._id)) {
    throw ApiError.forbidden("Managers can only manage attendance for their direct team.");
  }

  if (user.role === "admin" && attendanceWorkspaceId !== workspaceId) {
    throw ApiError.forbidden("You can only manage attendance in your workspace.");
  }
};

const manualClose = async ({ id, user, payload = {} }) => {
  const attendance = await repository.findById(id);
  if (!attendance) throw ApiError.notFound("Attendance record not found.");
  ensureAttendanceAccess(attendance, user);
  closeActiveSession(attendance, payload.checkOutAt ? new Date(payload.checkOutAt) : new Date());
  attendance.currentState = "checked_out";
  attendance.attendanceStatus = payload.status === "half-day" ? "half_day" : payload.status || "present";
  attendance.closedBy = user._id;
  attendance.closedReason = payload.closedReason || "Manual close";
  return saveAttendance(attendance);
};

const requestAdjustment = async ({ id, user, payload = {} }) => {
  const attendance = await repository.findById(id);
  if (!attendance) throw ApiError.notFound("Attendance record not found.");
  if (String(attendance.userId?._id || attendance.userId) !== String(user._id)) {
    throw ApiError.forbidden("You can only request adjustments for your own attendance.");
  }

  attendance.approvalStatus = "pending";
  attendance.adjustmentRequest = {
    type: "attendance",
    reason: payload.reason,
    requestedSessions: payload.sessions || attendance.sessions,
    requestedBy: user._id,
    status: "pending",
  };
  return repository.save(attendance);
};

const reviewAdjustment = async ({ id, user, payload = {} }) => {
  const attendance = await repository.findById(id);
  if (!attendance) throw ApiError.notFound("Attendance record not found.");
  ensureAttendanceAccess(attendance, user);
  if (!attendance.adjustmentRequest || attendance.adjustmentRequest.status !== "pending") {
    throw ApiError.badRequest("No pending attendance adjustment request found.");
  }

  attendance.adjustmentRequest.status = payload.status;
  attendance.adjustmentRequest.reviewedBy = user._id;
  attendance.adjustmentRequest.reviewedAt = new Date();
  attendance.adjustmentRequest.reviewNote = payload.reviewNote;
  attendance.approvalStatus = payload.status;

  if (payload.status === "approved") {
    attendance.sessions = attendance.adjustmentRequest.requestedSessions;
    const hasActive = attendance.sessions.some((session) => !session.endAt);
    attendance.currentState = hasActive ? (attendance.sessions[attendance.sessions.length - 1].type === "break" ? "break" : "working") : "checked_out";
  }

  return saveAttendance(attendance);
};

const getMyHistory = (userId) => repository.findUserHistory(userId);

const buildAccessFilter = async ({ user, query = {}, scope = "auto" }) => {
  const workspaceId = getWorkspaceId(user);
  const filter = {};

  if (scope === "self" || (scope === "auto" && user.role !== "admin" && user.role !== "manager")) {
    filter.userId = user._id;
    filter.workspaceId = workspaceId;
    return { filter, accessScope: "self" };
  }

  if (scope === "team" || (scope === "auto" && user.role === "manager")) {
    const teamMembers = await User.find({ adminRef: workspaceId, manager: user._id }).select("_id");
    filter.workspaceId = workspaceId;
    filter.userId = { $in: [user._id, ...teamMembers.map((member) => member._id)] };
    return { filter, accessScope: "team" };
  }

  if (user.role !== "admin") throw ApiError.forbidden("Workspace attendance is only available to admins.");
  filter.workspaceId = workspaceId;

  if (query.userId) filter.userId = query.userId;
  if (query.search) {
    const matchingUsers = await User.find({
      adminRef: workspaceId,
      $or: [
        { name: new RegExp(query.search, "i") },
        { email: new RegExp(query.search, "i") },
        { role: new RegExp(query.search, "i") },
      ],
    }).select("_id");
    filter.userId = { $in: matchingUsers.map((member) => member._id) };
  }

  return { filter, accessScope: "workspace" };
};

const getWeeklyAttendance = async ({ user, query = {}, scope = "auto" }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const { weekStart, weekEnd } = getWeekRange(query.weekStart);
  const { filter, accessScope } = await buildAccessFilter({ user, query, scope });

  if (query.status) filter.attendanceStatus = query.status === "half-day" ? "half_day" : query.status;

  const [{ records, total }, summary] = await Promise.all([
    repository.findWeeklyAttendance({ filter, page, limit, weekStart, weekEnd }),
    repository.summarizeWeeklyAttendance({ filter, weekStart, weekEnd }),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    week: { startDate: weekStart, endDate: weekEnd },
    accessScope,
    summary,
  };
};

const getToday = async ({ user, timezone = "UTC" }) => findToday({ user, timezone });
const getTodayContext = async ({ user, timezone = "UTC" }) => {
  const policy = await getPolicyForUser(user);
  const attendanceMode = policy.attendanceMode || "fixed";
  const attendance = await findToday({ user, timezone });

  return {
    attendance,
    attendanceMode,
    allowedActions: getAllowedActions(attendance, attendanceMode),
  };
};
const getMyWeek = ({ user, query }) => getWeeklyAttendance({ user, query, scope: "self" });
const getTeamWeek = ({ user, query }) => getWeeklyAttendance({ user, query, scope: "team" });
const getWorkspaceWeek = ({ user, query }) => getWeeklyAttendance({ user, query, scope: "workspace" });
const getWorkspaceAttendance = (user) => repository.findWorkspaceAttendance(getWorkspaceId(user));

module.exports = {
  repository,
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  clockIn,
  clockOut,
  manualClose,
  requestAdjustment,
  reviewAdjustment,
  getToday,
  getTodayContext,
  getMyWeek,
  getTeamWeek,
  getWorkspaceWeek,
  getWeeklyAttendance,
  getMyHistory,
  getWorkspaceAttendance,
  getActiveAttendanceForUser: ({ user }) => repository.findActiveByUser(user._id || user.id, getWorkspaceId(user)),
  getPolicyForUser,
  getAllowedActions,
  getWorkspaceId,
  calculateImplicitBreakMinutes,
  computeTotals,
};
