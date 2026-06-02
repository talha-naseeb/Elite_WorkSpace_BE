const ApiError = require("../../shared/errors/apiError");
const repository = require("./time-tracking.repository");
const { broadcastAdminStats } = require("../../services/stats/stats.service");
const { broadcastActiveUsers } = require("../../sockets/presence");

const getWorkspaceId = (user) => user.adminRef || user._id;

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

const getUserId = (user) => user._id || user.id;

const emitTimeTrackingUpdate = ({ io, req, workspaceId, user, type, entry }) => {
  if (io && workspaceId) {
    io.to(workspaceId.toString()).emit("time-tracking:update", {
      type,
      userId: getUserId(user),
      userName: user.name,
      entryId: entry?._id,
      clockInAt: entry?.clockInAt,
      clockOutAt: entry?.clockOutAt,
      durationMinutes: entry?.durationMinutes || 0,
    });
  }

  broadcastActiveUsers(io, workspaceId.toString());
  if (req) {
    broadcastAdminStats(req, workspaceId).catch((error) => {
      console.error("[TimeTracking] Failed to broadcast admin stats:", error);
    });
  }
};

const clockIn = async ({ user, io, req, payload = {} }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const existingActiveEntry = await repository.findActiveByUser(userId);

  if (existingActiveEntry) {
    throw ApiError.badRequest("Already tracking time. Clock out before starting a new session.", [
      {
        code: "ACTIVE_TIME_ENTRY_EXISTS",
        activeEntryId: existingActiveEntry._id,
        guidance: "Call POST /time-tracking/clock-out before starting another session.",
      },
    ]);
  }

  const clockInAt = new Date();
  const entry = repository.create({
    user: userId,
    workspace: workspaceId,
    project: payload.projectId || null,
    task: payload.taskId || null,
    clockInAt,
    source: payload.source || "browser",
    notes: payload.notes || "",
    status: "active",
  });

  await entry.save();
  emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "clock-in", entry });

  return entry;
};

const clockOut = async ({ user, io, req }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const activeEntry = await repository.findActiveByUser(userId);

  if (!activeEntry) {
    throw ApiError.notFound("No active time entry found. Clock in before clocking out.");
  }

  const clockOutAt = new Date();
  activeEntry.clockOutAt = clockOutAt;
  activeEntry.durationMinutes = minutesBetween(activeEntry.clockInAt, clockOutAt);
  activeEntry.status = "completed";

  await activeEntry.save();
  emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "clock-out", entry: activeEntry });

  return activeEntry;
};

const stopActiveEntryForAttendanceCheckout = async ({ user, clockOutAt = new Date(), io, req }) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const activeEntry = await repository.findActiveByUser(userId);

  if (!activeEntry) return null;

  activeEntry.clockOutAt = clockOutAt;
  activeEntry.durationMinutes = minutesBetween(activeEntry.clockInAt, clockOutAt);
  activeEntry.status = "completed";
  activeEntry.notes = activeEntry.notes || "Auto-stopped on attendance check-out";
  await activeEntry.save();
  emitTimeTrackingUpdate({ io, req, workspaceId, user, type: "auto-stop", entry: activeEntry });

  return activeEntry;
};

const getActiveEntry = (userId) => repository.findActiveByUser(userId);

const getMyHistory = (userId) => repository.findRecentByUser(userId);

const getWorkspaceEntries = (user) => {
  const workspaceId = user.role === "admin" ? user._id : user.adminRef;
  return repository.findWorkspaceEntries(workspaceId);
};

const getSummary = async (user) => {
  const userId = getUserId(user);
  const workspaceId = getWorkspaceId(user);
  const entries = await repository.findWorkspaceEntriesSince(workspaceId, getStartOfMonth());
  const mine = entries.filter((entry) => String(entry.user?._id || entry.user) === String(userId));
  const today = getToday();
  const week = getStartOfWeek();
  const month = getStartOfMonth();

  const sumSince = (startDate) =>
    mine
      .filter((entry) => entry.clockInAt >= startDate)
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
  clockIn,
  clockOut,
  stopActiveEntryForAttendanceCheckout,
  getActiveEntry,
  getMyHistory,
  getWorkspaceEntries,
  getSummary,
};
