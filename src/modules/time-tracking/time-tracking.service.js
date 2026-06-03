const ApiError = require("../../utils/apiError");
const repository = require("./time-tracking.repository");
const { validateTimezone } = require("../../shared/utils/timezone");
const { broadcastAdminStats } = require("../../services/stats/stats.service");
const { broadcastActiveUsers } = require("../../sockets/presence");

const getWorkspaceId = (user) => user.adminRef || user._id || user.id;
const getUserId = (user) => user._id || user.id;

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getStartOfWeek = () => {
  const date = getToday();
  date.setDate(date.getDate() - date.getDay());
  return date;
};

const getStartOfMonth = () => {
  const date = getToday();
  date.setDate(1);
  return date;
};

const minutesBetween = (start, end) => Math.max(0, Math.round((end - start) / (1000 * 60)));

const emitTimeTrackingUpdate = ({ io, req, workspaceId, user, type, entry }) => {
  if (io && workspaceId) {
    io.to(workspaceId.toString()).emit("time-tracking:update", {
      type,
      userId: getUserId(user),
      userName: user.name,
      entryId: entry?._id,
      startAt: entry?.startAt,
      endAt: entry?.endAt,
      durationMinutes: entry?.durationMinutes || 0,
    });
  }

  if (io && workspaceId) broadcastActiveUsers(io, workspaceId.toString());
  if (req && workspaceId) {
    broadcastAdminStats(req, workspaceId).catch((error) => {
      console.error("[TimeTracking] Failed to broadcast admin stats:", error);
    });
  }
};

const syncLegacyAliases = (entry) => {
  entry.userId = entry.userId || entry.user;
  entry.workspaceId = entry.workspaceId || entry.workspace;
  entry.projectId = entry.projectId || entry.project;
  entry.taskId = entry.taskId || entry.task;
  entry.startAt = entry.startAt || entry.clockInAt;
  entry.user = entry.user || entry.userId;
  entry.workspace = entry.workspace || entry.workspaceId;
  entry.project = entry.project || entry.projectId;
  entry.task = entry.task || entry.taskId;
  entry.clockInAt = entry.clockInAt || entry.startAt;
  entry.clockOutAt = entry.endAt;
  entry.status = entry.isActive ? "active" : "completed";
  entry.source = entry.source || "browser";
  return entry;
};

const closeEntry = async ({ entry, endAt = new Date(), notes }) => {
  entry.endAt = endAt;
  entry.clockOutAt = endAt;
  entry.durationMinutes = minutesBetween(entry.startAt || entry.clockInAt, endAt);
  entry.isActive = false;
  entry.status = "completed";
  if (notes) entry.notes = notes;
  syncLegacyAliases(entry);
  return repository.save(entry);
};

const startTimer = async ({ user, taskId, projectId, timezone = "UTC", notes = "", io, req }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const activeEntry = await repository.findActiveByUser(userId);

  if (activeEntry) {
    const activeTaskId = String(activeEntry.taskId?._id || activeEntry.taskId || activeEntry.task?._id || activeEntry.task || "");
    if (taskId && activeTaskId === String(taskId)) {
      throw ApiError.conflict("This task timer is already running.");
    }

    await closeEntry({ entry: activeEntry, endAt: new Date() });
    emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "auto-stop", entry: activeEntry });
  }

  const startAt = new Date();
  const entry = repository.create({
    userId,
    workspaceId,
    projectId: projectId || null,
    taskId: taskId || null,
    startAt,
    timezone: validateTimezone(timezone),
    notes,
    isActive: true,
    user: userId,
    workspace: workspaceId,
    project: projectId || null,
    task: taskId || null,
    clockInAt: startAt,
    source: "browser",
    status: "active",
  });

  await repository.save(entry);
  emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "start", entry });
  return entry;
};

const stopTimer = async ({ user, entryId, notes, io, req, endAt = new Date() }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const activeEntry = await repository.findActiveByUser(userId);
  if (!activeEntry || (entryId && String(activeEntry._id) !== String(entryId))) {
    throw ApiError.notFound("No active time entry found.");
  }

  const entry = await closeEntry({ entry: activeEntry, endAt, notes });
  emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "stop", entry });
  return entry;
};

