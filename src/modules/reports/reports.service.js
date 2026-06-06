const Attendance = require("../attendance/attendance.model");
const TimeEntry = require("../time-tracking/time-entry.model");
const WorkspacePolicy = require("../workspace-policy/workspace-policy.model");
const Task = require("../../models/task.model");
const User = require("../../models/user.model");

const getWorkspaceId = (user) => user.adminRef || user._id || user.id;
const getUserId = (value) => String(value?._id || value?.id || value || "");

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

const buildScopedUserIds = async ({ user, query = {} }) => {
  const workspaceId = getWorkspaceId(user);
  let scopedUsers = [];

  if (user.role === "admin") {
    const team = await User.find({ adminRef: workspaceId }).select("name email role profileImage").sort({ name: 1 });
    scopedUsers = [user, ...team];
  } else if (user.role === "manager") {
    const directReports = await User.find({ adminRef: workspaceId, manager: user._id }).select("name email role profileImage").sort({ name: 1 });
    scopedUsers = [user, ...directReports];
  } else {
    scopedUsers = [user];
  }

  const scopedUserIds = scopedUsers.map(getUserId).filter(Boolean);
  if (query.userId && scopedUserIds.includes(String(query.userId))) {
    return {
      scopedUsers: scopedUsers.filter((scopedUser) => getUserId(scopedUser) === String(query.userId)),
      scopedUserIds: [String(query.userId)],
    };
  }

  if (query.userId) {
    return { scopedUsers: [], scopedUserIds: [] };
  }

  return { scopedUsers, scopedUserIds };
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

const eachDateKey = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getEntryDateKey = (entry) => {
  const value = entry.startAt || entry.clockInAt || entry.createdAt;
  return value ? new Date(value).toISOString().slice(0, 10) : "";
};

const buildUserLookup = (users) => users.reduce((lookup, user) => {
  lookup[getUserId(user)] = user;
  return lookup;
}, {});

const buildProjectLookup = async (timeEntries) => {
  const projectIds = Array.from(new Set(timeEntries.map((entry) => getUserId(entry.projectId || entry.project)).filter(Boolean)));
  if (projectIds.length === 0) return {};

  const projects = await require("../../models/project.model").find({ _id: { $in: projectIds } }).select("title color");
  return projects.reduce((lookup, project) => {
    lookup[getUserId(project)] = project;
    return lookup;
  }, {});
};

const getSummary = async ({ user, query = {} }) => {
  const { startDate, endDate, shiftStart, shiftEnd } = toDateRange(query);
  const workspaceId = getWorkspaceId(user);
  const { scopedUsers, scopedUserIds } = await buildScopedUserIds({ user, query });
  const projectFilter = query.projectId ? { projectId: query.projectId } : {};
  const legacyProjectFilter = query.projectId ? { project: query.projectId } : {};
  const taskProjectFilter = query.projectId ? { projectRef: query.projectId } : {};
  const policy = await WorkspacePolicy.findOne({ workspaceId });

  const [attendanceDays, timeEntries, tasks] = await Promise.all([
    Attendance.find({
      workspaceId,
      userId: { $in: scopedUserIds },
      shiftDate: { $gte: shiftStart, $lte: shiftEnd },
    }),
    TimeEntry.find({
      $or: [
        { workspaceId, userId: { $in: scopedUserIds }, startAt: { $gte: startDate, $lte: endDate }, ...projectFilter },
        { workspace: workspaceId, user: { $in: scopedUserIds }, clockInAt: { $gte: startDate, $lte: endDate }, ...legacyProjectFilter },
      ],
    }),
    Task.find({
      adminRef: workspaceId,
      assignee: { $in: scopedUserIds },
      ...taskProjectFilter,
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { completedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).select("assignee status completedAt createdAt projectRef"),
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
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled" && task.status !== "rejected").length;
  const warnings = taskMinutes > attendanceMinutes
    ? [{ code: "TASK_TIME_EXCEEDS_ATTENDANCE", message: "Tracked task minutes exceed attendance work minutes for this range." }]
    : [];
  const dateKeys = eachDateKey(startDate, endDate);
  const projectLookup = await buildProjectLookup(timeEntries);
  const dailyTrend = dateKeys.map((date) => ({
    date,
    attendanceMinutes: sum(attendanceDays.filter((day) => day.shiftDate === date), (day) => day.totalWorkMinutes),
    trackedMinutes: sum(timeEntries.filter((entry) => getEntryDateKey(entry) === date), (entry) => entry.durationMinutes),
    breakMinutes: sum(attendanceDays.filter((day) => day.shiftDate === date), (day) => day.totalBreakMinutes),
    completedTasks: tasks.filter((task) => task.status === "completed" && task.completedAt && new Date(task.completedAt).toISOString().slice(0, 10) === date).length,
  }));
  const teamComparison = scopedUsers.map((scopedUser) => {
    const userId = getUserId(scopedUser);
    const userTasks = tasks.filter((task) => getUserId(task.assignee) === userId);
    return {
      userId,
      name: scopedUser.name || "User",
      trackedMinutes: sum(timeEntries.filter((entry) => getUserId(entry.userId || entry.user) === userId), (entry) => entry.durationMinutes),
      attendanceMinutes: sum(attendanceDays.filter((day) => getUserId(day.userId || day.user) === userId), (day) => day.totalWorkMinutes),
      completedTasks: userTasks.filter((task) => task.status === "completed").length,
      pendingTasks: userTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled" && task.status !== "rejected").length,
    };
  });
  const taskCompletion = [
    { status: "completed", count: completedTasks },
    { status: "pending", count: pendingTasks },
    { status: "cancelled", count: tasks.filter((task) => task.status === "cancelled" || task.status === "rejected").length },
  ];
  const timeByProjectMap = timeEntries.reduce((map, entry) => {
    const projectId = getUserId(entry.projectId || entry.project) || "unassigned";
    const current = map.get(projectId) || {
      projectId,
      projectTitle: projectLookup[projectId]?.title || (projectId === "unassigned" ? "Unassigned" : "Unknown project"),
      trackedMinutes: 0,
    };
    current.trackedMinutes += entry.durationMinutes || 0;
    map.set(projectId, current);
    return map;
  }, new Map());
  const timeByProject = Array.from(timeByProjectMap.values()).sort((a, b) => b.trackedMinutes - a.trackedMinutes);

  return {
    scope: user.role === "admin" ? "workspace" : user.role === "manager" ? "team" : "self",
    range: { startDate, endDate, shiftStart, shiftEnd },
    filters: {
      userId: query.userId || null,
      projectId: query.projectId || null,
      availableUsers: scopedUsers.map((scopedUser) => ({
        _id: getUserId(scopedUser),
        name: scopedUser.name,
        email: scopedUser.email,
        role: scopedUser.role,
      })),
    },
    attendanceMinutes,
    taskMinutes,
    breakMinutes,
    idleMinutes,
    overtimeMinutes,
    completedTasks,
    pendingTasks,
    attendanceMode,
    warnings,
    cards: {
      trackedMinutes: taskMinutes,
      attendanceMinutes,
      breakMinutes,
      idleMinutes,
      overtimeMinutes,
      completedTasks,
      pendingTasks,
    },
    charts: {
      dailyTrend: dailyTrend,
      teamComparison: teamComparison,
      taskCompletion: taskCompletion,
      timeByProject: timeByProject,
    },
    attendanceDays,
    timeEntries,
  };
};

module.exports = {
  getSummary,
};
