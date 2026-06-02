const Attendance = require("./attendance.model");

const findByUserAndDate = (userId, date) => Attendance.findOne({ user: userId, date });

const findByUserWorkspaceAndDate = (userId, workspaceId, date) =>
  Attendance.findOne({ user: userId, workspace: workspaceId, date });

const findLegacyByUserAndDate = (userId, date) =>
  Attendance.findOne({
    user: userId,
    date,
    $or: [
      { workspace: { $exists: false } },
      { workspace: null },
    ],
  });

const findById = (id) => Attendance.findById(id).populate("user", "name email role manager profileImage");

const create = (data) => new Attendance(data);

const findUserHistory = (userId, limit = 30) => Attendance.find({ user: userId }).sort({ date: -1 }).limit(limit);

const findWorkspaceAttendance = (adminId) =>
  Attendance.find({ workspace: adminId })
    .populate("user", "name email role manager profileImage")
    .sort({ date: -1 });

const findWeeklyAttendance = async ({ filter, page, limit, weekStart, weekEnd }) => {
  const query = {
    ...filter,
    date: { $gte: weekStart, $lte: weekEnd },
  };
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate("user", "name email role manager profileImage")
      .populate("closedBy", "name email role")
      .sort({ date: -1, checkInAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(query),
  ]);

  return { records, total };
};

const summarizeWeeklyAttendance = async ({ filter, weekStart, weekEnd }) => {
  const records = await Attendance.find({
    ...filter,
    date: { $gte: weekStart, $lte: weekEnd },
  }).select("status totalMinutes");

  return {
    present: records.filter((record) => record.status === "present").length,
    incomplete: records.filter((record) => record.status === "incomplete").length,
    absent: records.filter((record) => record.status === "absent").length,
    totalMinutes: records.reduce((sum, record) => sum + (record.totalMinutes || 0), 0),
  };
};

module.exports = {
  model: Attendance,
  create,
  findById,
  findByUserAndDate,
  findByUserWorkspaceAndDate,
  findLegacyByUserAndDate,
  findUserHistory,
  findWorkspaceAttendance,
  findWeeklyAttendance,
  summarizeWeeklyAttendance,
};
