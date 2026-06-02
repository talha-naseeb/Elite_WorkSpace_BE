const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    checkInAt: Date,
    checkOutAt: Date,
    totalMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave", "incomplete"],
      default: "present",
    },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, workspace: 1, date: 1 }, { unique: true });
attendanceSchema.index({ workspace: 1, date: -1 });
attendanceSchema.index({ workspace: 1, user: 1, date: -1 });
attendanceSchema.index({ workspace: 1, status: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
