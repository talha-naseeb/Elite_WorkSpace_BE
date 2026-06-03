const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    timezone: { type: String, default: "UTC" },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    adjustmentRequest: {
      reason: { type: String, trim: true },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      requestedStartAt: Date,
      requestedEndAt: Date,
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: Date,
      reviewNote: { type: String, trim: true },
    },

    // Temporary compatibility aliases for existing clients.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    clockInAt: Date,
    clockOutAt: Date,
    source: { type: String, enum: ["manual", "desktop-app", "browser"], default: "browser" },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

timeEntrySchema.index(
  { userId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);
timeEntrySchema.index({ taskId: 1 });
timeEntrySchema.index({ userId: 1, startAt: -1 });
timeEntrySchema.index({ workspaceId: 1, projectId: 1 });
timeEntrySchema.index({ workspaceId: 1, startAt: -1 });

module.exports = mongoose.model("TimeEntry", timeEntrySchema);
