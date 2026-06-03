const toUserSummary = (user) => {
  if (!user) return null;
  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
  };
};

const toReferenceSummary = (document) => {
  if (!document) return null;
  return {
    id: document._id || document.id,
    title: document.title,
    color: document.color,
    status: document.status,
    priority: document.priority,
  };
};

const toResponse = (document) => {
  if (!document) return document;
  const entry = typeof document.toObject === "function" ? document.toObject() : document;
  const user = entry.userId && typeof entry.userId === "object" ? entry.userId : entry.user;
  const project = entry.projectId && typeof entry.projectId === "object" ? entry.projectId : entry.project;
  const task = entry.taskId && typeof entry.taskId === "object" ? entry.taskId : entry.task;
  const startAt = entry.startAt || entry.clockInAt;
  const endAt = entry.endAt || entry.clockOutAt;
  const isActive = entry.isActive ?? entry.status === "active";

  return {
    id: entry._id || entry.id,
    _id: entry._id || entry.id,
    user: toUserSummary(user),
    userId: entry.userId,
    workspace: entry.workspaceId || entry.workspace,
    workspaceId: entry.workspaceId,
    project: toReferenceSummary(project),
    projectId: entry.projectId,
    task: toReferenceSummary(task),
    taskId: entry.taskId,
    startAt,
    endAt,
    timezone: entry.timezone,
    isActive,
    clockInAt: startAt,
    clockOutAt: endAt,
    durationMinutes: entry.durationMinutes || 0,
    durationHours: Number(((entry.durationMinutes || 0) / 60).toFixed(2)),
    source: entry.source,
    notes: entry.notes,
    status: isActive ? "active" : "completed",
    adjustmentRequest: entry.adjustmentRequest,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
};

const toListResponse = (documents) => documents.map(toResponse);

module.exports = { toResponse, toListResponse };
