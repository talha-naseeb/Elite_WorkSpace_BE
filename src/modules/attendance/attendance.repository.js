const Attendance = require("./attendance.model");

const findByUserAndDate = (userId, date) => Attendance.findOne({ user: userId, date });

const create = (data) => new Attendance(data);

const findUserHistory = (userId, limit = 30) => Attendance.find({ user: userId }).sort({ date: -1 }).limit(limit);

const findWorkspaceAttendance = (adminId) =>
  Attendance.find({ adminRef: adminId })
    .populate("user", "name email role")
    .sort({ date: -1 });

module.exports = {
  model: Attendance,
  create,
  findByUserAndDate,
  findUserHistory,
  findWorkspaceAttendance,
};
