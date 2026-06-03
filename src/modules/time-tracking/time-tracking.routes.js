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
 * /time-tracking/start:
 *   post:
 *     operationId: startTaskTimer
 *     summary: Start a task timer session
 *     description: Creates a flat TimeEntry. Starting a different task auto-stops the current active timer.
 *     tags: [Time Tracking]
 */
router.post("/start", validateClockInPayload, timeTrackingController.startTimer);

/**
 * @swagger
 * /time-tracking/stop:
 *   post:
 *     operationId: stopTaskTimer
 *     summary: Stop the active task timer session
 *     tags: [Time Tracking]
 */
router.post("/stop", timeTrackingController.stopTimer);

// Compatibility aliases while clients migrate.
router.post("/clock-in", validateClockInPayload, timeTrackingController.clockIn);
router.post("/clock-out", timeTrackingController.clockOut);

/**
 * @swagger
 * /time-tracking/active:
 *   get:
 *     operationId: getActiveTimeEntry
 *     summary: Get the current active time entry
 *     tags: [Time Tracking]
 */
router.get("/active", timeTrackingController.getActiveEntry);

/**
 * @swagger
 * /time-tracking/my-history:
 *   get:
 *     operationId: getMyTimeEntries
 *     summary: Get current user's time entries
 *     tags: [Time Tracking]
 */
router.get("/my-history", timeTrackingController.getMyHistory);

/**
 * @swagger
 * /time-tracking/task/{taskId}:
 *   get:
 *     operationId: getTaskTimeEntries
 *     summary: Get task time entries
 *     tags: [Time Tracking]
 */
router.get("/task/:taskId", timeTrackingController.getTaskEntries);

/**
 * @swagger
 * /time-tracking/workspace:
 *   get:
 *     operationId: getWorkspaceTimeEntries
 *     summary: Get workspace time entries
 *     tags: [Time Tracking]
 */
router.get("/workspace", authorize("manager", "admin"), timeTrackingController.getWorkspaceEntries);

router.get("/summary", timeTrackingController.getSummary);
router.post("/:entryId/adjustments", timeTrackingController.requestAdjustment);
router.patch("/:entryId/adjustments/review", authorize("manager", "admin"), timeTrackingController.reviewAdjustment);

module.exports = router;
