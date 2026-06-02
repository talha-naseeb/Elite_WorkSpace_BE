const Task = require("../models/task.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/helpers/asyncHandler");
const { broadcastAdminStats } = require("../utils/stats-helper");
const { notifySlack, taskAssignedMessage, taskStatusMessage } = require("../utils/slack");

// Helper to notify via Socket.io
const notifyTaskUpdate = (req, event, data) => {
  const io = req.app.get("io");
  if (io && data.adminRef) {
    // Notify the specific workspace room
    io.to(String(data.adminRef)).emit(event, data);
    console.log(`[Socket] Emitted ${event} to workspace ${data.adminRef}`);
  }
};

/**
 * @desc Create a new task
 * @route POST /api/tasks
 * @access Admin, Manager, Employee (can assign to self or others)
 */
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, assignee, priority, dueDate, startDate, projectRef } = req.body;
  const adminId = req.user.role === "admin" ? req.user._id : req.user.adminRef;

  if (!title) throw ApiError.badRequest("Task title is required");

  const task = new Task({
    title,
    description,
    assignedBy: req.user._id,
    assignee: assignee || req.user._id, // default to self if not provided
    priority: priority || "medium",
    dueDate,
    startDate,
    projectRef: projectRef || null,
    adminRef: adminId,
    history: [{
      status: "todo",
      updatedBy: req.user._id,
      comment: "Task created"
    }]
  });

  await task.save();
  await task.populate("assignee", "name email");
  await task.populate("assignedBy", "name email");

  // Notify assignee if not the creator
  if (String(task.assignee._id) !== String(req.user._id)) {
    notifyTaskUpdate(req, "task:assigned", task);
    notifySlack(adminId, taskAssignedMessage(task.title, task.assignee.name));
  }

  await broadcastAdminStats(req, adminId);

  res.status(201).json(ApiResponse.created("Task created successfully", { task }));
});

/**
 * @desc Get tasks based on user role
 * @route GET /api/tasks
 * @access Private
 */
exports.getTasks = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  let query = { adminRef: adminId };

  // If Employee, only see tasks assigned to them OR created by them
  if (req.user.role === "developer" || req.user.role === "employee") {
    query.$or = [
      { assignee: req.user._id },
      { assignedBy: req.user._id }
    ];
  } 
  // If Manager, see their own tasks + tasks assigned to their team (if applicable)
  // For now, Managers see everything in the workspace or we can restrict further if needed.
  // Given the user's prompt "one admin can multiple teams and each team is under the manager", 
  // we might want to filter by team here if the Task model had a 'teamId'. 
  // Since it doesn't yet, we'll let Managers see all workspace tasks for now, as they are "sub-admins".

  const tasks = await Task.find(query)
    .populate("assignee", "name email role")
    .populate("assignedBy", "name email role")
    .populate("projectRef", "title color status")
    .populate("comments.user", "name email role")
    .populate("history.updatedBy", "name email role")
    .sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success("Tasks retrieved", { tasks }));
});

/**
 * @desc Update task status (Optimistic UI Support)
 * @route PATCH /api/tasks/:id/status
 * @access Private
 */
exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  const task = await Task.findById(id);
  if (!task) throw ApiError.notFound("Task not found");

  // Verify workspace access
  const adminId = req.user.role === "admin" ? req.user._id : req.user.adminRef;
  if (String(task.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied to this task");
  }

  const oldStatus = task.status;
  task.status = status;
  
  // Track history
  task.history.push({
    status,
    updatedBy: req.user._id,
    comment: comment || `Status changed from ${oldStatus} to ${status}`
  });

  if (status === "completed") {
    task.completedAt = new Date();
  }

  await task.save();
  await task.populate("assignee", "name email");
  await task.populate("assignedBy", "name email");

  // Notify everyone in the workspace about the status change
  notifyTaskUpdate(req, "task:status-updated", task);
  notifySlack(adminId, taskStatusMessage(task.title, status));

  await broadcastAdminStats(req, adminId);

  res.status(200).json(ApiResponse.success("Task status updated", { task }));
});

