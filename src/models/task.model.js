const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    status: {
      type: String,
      enum: ["todo", "in-progress", "under-review", "changes-requested", "completed", "cancelled", "rejected"],
      default: "todo",
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    startDate: Date,
    dueDate: Date,
    completedAt: Date,
    projectRef: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    adminRef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    history: [
      {
        status: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedAt: { type: Date, default: Date.now },
        comment: String,
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({ adminRef: 1, createdAt: -1 });
taskSchema.index({ adminRef: 1, status: 1, createdAt: -1 });
taskSchema.index({ adminRef: 1, assignee: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
