const express = require("express");
const router = express.Router();
const integrationController = require("../controllers/integration.controller");
const { authenticate, validateUserEmail, isAdmin } = require("../middleware/auth.middleware");

// Protect all integration routes (Admin only)
router.use(authenticate, validateUserEmail, isAdmin);

// Routes
/**
 * @swagger
 * /api/integrations:
 *   get:
 *     summary: Get all available integrations (Admin only)
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of integrations }
 */
router.get("/", integrationController.getIntegrations);

/**
 * @swagger
 * /api/integrations/toggle:
 *   post:
 *     summary: Enable/Disable an integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type: { type: string }
 *     responses:
 *       200: { description: Toggle successful }
 */
router.post("/toggle", integrationController.toggleIntegration);

/**
 * @swagger
 * /api/integrations/{type}:
 *   patch:
 *     summary: Update integration configuration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey: { type: string }
 *               config: { type: object }
 *     responses:
 *       200: { description: Update successful }
 */
router.patch("/:type", integrationController.updateConfig);
router.post("/:type/test", integrationController.testWebhook);

module.exports = router;
