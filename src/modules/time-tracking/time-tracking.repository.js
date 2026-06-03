const TimeEntry = require("./time-entry.model");

const create = (data) => new TimeEntry(data);

const save = (entry) => entry.save();

const findActiveByUser = (userId) =>
  TimeEntry.findOne({
    $or: [
      { userId, isActive: true },
      { user: userId, status: "active" },
    ],
  })
    .populate("projectId", "title color")
    .populate("taskId", "title status priority")
    .populate("project", "title color")
    .populate("task", "title status priority");

const findRecentByUser = (userId, limit = 30) =>
  TimeEntry.find({ $or: [{ userId }, { user: userId }] })
    .populate("projectId", "title color")
    .populate("taskId", "title status priority")
    .populate("project", "title color")
    .populate("task", "title status priority")
    .sort({ startAt: -1, clockInAt: -1 })
    .limit(limit);

const findWorkspaceEntries = (workspaceId, limit = 200) =>
  TimeEntry.find({ $or: [{ workspaceId }, { workspace: workspaceId }] })
    .populate("userId", "name email role profileImage")
    .populate("user", "name email role profileImage")
    .populate("projectId", "title color")
    .populate("taskId", "title status priority")
    .populate("project", "title color")
    .populate("task", "title status priority")
    .sort({ startAt: -1, clockInAt: -1 })
    .limit(limit);

const findWorkspaceEntriesSince = (workspaceId, startDate) =>
  TimeEntry.find({
    $or: [
      { workspaceId, startAt: { $gte: startDate } },
      { workspace: workspaceId, clockInAt: { $gte: startDate } },
    ],
  })
    .populate("userId", "name email role profileImage")
    .populate("user", "name email role profileImage")
    .sort({ startAt: -1, clockInAt: -1 });

const findByTask = (taskId) =>
  TimeEntry.find({ $or: [{ taskId }, { task: taskId }] })
    .populate("userId", "name email role profileImage")
    .populate("taskId", "title status priority")
    .populate("task", "title status priority")
    .sort({ startAt: -1, clockInAt: -1 });

module.exports = {
  model: TimeEntry,
  create,
  save,
  findActiveByUser,
  findRecentByUser,
  findWorkspaceEntries,
  findWorkspaceEntriesSince,
  findByTask,
};
