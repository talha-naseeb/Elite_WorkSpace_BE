const toResponse = (document) => {
  if (!document) return document;
  const attendance = typeof document.toObject === "function" ? document.toObject() : document;

  return {
    id: attendance._id || attendance.id,
    _id: attendance._id || attendance.id,
    user: attendance.user,
    workspace: attendance.workspace,
    date: attendance.date,
    checkInAt: attendance.checkInAt,
    checkOutAt: attendance.checkOutAt,
    totalMinutes: attendance.totalMinutes || 0,
    totalHours: Number(((attendance.totalMinutes || 0) / 60).toFixed(2)),
    status: attendance.status,
    closedBy: attendance.closedBy,
    closedReason: attendance.closedReason,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
    // Legacy aliases kept temporarily while older UI/API consumers migrate.
    loginTime: attendance.checkInAt,
    logoutTime: attendance.checkOutAt,
  };
};

const toListResponse = (documents) => documents.map(toResponse);

module.exports = { toResponse, toListResponse };
