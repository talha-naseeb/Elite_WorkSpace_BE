const toResponse = (document, options = {}) => {
  if (!document) return document;
  const rawAttendanceMode = document.attendanceMode || options.attendanceMode;
  const rawAllowedActions = document.allowedActions || options.allowedActions;
  const attendance = typeof document.toObject === "function" ? document.toObject() : document;
  const user = attendance.userId && typeof attendance.userId === "object" ? attendance.userId : attendance.user;
  const workspace = attendance.workspaceId || attendance.workspace;
  const firstSession = attendance.sessions?.[0];
  const completedSessions = attendance.sessions?.filter((session) => session.endAt) || [];
  const lastCompletedSession = completedSessions[completedSessions.length - 1];
  const attendanceStatus = attendance.attendanceStatus || attendance.status || "present";

  return {
    id: attendance._id || attendance.id,
    _id: attendance._id || attendance.id,
    userId: attendance.userId,
    workspaceId: attendance.workspaceId,
    shiftDate: attendance.shiftDate,
    currentState: attendance.currentState,
    attendanceMode: attendance.attendanceMode || rawAttendanceMode,
    allowedActions: attendance.allowedActions || rawAllowedActions,
    attendanceStatus,
    approvalStatus: attendance.approvalStatus,
    sessions: attendance.sessions || [],
    totalWorkMinutes: attendance.totalWorkMinutes || 0,
    totalBreakMinutes: attendance.totalBreakMinutes || 0,
    adjustmentRequest: attendance.adjustmentRequest,
    user,
    workspace,
    date: attendance.date || (attendance.shiftDate ? `${attendance.shiftDate}T00:00:00.000Z` : undefined),
    checkInAt: attendance.checkInAt || firstSession?.startAt,
    checkOutAt: lastCompletedSession?.endAt || attendance.checkOutAt,
    totalMinutes: attendance.totalWorkMinutes || attendance.totalMinutes || 0,
    totalHours: Number(((attendance.totalWorkMinutes || attendance.totalMinutes || 0) / 60).toFixed(2)),
    status: attendanceStatus === "half_day" ? "half-day" : attendanceStatus,
    closedBy: attendance.closedBy,
    closedReason: attendance.closedReason,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
    // Legacy aliases kept temporarily while older UI/API consumers migrate.
    loginTime: attendance.checkInAt || firstSession?.startAt,
    logoutTime: lastCompletedSession?.endAt || attendance.checkOutAt,
  };
};

const toListResponse = (documents, options = {}) => documents.map((document) => toResponse(document, options));

module.exports = { toResponse, toListResponse };
