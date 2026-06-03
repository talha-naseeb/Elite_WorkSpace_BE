const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const attendanceService = require("./attendance.service");
const attendanceMapper = require("./attendance.mapper");
const timeWorkflowService = require("../../services/workflows/time-workflow.service");

exports.checkIn = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.checkIn({
    user: req.user,
    timezone: req.body.timezone,
  });

  res.status(200).json(ApiResponse.success("Attendance check-in successful", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.checkOut = asyncHandler(async (req, res) => {
  const result = await timeWorkflowService.checkOutAttendanceWorkflow({
    user: req.user,
    timezone: req.body.timezone,
    io: req.app.get("io"),
    req,
  });

  res.status(200).json(ApiResponse.success("Attendance check-out successful", {
    attendance: attendanceMapper.toResponse(result.attendance),
    stoppedEntry: result.stoppedEntry,
  }));
});

exports.clockIn = exports.checkIn;

exports.clockOut = exports.checkOut;

exports.startBreak = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.startBreak({
    user: req.user,
    timezone: req.body.timezone,
  });

  res.status(200).json(ApiResponse.success("Attendance break started", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.endBreak = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.endBreak({
    user: req.user,
    timezone: req.body.timezone,
  });

  res.status(200).json(ApiResponse.success("Attendance break ended", { attendance: attendanceMapper.toResponse(attendance) }));
});

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

exports.getToday = asyncHandler(async (req, res) => {
  const result = await attendanceService.getTodayContext({
    user: req.user,
    timezone: req.query.timezone || req.body?.timezone,
  });

  res.status(200).json(ApiResponse.success("Today attendance retrieved", {
    attendance: attendanceMapper.toResponse(result.attendance, {
      attendanceMode: result.attendanceMode,
      allowedActions: result.allowedActions,
    }),
    attendanceMode: result.attendanceMode,
    allowedActions: result.allowedActions,
  }));
});

const sendWeekResponse = (message) =>
  asyncHandler(async (req, res) => {
    const result = await attendanceService[message.service]({
      user: req.user,
      query: req.query,
    });

    res.status(200).json(ApiResponse.success(message.text, {
      records: attendanceMapper.toListResponse(result.records),
      pagination: result.pagination,
      week: result.week,
      accessScope: result.accessScope,
      summary: result.summary,
    }));
  });

exports.getMyWeek = sendWeekResponse({ service: "getMyWeek", text: "My weekly attendance retrieved" });
exports.getTeamWeek = sendWeekResponse({ service: "getTeamWeek", text: "Team weekly attendance retrieved" });
exports.getWorkspaceWeek = sendWeekResponse({ service: "getWorkspaceWeek", text: "Workspace weekly attendance retrieved" });

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

exports.requestAdjustment = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.requestAdjustment({
    id: req.params.id,
    user: req.user,
    payload: req.body,
  });

  res.status(200).json(ApiResponse.success("Attendance adjustment requested", { attendance: attendanceMapper.toResponse(attendance) }));
});

exports.reviewAdjustment = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.reviewAdjustment({
    id: req.params.id,
    user: req.user,
    payload: req.body,
  });

  res.status(200).json(ApiResponse.success("Attendance adjustment reviewed", { attendance: attendanceMapper.toResponse(attendance) }));
});
