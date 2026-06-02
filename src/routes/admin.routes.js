const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate, validateUserEmail, isAdmin } = require("../middleware/auth.middleware");

// Protect all admin routes
router.use(authenticate, validateUserEmail, isAdmin);

// Routes
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get high-level workspace statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: 
 *         description: Workspace metrics (users, tasks, etc.)
 */
router.get("/stats", adminController.getAdminStats);

/**
 * @swagger
 * /api/admin/trends:
 *   get:
 *     summary: Get productivity and activity trends
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: 
 *         description: Trend data for charts
 */
router.get("/trends", adminController.getAdminTrends);

module.exports = router;
