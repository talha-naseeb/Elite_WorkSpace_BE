const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const attendanceService = require("./attendance.service");
const attendanceMapper = require("./attendance.mapper");

exports.clockIn = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.clockIn({
    user: req.user,
    io: req.app.get("io"),
    req,
  });

  res.status(200).json(ApiResponse.success("Clock-in successful", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.clockOut = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.clockOut({
    user: req.user,
    io: req.app.get("io"),
    req,
  });

  res.status(200).json(ApiResponse.success("Clock-out successful", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.getMyHistory = asyncHandler(async (req, res) => {
  const history = await attendanceService.getMyHistory(req.user._id);
  res.status(200).json(ApiResponse.success("Attendance history retrieved", { history: attendanceMapper.toListResponse(history) }));
});

exports.getWorkspaceAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.getWorkspaceAttendance(req.user);
  res.status(200).json(ApiResponse.success("Workspace attendance retrieved", { attendance: attendanceMapper.toListResponse(attendance) }));
});
