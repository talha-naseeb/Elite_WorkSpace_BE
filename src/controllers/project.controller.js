const Project = require("../models/project.model");
const Task = require("../models/task.model");
const Activity = require("../models/activity.model");
const TimeEntry = require("../modules/time-tracking/time-entry.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/helpers/asyncHandler");
const { logActivity } = require("../utils/activityLogger");

/** Resolve the workspace adminRef from the requesting user */
const getAdminId = (user) =>
  user.role === "admin" ? user._id : user.adminRef;

const toIdString = (value) => String(value?._id || value?.id || value || "");

const buildProjectTimeSummary = async ({ adminId, projectId, taskIds }) => {
  const entries = await TimeEntry.find({
    $or: [
      { workspaceId: adminId, projectId },
      { workspace: adminId, project: projectId },
      { workspaceId: adminId, taskId: { $in: taskIds } },
      { workspace: adminId, task: { $in: taskIds } },
    ],
  }).select("durationMinutes taskId task projectId project");

  const trackedMinutesByTask = {};
  let totalTrackedMinutes = 0;
  let entryCount = 0;

  entries.forEach((entry) => {
    const durationMinutes = entry.durationMinutes || 0;
    const taskId = toIdString(entry.taskId || entry.task);

    totalTrackedMinutes += durationMinutes;
    entryCount += 1;

    if (taskId) {
      trackedMinutesByTask[taskId] = (trackedMinutesByTask[taskId] || 0) + durationMinutes;
    }
  });

  return {
    totalTrackedMinutes,
    totalTrackedHours: Number((totalTrackedMinutes / 60).toFixed(2)),
    entryCount,
    trackedMinutesByTask,
  };
};

