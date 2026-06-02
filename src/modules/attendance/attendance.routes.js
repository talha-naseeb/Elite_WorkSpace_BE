const express = require("express");
const attendanceController = require("./attendance.controller");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail);

/**
 * @swagger
 * /attendance/check-in:
 *   post:
 *     operationId: checkInAttendance
 *     summary: Check in for daily attendance
 *     description: Creates one daily attendance presence record for the authenticated user. This does not start a task timer.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance check-in successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/check-in", attendanceController.checkIn);

/**
 * @swagger
 * /attendance/check-out:
 *   post:
 *     operationId: checkOutAttendance
 *     summary: Check out of daily attendance
 *     description: Closes today's attendance record and auto-stops any active task timer to prevent runaway time entries.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance check-out successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post("/check-out", attendanceController.checkOut);

// Compatibility aliases while frontend and external clients migrate.
router.post("/clock-in", attendanceController.checkIn);
router.post("/clock-out", attendanceController.checkOut);

/**
 * @swagger
 * /attendance/{id}/manual-close:
 *   patch:
 *     operationId: manualCloseAttendance
 *     summary: Manually close an incomplete attendance record
 *     description: Admins can close records in their workspace. Managers can close records for their direct team only.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "665f9009e8c2a4a16e123789"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkOutAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-03T18:00:00.000Z"
 *               closedReason:
 *                 type: string
 *                 example: "Employee forgot to check out"
 *               status:
 *                 type: string
 *                 enum: [present, half-day, incomplete]
 *                 example: present
 *     responses:
 *       200:
 *         description: Attendance manually closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch("/:id/manual-close", authorize("manager", "admin"), attendanceController.manualClose);

/**
 * @swagger
 * /attendance/week:
 *   get:
 *     operationId: getWeeklyAttendance
 *     summary: Get Monday-Sunday attendance records with role-aware access
 *     description: >
 *       Admins receive accessScope "workspace", managers receive accessScope "team" for direct reports,
 *       and employees/developers receive accessScope "self". The response contains records, pagination,
 *       week { startDate, endDate }, accessScope, and summary { present, incomplete, absent, totalMinutes }.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         required: false
 *         description: Any date in the target week. The API normalizes it to Monday-Sunday.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-06-03"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *           example: 10
 *       - in: query
 *         name: userId
 *         required: false
 *         description: Filter by user where role scope permits.
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [present, absent, half-day, leave, incomplete]
 *       - in: query
 *         name: search
 *         required: false
 *         description: Search employee name, email, or role for workspace/team scopes.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Weekly attendance records returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               workspace:
 *                 value:
 *                   success: true
 *                   message: Weekly attendance retrieved
 *                   data:
 *                     records: []
 *                     pagination:
 *                       page: 1
 *                       limit: 10
 *                       total: 0
 *                       totalPages: 1
 *                       hasNextPage: false
 *                       hasPrevPage: false
 *                     week:
 *                       startDate: "2026-06-01T00:00:00.000Z"
 *                       endDate: "2026-06-07T23:59:59.999Z"
 *                     accessScope: workspace
 *                     summary:
 *                       present: 0
 *                       incomplete: 0
 *                       absent: 0
 *                       totalMinutes: 0
 *               team:
 *                 value:
 *                   success: true
 *                   message: Weekly attendance retrieved
 *                   data:
 *                     records: []
 *                     accessScope: team
 *               self:
 *                 value:
 *                   success: true
 *                   message: Weekly attendance retrieved
 *                   data:
 *                     records: []
 *                     accessScope: self
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/week", attendanceController.getWeeklyAttendance);

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
