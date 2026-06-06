const express = require("express");
const authRoutes = require("../../modules/auth/auth.routes");
const userRoutes = require("../../modules/users/user.routes");
const taskRoutes = require("../../modules/tasks/task.routes");
const ticketRoutes = require("../../modules/tickets/ticket.routes");
const managerRoutes = require("../../modules/teams/manager.routes");
const superAdminRoutes = require("../../modules/super-admin/superAdmin.routes");
const adminRoutes = require("../../modules/admin/admin.routes");
const analyticsRoutes = require("../../modules/analytics/analytics.routes");
const attendanceRoutes = require("../../modules/attendance/attendance.routes");
const timeTrackingRoutes = require("../../modules/time-tracking/time-tracking.routes");
const workspacePolicyRoutes = require("../../modules/workspace-policy/workspace-policy.routes");
const reportsRoutes = require("../../modules/reports/reports.routes");
const integrationRoutes = require("../../modules/integrations/integration.routes");
const activityRoutes = require("../../routes/activity.routes");
const projectRoutes = require("../../modules/projects/project.routes");
const { authRateLimiter, generalRateLimiter } = require("../../middleware/rateLimit.middleware");
const { requestLogger } = require("../../middleware/requestLogger.middleware");
const connectDB = require("../../config/database");
const { getDbStatus } = require("../../config/database");
const ApiError = require("../../utils/apiError");

const router = express.Router();

const ensureDatabaseConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(ApiError.internal("Database connection failed"));
  }
};

router.use(requestLogger);
router.use(ensureDatabaseConnection);

/**
 * @swagger
 * /health:
 *   get:
 *     operationId: getApiHealth
 *     summary: Check API and database health
 *     description: Returns API uptime and MongoDB connection status for the v1 API.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API and database are healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *       503:
 *         description: API is reachable but a dependency is degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/health", (req, res) => {
  const db = getDbStatus();
  const statusCode = db === "connected" ? 200 : 503;

  res.status(statusCode).json({
    success: statusCode === 200,
    status: statusCode === 200 ? "ok" : "degraded",
    db,
    message: "API routing is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use("/auth", authRateLimiter, authRoutes);
router.use(generalRateLimiter);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/tickets", ticketRoutes);
router.use("/manager", managerRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/admin", adminRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/time-tracking", timeTrackingRoutes);
router.use("/workspace-policy", workspacePolicyRoutes);
router.use("/reports", reportsRoutes);
router.use("/integrations", integrationRoutes);
router.use("/activities", activityRoutes);
router.use("/projects", projectRoutes);

module.exports = router;