const getProjectRecentActivity = ({ adminId, projectId, taskIds }) =>
  Activity.find({
    adminRef: adminId,
    $or: [
      { "metadata.projectId": projectId },
      { "metadata.taskId": { $in: taskIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate("user", "name email role profileImage");

/**
 * @desc  Get all projects in the workspace (with live task counts)
 * @route GET /api/projects
 * @access Admin, Manager
 */
exports.getProjects = asyncHandler(async (req, res) => {
  const adminId = getAdminId(req.user);
  const isIndividualContributor = req.user.role === "member";
  let projectFilter = { adminRef: adminId };

  if (isIndividualContributor) {
    projectFilter = {
      adminRef: adminId,
      $or: [
        { members: req.user._id },
        { manager: req.user._id },
        { createdBy: req.user._id },
      ],
    };
  }

  const projects = await Project.find(projectFilter)
    .populate("createdBy", "name email")
    .populate("manager", "name email")
    .populate("members", "name email role")
    .sort({ createdAt: -1 });

  // Attach task counts per project in one batched query
  const projectIds = projects.map((p) => p._id);

  const taskStats = await Task.aggregate([
    { $match: { adminRef: adminId, projectRef: { $in: projectIds } } },
    {
      $group: {
        _id: "$projectRef",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
      },
    },
  ]);

  const statsMap = taskStats.reduce((acc, s) => {
    acc[String(s._id)] = s;
    return acc;
  }, {});

  const enriched = projects.map((p) => {
    const stats = statsMap[String(p._id)] ?? { total: 0, completed: 0, inProgress: 0 };
    return {
      ...p.toObject(),
      taskCount: stats.total,
      completedTasks: stats.completed,
      inProgressTasks: stats.inProgress,
      progress: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  });

  res.status(200).json(ApiResponse.success("Projects retrieved", { projects: enriched }));
});

/**
 * @desc  Get a single project with its tasks
 * @route GET /api/projects/:id
 * @access Admin, Manager
 */
exports.getProjectById = asyncHandler(async (req, res) => {
  const adminId = getAdminId(req.user);
  const project = await Project.findOne({ _id: req.params.id, adminRef: adminId })
    .populate("createdBy", "name email")
    .populate("manager", "name email")
    .populate("members", "name email role");

  if (!project) throw ApiError.notFound("Project not found");

  const tasks = await Task.find({ projectRef: project._id, adminRef: adminId })
    .populate("assignee", "name email role")
    .populate("assignedBy", "name email")
    .sort({ createdAt: -1 });

  const taskIds = tasks.map((task) => task._id);
  const [timeSummary, recentActivity] = await Promise.all([
    buildProjectTimeSummary({ adminId, projectId: project._id, taskIds }),
    getProjectRecentActivity({ adminId, projectId: project._id, taskIds }),
  ]);

  const enrichedTasks = tasks.map((task) => ({
    ...task.toObject(),
    trackedMinutes: timeSummary.trackedMinutesByTask[toIdString(task._id)] || 0,
  }));

  res.status(200).json(ApiResponse.success("Project retrieved", {
    project,
    tasks: enrichedTasks,
    timeSummary,
    recentActivity,
  }));
});

/**
 * @desc  Create a new project
 * @route POST /api/projects
 * @access Admin, Manager
 */
exports.createProject = asyncHandler(async (req, res) => {
  const { title, description, status, priority, color, startDate, dueDate, manager, members } = req.body;
  const adminId = getAdminId(req.user);

  if (!title || !title.trim()) throw ApiError.badRequest("Project title is required");

  const project = await Project.create({
    title: title.trim(),
    description: description?.trim() ?? "",
    status: status ?? "planning",
    priority: priority ?? "medium",
    color: color ?? "#6366f1",
    startDate,
    dueDate,
    adminRef: adminId,
    createdBy: req.user._id,
    manager: manager ?? null,
    members: members ?? [],
  });

  await project.populate("createdBy", "name email");
  await project.populate("manager", "name email");
  await project.populate("members", "name email role");

  await logActivity({
    type: "project_created",
    message: `created project "${project.title}"`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { projectId: project._id },
    io: req.app.get("io"),
  });

  res.status(201).json(ApiResponse.created("Project created successfully", { project }));
});

/**
 * @desc  Update a project
 * @route PUT /api/projects/:id
 * @access Admin, Manager (must be creator or manager of this project)
 */
exports.updateProject = asyncHandler(async (req, res) => {
  const adminId = getAdminId(req.user);
  const project = await Project.findOne({ _id: req.params.id, adminRef: adminId });
  if (!project) throw ApiError.notFound("Project not found");

  // Only admin, the project creator, or the assigned manager can update
  const isAdmin = req.user.role === "admin";
  const isCreator = String(project.createdBy) === String(req.user._id);
  const isManager = String(project.manager) === String(req.user._id);
  if (!isAdmin && !isCreator && !isManager) {
    throw ApiError.forbidden("You do not have permission to update this project");
  }

  const allowed = ["title", "description", "status", "priority", "color", "startDate", "dueDate", "manager", "members"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });

  await project.save();
  await project.populate("createdBy", "name email");
  await project.populate("manager", "name email");
  await project.populate("members", "name email role");

  await logActivity({
    type: "project_updated",
    message: `updated project "${project.title}"`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { projectId: project._id },
    io: req.app.get("io"),
  });

  res.status(200).json(ApiResponse.success("Project updated successfully", { project }));
});

/**
 * @desc  Delete a project (tasks become unlinked, not deleted)
 * @route DELETE /api/projects/:id
 * @access Admin or project creator only
 */
exports.deleteProject = asyncHandler(async (req, res) => {
  const adminId = getAdminId(req.user);
  const project = await Project.findOne({ _id: req.params.id, adminRef: adminId });
  if (!project) throw ApiError.notFound("Project not found");

  const isAdmin = req.user.role === "admin";
  const isCreator = String(project.createdBy) === String(req.user._id);
  if (!isAdmin && !isCreator) {
    throw ApiError.forbidden("Only the creator or an Admin can delete this project");
  }

  // Unlink tasks — they remain in the workspace but lose their project association
  await Task.updateMany({ projectRef: project._id }, { $set: { projectRef: null } });

  await logActivity({
    type: "project_deleted",
    message: `deleted project "${project.title}"`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { projectId: project._id },
    io: req.app.get("io"),
  });

  await Project.deleteOne({ _id: project._id });

  res.status(200).json(ApiResponse.success("Project deleted successfully"));
});
