const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["work", "break"], required: true },
    startAt: { type: Date, required: true },
    endAt: Date,
    timezone: { type: String, default: "UTC" },
  },
  { _id: true }
);

const adjustmentRequestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["attendance"], default: "attendance" },
    reason: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedSessions: [sessionSchema],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shiftDate: { type: String, required: true },
    currentState: {
      type: String,
      enum: ["offline", "working", "break", "checked_out"],
      default: "offline",
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ["present", "absent", "half_day", "leave", "late", "incomplete"],
      default: "present",
    },
    approvalStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    sessions: { type: [sessionSchema], default: [] },
    totalWorkMinutes: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    adjustmentRequest: adjustmentRequestSchema,

    // Temporary compatibility aliases for old reads while the frontend migrates.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: Date,
    checkInAt: Date,
    checkOutAt: Date,
    totalMinutes: { type: Number, default: 0 },
    status: String,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { userId: 1, workspaceId: 1, shiftDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true },
      workspaceId: { $exists: true },
      shiftDate: { $exists: true },
    },
  }
);
attendanceSchema.index({ workspaceId: 1, shiftDate: -1 });
attendanceSchema.index({ userId: 1, currentState: 1 });
attendanceSchema.index({ workspaceId: 1, userId: 1, shiftDate: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
