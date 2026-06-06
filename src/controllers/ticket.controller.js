const Ticket = require("../models/ticket.model");
const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/helpers/asyncHandler");
const { logActivity } = require("../utils/activityLogger");
const { notifySlack, ticketCreatedMessage } = require("../utils/slack");

// Create ticket (member/manager/admin)
exports.createTicket = asyncHandler(async (req, res) => {
  const { title, description, priority, assignedTo } = req.body;
  if (!title) throw ApiError.badRequest("Title is required");

  // If assignedTo provided, ensure assignment is valid:
  if (assignedTo) {
    const target = await User.findById(assignedTo).select("manager");
    if (!target) throw ApiError.notFound("Assignee not found");

    // If requester is manager, they can assign to their team
    if (req.user.role === "manager") {
      if (String(target.manager) !== String(req.user._id) && String(target._id) !== String(req.user._id)) {
        throw ApiError.forbidden("You can only assign tickets to your team");
      }
    }

    // If requester is a member, allow assign only to teammates (same manager)
    if (req.user.role !== "manager" && req.user.role !== "admin") {
      const requesterManager = String(req.user.manager || "");
      const targetManager = String(target.manager || "");
      if (!requesterManager || requesterManager !== targetManager) {
        throw ApiError.forbidden("Can only assign tickets to teammates under same manager");
      }
    }
  }

  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  if (!adminId) throw ApiError.forbidden("Workspace context missing");

  const ticket = await Ticket.create({
    createdBy: req.user._id,
    assignedTo: assignedTo || null,
    adminRef: adminId,
    title,
    description,
    priority,
  });

  // Log Activity
  await logActivity({
    type: "ticket_created",
    message: `New ticket created: ${ticket.title}`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { ticketId: ticket._id },
    io: req.app.get("io"),
  });

  notifySlack(adminId, ticketCreatedMessage(ticket.title));

  res.status(201).json(ApiResponse.created("Ticket created", { ticket }));
});

// Get tickets
exports.getTickets = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const filter = {};

  if (req.user.role === "member") {
    filter.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    filter.adminRef = req.user.adminRef;
  } else if (req.user.role === "manager") {
    // manager sees tickets for their team
    const team = await User.find({ manager: req.user._id }).select("_id");
    const teamIds = team.map((t) => t._id);
    filter.$or = [{ createdBy: { $in: teamIds } }, { assignedTo: { $in: teamIds } }];
    filter.adminRef = req.user.adminRef;
  } else if (req.user.role === "admin") {
    filter.adminRef = req.user._id;
  } else {
    throw ApiError.forbidden("You do not have permission to view tickets");
  }

  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;

  const tickets = await Ticket.find(filter).populate("createdBy", "name email").populate("assignedTo", "name email").sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success("Tickets retrieved", { tickets }));
});

// Add comment to ticket
exports.addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) throw ApiError.badRequest("Comment text is required");
  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");

  ticket.comments.push({ by: req.user._id, text });
  await ticket.save();

  res.status(200).json(ApiResponse.success("Comment added", { ticket }));
});

// Assign ticket to user (manager/admin/member with same manager)
exports.assignTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;
  if (!assignedTo) throw ApiError.badRequest("assignedTo is required");

  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");

  const target = await User.findById(assignedTo).select("manager");
  if (!target) throw ApiError.notFound("Assignee not found");

  // permission checks similar to createTicket
  if (req.user.role === "manager") {
    if (String(target.manager) !== String(req.user._id)) throw ApiError.forbidden("You can only assign to your team");
  }
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    const requesterManager = String(req.user.manager || "");
    const targetManager = String(target.manager || "");
    if (!requesterManager || requesterManager !== targetManager) {
      throw ApiError.forbidden("Can only assign to teammates under same manager");
    }
  }

  ticket.assignedTo = assignedTo;
  await ticket.save();

  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  // Log Activity
  await logActivity({
    type: "ticket_updated",
    message: `Ticket "${ticket.title}" assigned to user`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { ticketId: ticket._id, assignedTo },
    io: req.app.get("io"),
  });

  res.status(200).json(ApiResponse.success("Ticket assigned", { ticket }));
});
