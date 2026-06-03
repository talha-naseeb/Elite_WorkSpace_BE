const express = require("express");
const attendanceController = require("./attendance.controller");
const attendanceValidation = require("./attendance.validation");
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
 *     summary: Start the user's attendance work session
 *     description: >
 *       Starts attendance using the workspace attendanceMode. In fixed mode this follows the state machine.
 *       In flexible mode it appends a new work session when no session is active.
 *     tags: [Attendance]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timezone:
 *                 type: string
 *                 example: Asia/Karachi
 *     responses:
 *       200:
 *         description: Attendance checked in
 *       400:
 *         description: INVALID_STATE_TRANSITION with attendanceMode, currentState, and allowedActions
 */
router.post("/check-in", attendanceValidation.requireTimezone, attendanceController.checkIn);

/**
 * @swagger
 * /attendance/start-break:
 *   post:
 *     operationId: startAttendanceBreak
 *     summary: Start an attendance break
 *     description: Transitions attendance from working to break, closing the active work session.
 *     tags: [Attendance]
 */
router.post("/start-break", attendanceValidation.requireTimezone, attendanceController.startBreak);

/**
 * @swagger
 * /attendance/end-break:
 *   post:
 *     operationId: endAttendanceBreak
 *     summary: End an attendance break
 *     description: Transitions attendance from break to working, closing the active break session.
 *     tags: [Attendance]
 */
router.post("/end-break", attendanceValidation.requireTimezone, attendanceController.endBreak);

/**
 * @swagger
 * /attendance/check-out:
 *   post:
 *     operationId: checkOutAttendance
 *     summary: Finish attendance for the shift
 *     description: >
 *       Closes the active attendance session. In fixed mode this transitions to checked_out.
 *       In flexible mode it transitions back to offline and allows another check-in later.
 *     tags: [Attendance]
 */
router.post("/check-out", attendanceValidation.requireTimezone, attendanceController.checkOut);

// Compatibility aliases while clients migrate.
router.post("/clock-in", attendanceValidation.requireTimezone, attendanceController.checkIn);
router.post("/clock-out", attendanceValidation.requireTimezone, attendanceController.checkOut);

/**
 * @swagger
 * /attendance/today:
 *   get:
 *     operationId: getTodayAttendance
 *     summary: Get today's attendance state
 *     description: Returns today's attendance, attendanceMode, and allowedActions for mode-aware clients.
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Today attendance state returned
 *         content:
 *           application/json:
 *             examples:
 *               flexible:
 *                 value:
 *                   success: true
 *                   data:
 *                     attendanceMode: flexible
 *                     allowedActions: [check-in]
 *                     attendance:
 *                       currentState: offline
 *                       attendanceMode: flexible
 *                       allowedActions: [check-in]
 */
router.get("/today", attendanceController.getToday);

/**
 * @swagger
 * /attendance/my-week:
 *   get:
 *     operationId: getMyWeekAttendance
 *     summary: Get my weekly attendance sessions
 *     tags: [Attendance]
 */
router.get("/my-week", attendanceController.getMyWeek);

/**
 * @swagger
 * /attendance/team-week:
 *   get:
 *     operationId: getTeamWeekAttendance
 *     summary: Get direct team weekly attendance sessions
 *     tags: [Attendance]
 */
router.get("/team-week", authorize("manager", "admin"), attendanceController.getTeamWeek);

/**
 * @swagger
 * /attendance/workspace-week:
 *   get:
 *     operationId: getWorkspaceWeekAttendance
 *     summary: Get workspace weekly attendance sessions
 *     tags: [Attendance]
 */
router.get("/workspace-week", authorize("admin"), attendanceController.getWorkspaceWeek);

// Existing compatibility endpoint used by the current reports page.
router.get("/week", attendanceController.getWeeklyAttendance);
router.get("/my-history", attendanceController.getMyHistory);
router.get("/workspace", authorize("admin"), attendanceController.getWorkspaceAttendance);
router.patch("/:id/manual-close", authorize("manager", "admin"), attendanceController.manualClose);

router.post("/:id/adjustments", attendanceController.requestAdjustment);
router.patch(
  "/:id/adjustments/review",
  authorize("manager", "admin"),
  attendanceValidation.validateAdjustmentReview,
  attendanceController.reviewAdjustment
);

module.exports = router;
