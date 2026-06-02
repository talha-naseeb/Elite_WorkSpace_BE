const express = require("express");
const timeTrackingController = require("./time-tracking.controller");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const { authorize } = require("../../middleware/authorize");
const { validateClockInPayload } = require("./time-tracking.validation");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail);

/**
 * @swagger
 * /time-tracking/clock-in:
 *   post:
 *     operationId: clockInTimeTracking
 *     summary: Start a time tracking session
 *     description: Creates one active work session for the authenticated user. A user can only have one active session.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "665f8fd4e8c2a4a16e123456"
 *               taskId:
 *                 type: string
 *                 example: "665f9009e8c2a4a16e123789"
 *               source:
 *                 type: string
 *                 enum: [manual, desktop-app, browser]
 *                 example: browser
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Working on API migration"
 *     responses:
 *       201:
 *         description: Time tracking session started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/clock-in", validateClockInPayload, timeTrackingController.clockIn);

/**
 * @swagger
 * /time-tracking/clock-out:
 *   post:
 *     operationId: clockOutTimeTracking
 *     summary: Stop the active time tracking session
 *     description: Closes the authenticated user's active time entry and calculates durationMinutes.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time tracking session stopped
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/clock-out", timeTrackingController.clockOut);

/**
 * @swagger
 * /time-tracking/active:
 *   get:
 *     operationId: getActiveTimeEntry
 *     summary: Get the current active time entry
 *     description: Returns the active session for the authenticated user, or null if none exists.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active time entry returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/active", timeTrackingController.getActiveEntry);

/**
 * @swagger
 * /time-tracking/my-history:
 *   get:
 *     operationId: getMyTimeEntries
 *     summary: Get current user's time entries
 *     description: Returns recent time entries for the authenticated user.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User time entries returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/my-history", timeTrackingController.getMyHistory);

/**
 * @swagger
 * /time-tracking/workspace:
 *   get:
 *     operationId: getWorkspaceTimeEntries
 *     summary: Get workspace time entries
 *     description: Returns recent team time entries for the authenticated admin or manager workspace.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace time entries returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/workspace", authorize("manager", "admin"), timeTrackingController.getWorkspaceEntries);

/**
 * @swagger
 * /time-tracking/summary:
 *   get:
 *     operationId: getTimeTrackingSummary
 *     summary: Get current user's time summary
 *     description: Returns today, week, and month duration totals in minutes for the authenticated user.
 *     tags: [Time Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time tracking summary returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/summary", timeTrackingController.getSummary);

module.exports = router;
