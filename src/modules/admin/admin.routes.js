const express = require("express");
const adminController = require("./admin.controller");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const { isAdmin } = require("../../middleware/authorize");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail, isAdmin);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     operationId: getAdminWorkspaceStats
 *     summary: Get admin workspace statistics
 *     description: Returns workspace metrics for the authenticated admin.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace statistics returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/stats", adminController.getAdminStats);

/**
 * @swagger
 * /admin/trends:
 *   get:
 *     operationId: getAdminWorkspaceTrends
 *     summary: Get admin dashboard trend data
 *     description: Returns activity and work trend data for dashboard charts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trend data returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/trends", adminController.getAdminTrends);

module.exports = router;
