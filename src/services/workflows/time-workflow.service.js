const ApiError = require("../../utils/apiError");
const attendanceService = require("../../modules/attendance/attendance.service");
const timeTrackingService = require("../../modules/time-tracking/time-tracking.service");

const emitWorkflowUpdate = ({ io, workspaceId, event, payload }) => {
  if (io && workspaceId) {
    io.to(workspaceId.toString()).emit(event, payload);
  }
};

const startTaskTimerWorkflow = async ({ user, payload = {}, io, req }) => {
  const attendance = await attendanceService.getToday({
    user,
    timezone: payload.timezone,
  });

  if (!attendance || attendance.currentState !== "working") {
    throw ApiError.badRequest("Task timer can only start while attendance is in working state.", [], {
      errorCode: "TIMER_REQUIRES_WORKING_ATTENDANCE",
      currentState: attendance?.currentState || "offline",
    });
  }

  const entry = await timeTrackingService.startTimer({
    user,
    taskId: payload.taskId,
    projectId: payload.projectId,
    timezone: payload.timezone,
    notes: payload.notes,
    io,
    req,
  });

  emitWorkflowUpdate({
    io,
    workspaceId: attendance.workspaceId,
    event: "workflow:task-timer-started",
    payload: { userId: user._id || user.id, entryId: entry._id },
  });

  return { attendance, entry };
};

const checkOutAttendanceWorkflow = async ({ user, timezone = "UTC", io, req }) => {
  const attendance = await attendanceService.checkOut({ user, timezone });
  const stoppedEntry = await timeTrackingService.stopActiveTimer({
    user,
    endAt: new Date(),
    io,
    req,
  });

  emitWorkflowUpdate({
    io,
    workspaceId: attendance.workspaceId,
    event: "workflow:attendance-checked-out",
    payload: { userId: user._id || user.id, attendanceId: attendance._id, stoppedEntryId: stoppedEntry?._id },
  });

  return { attendance, stoppedEntry };
};

module.exports = {
  attendanceService,
  timeTrackingService,
  startTaskTimerWorkflow,
  checkOutAttendanceWorkflow,
};
