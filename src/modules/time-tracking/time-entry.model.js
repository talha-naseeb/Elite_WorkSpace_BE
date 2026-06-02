const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    clockInAt: { type: Date, required: true },
    clockOutAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["manual", "desktop-app", "browser"],
      default: "browser",
    },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

timeEntrySchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  }
);
timeEntrySchema.index({ workspace: 1, clockInAt: -1 });
timeEntrySchema.index({ user: 1, clockInAt: -1 });
timeEntrySchema.index({ workspace: 1, user: 1, clockInAt: -1 });

module.exports = mongoose.model("TimeEntry", timeEntrySchema);
