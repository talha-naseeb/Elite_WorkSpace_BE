const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/helpers/asyncHandler");
const crypto = require("crypto");
const { hashPassword } = require("../utils/helpers/authHelpers");
const { sendEmployeeCredentialsEmail } = require("../utils/email");
const validator = require("validator");
const { broadcastAdminStats } = require("../utils/stats-helper");
const { logActivity } = require("../utils/activityLogger");
const { notifySlack, employeeOnboardedMessage } = require("../utils/slack");

// Manager creates an employee (or Admin can use same endpoint)

exports.createEmployee = asyncHandler(async (req, res) => {
  // final server-side guard (double protection)
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only the Workspace Admin can create new users on this plan.");
  }

  const { name, email, department, contactNumber, companyEmail, jobDescription, role: requestedRole } = req.body;

  if (requestedRole && ["admin", "super_admin"].includes(requestedRole)) {
    throw ApiError.forbidden("Cannot assign this role");
  }

  // Multi-tenancy context
  const adminId = req.user._id;

  // Get Admin's current limit
  const workspaceAdmin = req.user; // already populated by auth middleware

  // 1. Check current active count for all tiers
  const currentActiveCount = await User.countDocuments({ adminRef: adminId });

  // 2. Additional enforcement for Free Trial (Lifetime Limit)
  if (workspaceAdmin.subscriptionTier === "free") {
    if (workspaceAdmin.totalUsersCreated >= workspaceAdmin.maxUsersLimit) {
      throw ApiError.forbidden(
        `Lifetime trial limit reached: You have already created ${workspaceAdmin.maxUsersLimit} unique users. Free trial accounts cannot rotate seats by deleting users. Please upgrade to Pro to manage more team members.`,
      );
    }
  } else {
    // Paid tiers use standard seat-based limits
    if (currentActiveCount >= workspaceAdmin.maxUsersLimit) {
      throw ApiError.forbidden(`Seat limit reached: Your current plan allows ${workspaceAdmin.maxUsersLimit} active users. Please upgrade your seat count to add more.`);
    }
  }

  if (!validator.isEmail(email)) {
    throw ApiError.badRequest("Please provide a valid email address");
  }
  if (!name || !email) throw ApiError.badRequest("Name and email required");

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict("Email already exists");

  // generate temporary password
  const temporaryPassword = crypto.randomBytes(6).toString("hex") + "Aa1!";
  const hashedPassword = await hashPassword(temporaryPassword);

  // verification token (send raw token to user, store hashed)
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const verificationExpires = Date.now() + 1000 * 60 * 60; // 1 hour

  // managerId defaulting logic
  let managerId = req.body.managerId;
  if (!managerId && req.user.role === "manager") managerId = req.user._id;

  const user = new User({
    name,
    email,
    password: hashedPassword,
    role: requestedRole || "member",
    adminRef: adminId,
    manager: managerId,
    companyEmail: companyEmail || email,
    mobileNumber: contactNumber,
    department,
    jobDescription,
    isVerified: false,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: verificationExpires,
  });

  await user.save();

  // 3. Increment Admin lifetime counter (atomic)
  await User.findByIdAndUpdate(adminId, { $inc: { totalUsersCreated: 1 } });

  // send combined email (credentials + verification link)
  let mailDeliveryWarning = null;

  try {
    await sendEmployeeCredentialsEmail(email, temporaryPassword, verificationToken);
    user.emailSent = true;
    user.emailDeliveryError = undefined;
  } catch (error) {
    console.error("Failed to send employee credentials email:", error);
    user.emailSent = false;
    user.emailDeliveryError = error.message || "Email delivery failed";
    mailDeliveryWarning = "Email delivery failed; credentials not sent to user. Please retry manually or call the resend endpoint.";
    // persist flag to record that email has not been sent.
  }

  await user.save();

  try {
    await broadcastAdminStats(req, adminId);
  } catch (err) {
    console.error("Failed to broadcast admin stats after employee creation:", err);
  }

  const responseData = {
    userId: user._id,
    ...(mailDeliveryWarning ? { warning: mailDeliveryWarning } : {}),
  };

  const responseMessage = mailDeliveryWarning ? "Employee created (email delivery failed)." : "Employee created and verification email sent";

  await logActivity({
    type: "user_added",
    message: `added ${user.name} as ${user.role}`,
    userId: req.user._id,
    adminRef: adminId,
    metadata: { userId: user._id, role: user.role },
    io: req.app.get("io"),
  });

  notifySlack(adminId, employeeOnboardedMessage(name, email));

  res.status(201).json(ApiResponse.created(responseMessage, responseData));
});

// Manager view their team
exports.getTeam = asyncHandler(async (req, res) => {
  // manager or admin
  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  if (!adminId) throw ApiError.forbidden("Workspace context missing");

  let query = { adminRef: adminId };
  if (req.user.role === "manager") {
    query.manager = req.user._id;
  }

  const team = await User.find(query).select("name email role mobileNumber companyEmail department jobDescription manager status isVerified").lean();

  res.status(200).json(ApiResponse.success("Team retrieved", { team }));
});

// Get single team member
exports.getEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  const user = await User.findById(id).select("name email role mobileNumber companyEmail department jobDescription manager createdAt updatedAt adminRef");
  if (!user) throw ApiError.notFound("User not found");

  // Ensure user belongs to this admin's workspace
  if (String(user.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied: User belongs to a different workspace");
  }

  // if requester is manager, ensure they manage this user
  if (req.user.role === "manager" && String(user.manager) !== String(req.user._id)) {
    throw ApiError.forbidden("Not your team member");
  }

  res.status(200).json(ApiResponse.success("Employee retrieved", { user }));
});

// Manager update employee (limited fields)
exports.updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowed = ["name", "mobileNumber", "companyEmail", "department", "jobDescription", "role"];
  const updates = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== null && req.body[f] !== "") updates[f] = req.body[f];
  });

  if (updates.role && ["admin", "super_admin"].includes(updates.role)) {
    throw ApiError.forbidden("Cannot assign this role");
  }

  const employee = await User.findById(id);
  if (!employee) throw ApiError.notFound("User not found");

  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  // Ensure employee belongs to this workspace
  if (String(employee.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied: User belongs to a different workspace");
  }

  // manager can update only their employees (strict check skip if admin)
  if (req.user.role === "manager" && String(employee.manager) !== String(req.user._id)) {
    throw ApiError.forbidden("Not your team member");
  }

  Object.assign(employee, updates);
  await employee.save();

  res.status(200).json(ApiResponse.success("Employee updated"));
});

// Manager remove employee (soft delete recommended — here we perform hard delete for brevity)
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await User.findById(id);
  if (!employee) throw ApiError.notFound("User not found");

  const isAdmin = req.user.role === "admin";
  const adminId = isAdmin ? req.user._id : req.user.adminRef;

  // Ensure employee belongs to this workspace
  if (String(employee.adminRef) !== String(adminId)) {
    throw ApiError.forbidden("Access denied: User belongs to a different workspace");
  }

  if (req.user.role === "manager" && String(employee.manager) !== String(req.user._id)) {
    throw ApiError.forbidden("Not your team member");
  }

  const adminRef = employee.adminRef;
  await User.deleteOne({ _id: id });

  try {
    await broadcastAdminStats(req, adminRef);
  } catch (err) {
    console.error("Failed to broadcast admin stats after employee deletion:", err);
  }

  res.status(200).json(ApiResponse.success("Employee deleted"));
});
