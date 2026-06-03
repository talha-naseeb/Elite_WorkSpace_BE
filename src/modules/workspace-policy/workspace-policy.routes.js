const express = require("express");
const controller = require("./workspace-policy.controller");
const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

/**
 * @swagger
 * /workspace-policy:
 *   get:
 *     operationId: getWorkspacePolicy
 *     summary: Get workspace attendance policy
 *     description: Returns policy values that control attendance rules, including attendanceMode.
 *     tags: [Workspace Policy]
 *     responses:
 *       200:
 *         description: Workspace policy
 *         content:
 *           application/json:
 *             examples:
 *               fixed:
 *                 value:
 *                   success: true
 *                   data:
 *                     attendanceMode: fixed
 *                     standardHoursPerDay: 8
 *                     overtimeThresholdMinutes: 480
 */
router.get("/", authenticate, controller.getPolicy);

/**
 * @swagger
 * /workspace-policy:
 *   patch:
 *     operationId: updateWorkspacePolicy
 *     summary: Update workspace attendance policy
 *     tags: [Workspace Policy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               standardHoursPerDay:
 *                 type: number
 *                 example: 8
 *               overtimeThresholdMinutes:
 *                 type: integer
 *                 example: 480
 *               lateThresholdMinutes:
 *                 type: integer
 *                 example: 15
 *               shiftStartTime:
 *                 type: string
 *                 example: "09:00"
 *               attendanceMode:
 *                 type: string
 *                 enum: [flexible, fixed]
 *                 description: flexible allows multiple clock-in/out sessions; fixed enforces one terminal checkout.
 *                 example: fixed
 *               workWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1,2,3,4,5]
 *     responses:
 *       200:
 *         description: Updated workspace policy
 */
router.patch("/", authenticate, authorize("admin"), controller.updatePolicy);

module.exports = router;
