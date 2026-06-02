const TimeEntry = require("./time-entry.model");

const create = (data) => new TimeEntry(data);

const findActiveByUser = (userId) =>
  TimeEntry.findOne({ user: userId, status: "active" })
    .populate("project", "title color")
    .populate("task", "title status priority");

const findRecentByUser = (userId, limit = 30) =>
  TimeEntry.find({ user: userId })
    .populate("project", "title color")
    .populate("task", "title status priority")
    .sort({ clockInAt: -1 })
    .limit(limit);

const findWorkspaceEntries = (workspaceId, limit = 200) =>
  TimeEntry.find({ workspace: workspaceId })
    .populate("user", "name email role profileImage")
    .populate("project", "title color")
    .populate("task", "title status priority")
    .sort({ clockInAt: -1 })
    .limit(limit);

const findWorkspaceEntriesSince = (workspaceId, startDate) =>
  TimeEntry.find({ workspace: workspaceId, clockInAt: { $gte: startDate } })
    .populate("user", "name email role profileImage")
    .sort({ clockInAt: -1 });

module.exports = {
  model: TimeEntry,
  create,
  findActiveByUser,
  findRecentByUser,
  findWorkspaceEntries,
  findWorkspaceEntriesSince,
};
