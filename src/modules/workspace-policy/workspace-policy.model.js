const mongoose = require("mongoose");

const workspacePolicySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    standardHoursPerDay: { type: Number, default: 8 },
    overtimeThresholdMinutes: { type: Number, default: 480 },
    lateThresholdMinutes: { type: Number, default: 15 },
    shiftStartTime: { type: String, default: "09:00" },
    attendanceMode: { type: String, enum: ["flexible", "fixed"], default: "fixed" },
    workWeek: { type: [Number], default: () => [1, 2, 3, 4, 5] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkspacePolicy", workspacePolicySchema);
