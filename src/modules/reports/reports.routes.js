const express = require("express");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const reportsController = require("./reports.controller");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail);

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     operationId: getTimeAndAttendanceReportSummary
 *     summary: Get attendance and task time report summary
 *     tags: [Reports]
 */
router.get("/summary", reportsController.getSummary);

module.exports = router;
