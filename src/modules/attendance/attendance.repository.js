const Attendance = require("./attendance.model");

const POPULATE_USER = "name email role manager profileImage";

const findByUserWorkspaceAndShiftDate = (userId, workspaceId, shiftDate) =>
  Attendance.findOne({ userId, workspaceId, shiftDate });

const findByUserWorkspaceAndDate = (userId, workspaceId, date) =>
  Attendance.findOne({
    $or: [
      { userId, workspaceId, shiftDate: typeof date === "string" ? date : undefined },
      { user: userId, workspace: workspaceId, date },
    ],
  });

const findActiveByUser = (userId, workspaceId) =>
  Attendance.findOne({
    userId,
    workspaceId,
    currentState: { $in: ["working", "break"] },
  }).sort({ updatedAt: -1 });

const findById = (id) => Attendance.findById(id).populate("userId", POPULATE_USER).populate("user", POPULATE_USER);

const create = (data) => new Attendance(data);

const save = (document) => document.save();

const findUserHistory = (userId, limit = 30) =>
  Attendance.find({ userId })
    .populate("userId", POPULATE_USER)
    .sort({ shiftDate: -1 })
    .limit(limit);

const findWorkspaceAttendance = (workspaceId) =>
  Attendance.find({ workspaceId })
    .populate("userId", POPULATE_USER)
    .sort({ shiftDate: -1 });

const findWeeklyAttendance = async ({ filter, page, limit, weekStart, weekEnd }) => {
  const query = {
    ...filter,
    shiftDate: { $gte: weekStart, $lte: weekEnd },
  };
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate("userId", POPULATE_USER)
      .populate("user", POPULATE_USER)
      .populate("closedBy", "name email role")
      .sort({ shiftDate: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(query),
  ]);

  return { records, total };
};

const summarizeWeeklyAttendance = async ({ filter, weekStart, weekEnd }) => {
  const records = await Attendance.find({
    ...filter,
    shiftDate: { $gte: weekStart, $lte: weekEnd },
  }).select("attendanceStatus currentState totalWorkMinutes totalBreakMinutes");

  return {
    present: records.filter((record) => record.attendanceStatus === "present").length,
    incomplete: records.filter((record) => record.attendanceStatus === "incomplete").length,
    absent: records.filter((record) => record.attendanceStatus === "absent").length,
    totalMinutes: records.reduce((sum, record) => sum + (record.totalWorkMinutes || 0), 0),
    totalWorkMinutes: records.reduce((sum, record) => sum + (record.totalWorkMinutes || 0), 0),
    totalBreakMinutes: records.reduce((sum, record) => sum + (record.totalBreakMinutes || 0), 0),
  };
};

module.exports = {
  model: Attendance,
  create,
  save,
  findById,
  findByUserWorkspaceAndDate,
  findByUserWorkspaceAndShiftDate,
  findActiveByUser,
  findUserHistory,
  findWorkspaceAttendance,
  findWeeklyAttendance,
  summarizeWeeklyAttendance,
};
