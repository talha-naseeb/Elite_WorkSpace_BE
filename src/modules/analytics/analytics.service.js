const Activity = require("../../models/activity.model");
const Task = require("../../models/task.model");
const User = require("../../models/user.model");
const TimeEntry = require("../time-tracking/time-entry.model");

const clampDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 7;
  return Math.min(Math.max(parsed, 1), 90);
};

const getWorkspaceId = (user) => (user.role === "admin" ? user._id : user.adminRef);

const getUserId = (value) => String(value?._id || value?.id || value || "");

const createEmptyUserStats = (user) => ({
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
  },
  totalTasksCount: 0,
  completedTasksCount: 0,
  trackedMinutes: 0,
  trackedHours: 0,
  recentActivityCount: 0,
  lastActivityAt: null,
  efficiencyPercent: 0,
});

const getScopedUsers = async (user, workspaceId) => {
  if (user.role === "manager") {
    const directReports = await User.find({ adminRef: workspaceId, manager: user._id })
      .select("name email role profileImage")
      .sort({ name: 1 });

    return [user, ...directReports];
  }

  return User.find({ adminRef: workspaceId })
    .select("name email role profileImage")
    .sort({ name: 1 });
};

const calculateEfficiencyPercent = ({ completedTasksCount, totalTasksCount, trackedMinutes }) => {
  if (!totalTasksCount && !trackedMinutes) return 0;

  const taskCompletionScore = totalTasksCount ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const trackingScore = trackedMinutes > 0 ? 100 : 0;

  if (!totalTasksCount) return Math.round(trackingScore);
  if (!trackedMinutes) return Math.round(taskCompletionScore);

  return Math.round(taskCompletionScore * 0.75 + trackingScore * 0.25);
};

const getTeamEfficiency = async ({ user, query = {} }) => {
  const workspaceId = getWorkspaceId(user);
  const days = clampDays(query.days);
  const endAt = new Date();
  const startAt = new Date(endAt);
  startAt.setDate(endAt.getDate() - days + 1);
  startAt.setHours(0, 0, 0, 0);

  const scopedUsers = await getScopedUsers(user, workspaceId);
  const userIds = scopedUsers.map(getUserId).filter(Boolean);
  const userStats = new Map(scopedUsers.map((scopedUser) => [getUserId(scopedUser), createEmptyUserStats(scopedUser)]));
  const taskDateFilter = {
    $or: [
      { createdAt: { $gte: startAt } },
      { completedAt: { $gte: startAt } },
    ],
  };

  const [tasks, timeEntries, activities] = await Promise.all([
    Task.find({
      $and: [
        { adminRef: workspaceId, assignee: { $in: userIds } },
        taskDateFilter,
      ],
    }).select("assignee status completedAt createdAt"),
    TimeEntry.find({
      $or: [
        { workspaceId, userId: { $in: userIds }, startAt: { $gte: startAt } },
        { workspace: workspaceId, user: { $in: userIds }, clockInAt: { $gte: startAt } },
      ],
    }).select("userId user durationMinutes startAt clockInAt"),
    Activity.find({ adminRef: workspaceId, user: { $in: userIds }, createdAt: { $gte: startAt } })
      .select("user createdAt")
      .sort({ createdAt: -1 }),
  ]);

  for (const task of tasks) {
    const assigneeId = getUserId(task.assignee);
    const stats = userStats.get(assigneeId);
    if (!stats) continue;

    stats.totalTasksCount += 1;
    if (task.status === "completed") {
      stats.completedTasksCount += 1;
    }
  }

  for (const entry of timeEntries) {
    const entryUserId = getUserId(entry.userId || entry.user);
    const stats = userStats.get(entryUserId);
    if (!stats) continue;

    stats.trackedMinutes += entry.durationMinutes || 0;
  }

  for (const activity of activities) {
    const activityUserId = getUserId(activity.user);
    const stats = userStats.get(activityUserId);
    if (!stats) continue;

    stats.recentActivityCount += 1;
    if (!stats.lastActivityAt) {
      stats.lastActivityAt = activity.createdAt;
    }
  }

  const users = Array.from(userStats.values()).map((stats) => {
    const trackedHours = Number((stats.trackedMinutes / 60).toFixed(2));
    return {
      ...stats,
      trackedHours,
      efficiencyPercent: calculateEfficiencyPercent(stats),
    };
  });

  const completedTasksCount = users.reduce((total, stats) => total + stats.completedTasksCount, 0);
  const totalTasksCount = users.reduce((total, stats) => total + stats.totalTasksCount, 0);
  const trackedMinutes = users.reduce((total, stats) => total + stats.trackedMinutes, 0);
  const activeUsersCount = users.filter((stats) => stats.trackedMinutes > 0 || stats.recentActivityCount > 0).length;

  const summary = {
    totalUsersCount: users.length,
    activeUsersCount,
    totalTasksCount,
    completedTasksCount,
    trackedMinutes,
    trackedHours: Number((trackedMinutes / 60).toFixed(2)),
    efficiencyPercent: calculateEfficiencyPercent({ completedTasksCount, totalTasksCount, trackedMinutes }),
  };

  return {
    scope: user.role === "manager" ? "team" : "workspace",
    range: {
      days,
      startAt,
      endAt,
    },
    summary,
    users,
  };
};

module.exports = {
  getTeamEfficiency,
};
