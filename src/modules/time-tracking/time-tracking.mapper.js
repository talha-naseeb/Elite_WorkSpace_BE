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

  return {
    id: entry._id || entry.id,
    _id: entry._id || entry.id,
    user: toUserSummary(entry.user),
    workspace: entry.workspace,
    project: toReferenceSummary(entry.project),
    task: toReferenceSummary(entry.task),
    clockInAt: entry.clockInAt,
    clockOutAt: entry.clockOutAt,
    durationMinutes: entry.durationMinutes || 0,
    durationHours: Number(((entry.durationMinutes || 0) / 60).toFixed(2)),
    source: entry.source,
    notes: entry.notes,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
};

const toListResponse = (documents) => documents.map(toResponse);

module.exports = { toResponse, toListResponse };
