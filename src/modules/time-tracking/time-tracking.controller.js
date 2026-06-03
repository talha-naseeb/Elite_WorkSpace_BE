const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const timeTrackingService = require("./time-tracking.service");
const timeTrackingMapper = require("./time-tracking.mapper");
const timeWorkflowService = require("../../services/workflows/time-workflow.service");

exports.startTimer = asyncHandler(async (req, res) => {
  const result = await timeWorkflowService.startTaskTimerWorkflow({
    user: req.user,
    io: req.app.get("io"),
    req,
    payload: req.body,
  });

  res
    .status(201)
    .json(ApiResponse.created("Time tracking started", { entry: timeTrackingMapper.toResponse(result.entry) }));
});

exports.stopTimer = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.stopTimer({
    user: req.user,
    io: req.app.get("io"),
    req,
    entryId: req.body.entryId,
    notes: req.body.notes,
  });

  res.status(200).json(ApiResponse.success("Time tracking stopped", { entry: timeTrackingMapper.toResponse(entry) }));
});

exports.clockIn = exports.startTimer;
exports.clockOut = exports.stopTimer;

exports.getActiveEntry = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.getActiveEntry(req.user._id);
  res.status(200).json(ApiResponse.success("Active time entry retrieved", { entry: timeTrackingMapper.toResponse(entry) }));
});

exports.getMyHistory = asyncHandler(async (req, res) => {
  const entries = await timeTrackingService.getMyHistory(req.user._id);
  res.status(200).json(ApiResponse.success("Time tracking history retrieved", { entries: timeTrackingMapper.toListResponse(entries) }));
});

exports.getWorkspaceEntries = asyncHandler(async (req, res) => {
  const entries = await timeTrackingService.getWorkspaceEntries(req.user);
  res.status(200).json(ApiResponse.success("Workspace time entries retrieved", { entries: timeTrackingMapper.toListResponse(entries) }));
});

exports.getTaskEntries = asyncHandler(async (req, res) => {
  const entries = await timeTrackingService.getTaskEntries(req.params.taskId);
  res.status(200).json(ApiResponse.success("Task time entries retrieved", { entries: timeTrackingMapper.toListResponse(entries) }));
});

exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await timeTrackingService.getSummary(req.user);
  res.status(200).json(
    ApiResponse.success("Time tracking summary retrieved", {
      summary: {
        ...summary,
        activeEntry: timeTrackingMapper.toResponse(summary.activeEntry),
      },
    })
  );
});

exports.requestAdjustment = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.requestAdjustment({
    entryId: req.params.entryId,
    user: req.user,
    payload: req.body,
  });

  res.status(200).json(ApiResponse.success("Time adjustment requested", { entry: timeTrackingMapper.toResponse(entry) }));
});

exports.reviewAdjustment = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.reviewAdjustment({
    entryId: req.params.entryId,
    user: req.user,
    payload: req.body,
  });

  res.status(200).json(ApiResponse.success("Time adjustment reviewed", { entry: timeTrackingMapper.toResponse(entry) }));
});

