const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const timeTrackingService = require("./time-tracking.service");
const timeTrackingMapper = require("./time-tracking.mapper");

exports.clockIn = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.clockIn({
    user: req.user,
    io: req.app.get("io"),
    req,
    payload: req.body,
  });

  res
    .status(201)
    .json(ApiResponse.created("Time tracking started", { entry: timeTrackingMapper.toResponse(entry) }));
});

exports.clockOut = asyncHandler(async (req, res) => {
  const entry = await timeTrackingService.clockOut({
    user: req.user,
    io: req.app.get("io"),
    req,
  });

  res.status(200).json(ApiResponse.success("Time tracking stopped", { entry: timeTrackingMapper.toResponse(entry) }));
});

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