/**
 * @desc Reassign task
 * @route PATCH /api/tasks/:id/reassign
 * @access Admin, Manager, or Creator
 */
exports.reassignTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignee, comment } = req.body;

  const task = await Task.findById(id);
  if (!task) throw ApiError.notFound("Task not found");

  // Permission check: Only Admin, the original creator, or the current manager/assignee can reassign
  const isCreator = String(task.assignedBy) === String(req.user._id);
  const isAssignee = String(task.assignee) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  const isManager = req.user.role === "manager"; // Potentially check if they manage the assignee/creator

  if (!isAdmin && !isManager && !isCreator && !isAssignee) {
    throw ApiError.forbidden("You do not have permission to reassign this task");
  }

  const oldAssignee = task.assignee;
  task.assignee = assignee;
  
  task.history.push({
    status: task.status,
    updatedBy: req.user._id,
    comment: comment || `Task reassigned`
  });

  await task.save();
  await task.populate("assignee", "name email");
  await task.populate("assignedBy", "name email");

  // Notify new assignee
  notifyTaskUpdate(req, "task:assigned", task);

  res.status(200).json(ApiResponse.success("Task reassigned successfully", { task }));
});

/**
 * @desc Update task details (Admin/Manager only)
 * @route PUT /api/tasks/:id
 * @access Admin or Manager
 */
exports.updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, dueDate, assignee, projectRef } = req.body;

  const task = await Task.findById(id);
  if (!task) throw ApiError.notFound("Task not found");

  // Permission check: Only Admin or Manager
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    throw ApiError.forbidden("Only Admins and Managers can edit core task details");
  }

  // Verify workspace access
  const adminId = req.user.role === "admin" ? req.user._id : req.user.adminRef;
  if (String(task.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied to this task");
  }

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = dueDate;
  if (assignee) task.assignee = assignee;
  if (projectRef !== undefined) task.projectRef = projectRef || null;

  task.history.push({
    status: task.status,
    updatedBy: req.user._id,
    comment: `Task details updated by ${req.user.role}`
  });

  await task.save();
  await task.populate("assignee", "name email role");
  await task.populate("assignedBy", "name email role");

  notifyTaskUpdate(req, "task:updated", task);

  res.status(200).json(ApiResponse.success("Task updated successfully", { task }));
});

/**
 * @desc Delete task
 * @route DELETE /api/tasks/:id
 * @access Admin or Creator
 */
exports.deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) throw ApiError.notFound("Task not found");

  const isAdmin = req.user.role === "admin";
  const isCreator = String(task.assignedBy) === String(req.user._id);

  if (!isAdmin && !isCreator) {
    throw ApiError.forbidden("Only the creator or an Admin can delete this task");
  }

  await Task.deleteOne({ _id: id });
  
  // Notify workspace about deletion
  notifyTaskUpdate(req, "task:deleted", { _id: id, adminRef: task.adminRef });

  await broadcastAdminStats(req, task.adminRef);

  res.status(200).json(ApiResponse.success("Task deleted successfully"));
});

/**
 * @desc Add a comment to a task
 * @route POST /api/tasks/:id/comments
 * @access Private
 */
exports.addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text) throw ApiError.badRequest("Comment text is required");

  const task = await Task.findById(id);
  if (!task) throw ApiError.notFound("Task not found");

  // Verify workspace access
  const adminId = req.user.role === "admin" ? req.user._id : req.user.adminRef;
  if (String(task.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied to this task");
  }

  task.comments.push({
    user: req.user._id,
    text,
  });

  await task.save();
  await task.populate("comments.user", "name email role");
  await task.populate("assignee", "name email role");
  await task.populate("assignedBy", "name email role");

  // Notify workspace about the new comment
  notifyTaskUpdate(req, "task:comment-added", task);

  res.status(200).json(ApiResponse.success("Comment added successfully", { task }));
});
