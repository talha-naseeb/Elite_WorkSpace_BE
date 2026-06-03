const express = require("express");
const localAuthRoutes = require("./auth/local.routes");
const oauthRoutes = require("./auth/oauth.routes");
const userProfileRoutes = require("./user/profile.routes");
const taskRoutes = require("./user/task.routes");
const ticketRoutes = require("./user/ticket.routes");
const managerRoutes = require("./user/manager.routes");
const superAdminRoutes = require("./superAdmin.routes");
const adminRoutes = require("./admin.routes");
const attendanceRoutes = require("./user/attendance.routes");
const integrationRoutes = require("./integration.routes");
const activityRoutes = require("./activity.routes");
const projectRoutes = require("./project.routes");
const { authRateLimiter, generalRateLimiter } = require("../middleware/rateLimit.middleware");
const { requestLogger } = require("../middleware/requestLogger.middleware");
const { getDbStatus } = require("../config/database");

const router = express.Router();

// Global request logger
router.use(requestLogger);

// Overall API Health Check Endpoint
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

// Auth routes
router.use("/auth", authRateLimiter, localAuthRoutes);
router.use("/auth", authRateLimiter, oauthRoutes);

// General API rate limiting (exclude health endpoint)
router.use(generalRateLimiter);

// User routes
router.use("/users", userProfileRoutes);
router.use("/tasks", taskRoutes);
router.use("/tickets", ticketRoutes);
router.use("/manager", managerRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/admin", adminRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/integrations", integrationRoutes);
router.use("/activities", activityRoutes);
router.use("/projects", projectRoutes);

module.exports = router;
