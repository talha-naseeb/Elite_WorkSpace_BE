const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const attendanceService = require("./attendance.service");
const attendanceMapper = require("./attendance.mapper");

exports.checkIn = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.checkIn({
    user: req.user,
  });

  res.status(200).json(ApiResponse.success("Attendance check-in successful", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.checkOut = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.checkOut({
    user: req.user,
    io: req.app.get("io"),
    req,
  });

  res.status(200).json(ApiResponse.success("Attendance check-out successful", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.clockIn = exports.checkIn;

exports.clockOut = exports.checkOut;

exports.manualClose = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.manualClose({
    id: req.params.id,
    user: req.user,
    payload: req.body,
  });

  res.status(200).json(ApiResponse.success("Attendance manually closed", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.getMyHistory = asyncHandler(async (req, res) => {
  const history = await attendanceService.getMyHistory(req.user._id);
  res.status(200).json(ApiResponse.success("Attendance history retrieved", { history: attendanceMapper.toListResponse(history) }));
});

exports.getWeeklyAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.getWeeklyAttendance({
    user: req.user,
    query: req.query,
  });

  res.status(200).json(ApiResponse.success("Weekly attendance retrieved", {
    records: attendanceMapper.toListResponse(result.records),
    pagination: result.pagination,
    week: result.week,
    accessScope: result.accessScope,
    summary: result.summary,
  }));
});

exports.getWorkspaceAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.getWorkspaceAttendance(req.user);
  res.status(200).json(ApiResponse.success("Workspace attendance retrieved", { attendance: attendanceMapper.toListResponse(attendance) }));
});
