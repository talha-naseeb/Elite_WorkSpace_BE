const ApiError = require("../../shared/errors/apiError");
const { ATTENDANCE_STATUS } = require("../../shared/constants/attendance-status");
const repository = require("./attendance.repository");
const { broadcastAdminStats } = require("../../services/stats/stats.service");
const { broadcastActiveUsers } = require("../../sockets/presence");

const getWorkspaceId = (user) => user.adminRef || user._id;

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const broadcastAttendanceChanged = ({ io, req, adminId, type, user }) => {
  if (io) {
    io.to(adminId.toString()).emit("attendance:update", {
      type,
      userId: user._id,
      userName: user.name,
    });
  }

  broadcastActiveUsers(io, adminId.toString());
  broadcastAdminStats(req, adminId).catch((error) => {
    console.error("[Attendance] Failed to broadcast admin stats:", error);
  });
};

const clockIn = async ({ user, io, req }) => {
  const userId = user._id;
  const adminId = getWorkspaceId(user);
  const today = getToday();

  let attendance = await repository.findByUserAndDate(userId, today);
  if (attendance?.loginTime) {
    throw ApiError.badRequest("Already clocked in for today");
  }

  if (!attendance) {
    attendance = repository.create({
      user: userId,
      adminRef: adminId,
      date: today,
      loginTime: new Date(),
      status: ATTENDANCE_STATUS.PRESENT,
    });
  } else {
    attendance.loginTime = new Date();
  }

  await attendance.save();
  broadcastAttendanceChanged({ io, req, adminId, type: "clock-in", user });

  return attendance;
};

const clockOut = async ({ user, io, req }) => {
  const userId = user._id;
  const today = getToday();
  const attendance = await repository.findByUserAndDate(userId, today);

  if (!attendance) {
    throw ApiError.notFound("No attendance record found for today. Please clock-in first.");
  }

  if (attendance.logoutTime) {
    throw ApiError.badRequest("Already clocked out for today");
  }

  attendance.logoutTime = new Date();

  if (attendance.loginTime) {
    const diffMs = attendance.logoutTime - attendance.loginTime;
    attendance.totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  }

  await attendance.save();
  const adminId = getWorkspaceId(user);
  broadcastAttendanceChanged({ io, req, adminId, type: "clock-out", user });

  return attendance;
};

const getMyHistory = (userId) => repository.findUserHistory(userId);

const getWorkspaceAttendance = (user) => {
  const adminId = user.role === "admin" ? user._id : user.adminRef;
  return repository.findWorkspaceAttendance(adminId);
};

module.exports = {
  repository,
  clockIn,
  clockOut,
  getMyHistory,
  getWorkspaceAttendance,
};
