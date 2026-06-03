const Attendance = require("../attendance/attendance.model");
const TimeEntry = require("../time-tracking/time-entry.model");
const WorkspacePolicy = require("../workspace-policy/workspace-policy.model");

const getWorkspaceId = (user) => user.adminRef || user._id || user.id;

const toDateRange = (query = {}) => {
  const startDate = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : new Date();
  if (!query.startDate) startDate.setUTCDate(startDate.getUTCDate() - 6);
  const endDate = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : new Date();
  const shiftStart = startDate.toISOString().slice(0, 10);
  const shiftEnd = endDate.toISOString().slice(0, 10);
  return { startDate, endDate, shiftStart, shiftEnd };
};

const buildScopeFilter = (user) => {
  const workspaceId = getWorkspaceId(user);
  if (user.role === "admin") return { workspaceId };
  return { workspaceId, userId: user._id || user.id };
};

const sum = (items, selector) => items.reduce((total, item) => total + (selector(item) || 0), 0);
const minutesBetween = (startAt, endAt) => Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));

const calculateImplicitBreakMinutes = (sessions = []) => {
  const completedWorkSessions = sessions
    .filter((session) => session.type === "work" && session.startAt && session.endAt)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return completedWorkSessions.reduce((total, session, index) => {
    if (index === 0) return total;
    return total + minutesBetween(completedWorkSessions[index - 1].endAt, session.startAt);
  }, 0);
};

const getSummary = async ({ user, query = {} }) => {
  const { startDate, endDate, shiftStart, shiftEnd } = toDateRange(query);
  const scopeFilter = buildScopeFilter(user);
  const policy = await WorkspacePolicy.findOne({ workspaceId: getWorkspaceId(user) });

  const [attendanceDays, timeEntries] = await Promise.all([
    Attendance.find({
      ...scopeFilter,
      shiftDate: { $gte: shiftStart, $lte: shiftEnd },
    }),
    TimeEntry.find({
      ...scopeFilter,
      startAt: { $gte: startDate, $lte: endDate },
    }),
  ]);

  const attendanceMinutes = sum(attendanceDays, (day) => day.totalWorkMinutes);
  const taskMinutes = sum(timeEntries, (entry) => entry.durationMinutes);
  const attendanceMode = policy?.attendanceMode || "fixed";
  const breakMinutes = attendanceMode === "flexible"
    ? sum(attendanceDays, (day) => calculateImplicitBreakMinutes(day.sessions || []))
    : sum(attendanceDays, (day) => day.totalBreakMinutes);
  const idleMinutes = Math.max(0, attendanceMinutes - taskMinutes);
  const standardDailyMinutes = (policy?.standardHoursPerDay || 8) * 60;
  const overtimeThresholdMinutes = policy?.overtimeThresholdMinutes || standardDailyMinutes;
  const overtimeMinutes = sum(attendanceDays, (day) => Math.max(0, (day.totalWorkMinutes || 0) - overtimeThresholdMinutes));
  const warnings = taskMinutes > attendanceMinutes
    ? [{ code: "TASK_TIME_EXCEEDS_ATTENDANCE", message: "Tracked task minutes exceed attendance work minutes for this range." }]
    : [];

  return {
    range: { startDate, endDate, shiftStart, shiftEnd },
    attendanceMinutes,
    taskMinutes,
    breakMinutes,
    idleMinutes,
    overtimeMinutes,
    attendanceMode,
    warnings,
    attendanceDays,
    timeEntries,
  };
};

module.exports = {
  getSummary,
};
