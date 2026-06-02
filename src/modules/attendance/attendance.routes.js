const express = require("express");
const attendanceController = require("./attendance.controller");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail);

/**
 * @swagger
 * /attendance/clock-in:
 *   post:
 *     operationId: clockInAttendance
 *     summary: Clock in for the current workday
 *     description: Creates or updates today's attendance record for the authenticated user.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clock-in successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/clock-in", attendanceController.clockIn);

/**
 * @swagger
 * /attendance/clock-out:
 *   post:
 *     operationId: clockOutAttendance
 *     summary: Clock out for the current workday
 *     description: Updates today's attendance record with logout time and total hours.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clock-out successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/clock-out", attendanceController.clockOut);

/**
 * @swagger
 * /attendance/my-history:
 *   get:
 *     operationId: getMyAttendanceHistory
 *     summary: Get current user's attendance history
 *     description: Returns the most recent attendance records for the authenticated user.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance history returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/my-history", attendanceController.getMyHistory);

/**
 * @swagger
 * /attendance/workspace:
 *   get:
 *     operationId: getWorkspaceAttendance
 *     summary: Get workspace attendance records
 *     description: Returns attendance records for the authenticated admin or manager workspace.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace attendance returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/workspace", authorize("manager", "admin"), attendanceController.getWorkspaceAttendance);

module.exports = router;
