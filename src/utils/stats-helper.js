const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const Task = require("../models/task.model");

/**
 * Calculates high-level workspace stats for an admin
 * @param {string} adminId
 * @returns {Promise<Object>} stats
 */
const calculateAdminStats = async (adminId) => {
  // 1. Total Employees in this workspace
  const totalUsers = await User.countDocuments({ adminRef: adminId });

  // 2. Active Sessions (Clocked in today but not yet clocked out)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSessions = await Attendance.countDocuments({
    adminRef: adminId,
    date: { $gte: today },
    logoutTime: { $in: [null, undefined] },
  });

  // 3. Active Tasks (non-terminal task statuses in this workspace)
  const activeTasks = await Task.countDocuments({
    adminRef: adminId,
    status: { $in: ["todo", "in-progress", "under-review", "changes-requested"] },
  });

  // 4. Get the admin's limit
  const admin = await User.findById(adminId).select("maxUsersLimit");

  return {
    totalUsers,
    maxUsersLimit: admin?.maxUsersLimit || 3,
    activeSessions,
    activeTasks,
    systemHealth: "Active",
  };
};

/**
 * Broadcasts updated stats to the workspace room via Socket.IO
 * @param {Object} req - The express request object (must have app.get("io"))
 * @param {string} adminId - The ID of the admin/workspace
 */
const broadcastAdminStats = async (req, adminId) => {
  try {
    const io = req.app.get("io");
    if (!io || !adminId) return;

    const stats = await calculateAdminStats(adminId);

    // Broadcast the updated stats to the workspace room
    // Use the event name 'admin:stats-update'
    io.to(adminId.toString()).emit("admin:stats-update", { stats });

    console.log(`[Socket] Broadcasted updated stats to workspace: ${adminId}`);
  } catch (error) {
    console.error("[Socket] Failed to broadcast admin stats:", error);
  }
};

module.exports = {
  calculateAdminStats,
  broadcastAdminStats,
};