const clockIn = ({ user, io, req, payload = {} }) =>
  startTimer({
    user,
    io,
    req,
    taskId: payload.taskId,
    projectId: payload.projectId,
    timezone: payload.timezone,
    notes: payload.notes,
  });

const clockOut = ({ user, io, req, payload = {} }) =>
  stopTimer({
    user,
    io,
    req,
    entryId: payload.entryId,
    notes: payload.notes,
  });

const stopActiveTimer = async ({ user, endAt = new Date(), io, req, notes = "Auto-stopped on final checkout" }) => {
  const activeEntry = await repository.findActiveByUser(getUserId(user));
  if (!activeEntry) return null;
  const entry = await closeEntry({ entry: activeEntry, endAt, notes: activeEntry.notes || notes });
  emitTimeTrackingUpdate({ io, req, workspaceId: getWorkspaceId(user), user, type: "auto-stop", entry });
  return entry;
};

const requestAdjustment = async ({ entryId, user, payload = {} }) => {
  const entries = await repository.findRecentByUser(getUserId(user), 500);
  const entry = entries.find((item) => String(item._id) === String(entryId));
  if (!entry) throw ApiError.notFound("Time entry not found.");

  entry.adjustmentRequest = {
    reason: payload.reason,
    requestedStartAt: payload.startAt,
    requestedEndAt: payload.endAt,
    requestedBy: getUserId(user),
    status: "pending",
  };
  return repository.save(entry);
};

const reviewAdjustment = async ({ entryId, user, payload = {} }) => {
  const entries = await repository.findWorkspaceEntries(getWorkspaceId(user), 1000);
  const entry = entries.find((item) => String(item._id) === String(entryId));
  if (!entry) throw ApiError.notFound("Time entry not found.");
  if (!entry.adjustmentRequest || entry.adjustmentRequest.status !== "pending") {
    throw ApiError.badRequest("No pending time adjustment request found.");
  }

  entry.adjustmentRequest.status = payload.status;
  entry.adjustmentRequest.reviewedBy = getUserId(user);
  entry.adjustmentRequest.reviewedAt = new Date();
  entry.adjustmentRequest.reviewNote = payload.reviewNote;

  if (payload.status === "approved") {
    entry.startAt = entry.adjustmentRequest.requestedStartAt || entry.startAt;
    entry.endAt = entry.adjustmentRequest.requestedEndAt || entry.endAt;
    entry.isActive = false;
    entry.durationMinutes = minutesBetween(entry.startAt, entry.endAt);
  }

  syncLegacyAliases(entry);
  return repository.save(entry);
};

const getActiveEntry = (userId) => repository.findActiveByUser(userId);
const getMyHistory = (userId) => repository.findRecentByUser(userId);
const getTaskEntries = (taskId) => repository.findByTask(taskId);

const getWorkspaceEntries = (user) => {
  const workspaceId = user.role === "admin" ? user._id : user.adminRef;
  return repository.findWorkspaceEntries(workspaceId);
};

const getSummary = async (user) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const entries = await repository.findWorkspaceEntriesSince(workspaceId, getStartOfMonth());
  const mine = entries.filter((entry) => String(entry.userId?._id || entry.userId || entry.user?._id || entry.user) === String(userId));
  const today = getToday();
  const week = getStartOfWeek();
  const month = getStartOfMonth();

  const sumSince = (startDate) =>
    mine
      .filter((entry) => (entry.startAt || entry.clockInAt) >= startDate)
      .reduce((total, entry) => total + (entry.durationMinutes || 0), 0);

  return {
    todayMinutes: sumSince(today),
    weekMinutes: sumSince(week),
    monthMinutes: sumSince(month),
    activeEntry: await getActiveEntry(userId),
  };
};

module.exports = {
  repository,
  startTimer,
  stopTimer,
  clockIn,
  clockOut,
  stopActiveTimer,
  requestAdjustment,
  reviewAdjustment,
  getActiveEntry,
  getMyHistory,
  getTaskEntries,
  getWorkspaceEntries,
  getSummary,
};
