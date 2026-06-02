const express = require("express");
const router = express.Router();
const attendanceController = require("../../controllers/attendance.controller");
const { authenticate, validateUserEmail, authorize } = require("../../middleware/auth.middleware");

// All attendance routes require an authenticated, verified user.
router.use(authenticate, validateUserEmail);

// clock-in/out
/**
 * @swagger
 * /api/attendance/clock-in:
 *   post:
 *     summary: Log start of the workday
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Clocked in successfully }
 */
router.post("/clock-in", attendanceController.clockIn);

/**
 * @swagger
 * /api/attendance/clock-out:
 *   post:
 *     summary: Log end of the workday
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Clocked out successfully }
 */
router.post("/clock-out", attendanceController.clockOut);

/**
 * @swagger
 * /api/attendance/my-history:
 *   get:
 *     summary: Get log of user's own attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of attendance logs }
 */
router.get("/my-history", attendanceController.getMyHistory);

/**
 * @swagger
 * /api/attendance/workspace:
 *   get:
 *     summary: Get workspace-wide attendance (Admin/Manager only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of recent attendance logs in workspace }
 */
router.get("/workspace", authorize("manager", "admin"), attendanceController.getWorkspaceAttendance);

module.exports = router;
