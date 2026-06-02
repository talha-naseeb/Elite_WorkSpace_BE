const express = require("express");
const router = express.Router();
const superAdminController = require("../controllers/superAdmin.controller");
const { authenticate, validateUserEmail, isSuperAdmin } = require("../middleware/auth.middleware");

// Protect all super-admin routes
router.use(authenticate, validateUserEmail, isSuperAdmin);

// Routes
/**
 * @swagger
 * /api/super-admin/clients:
 *   get:
 *     summary: Get all workspace accounts (Super Admin only)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of all workspace clients }
 */
router.get("/clients", superAdminController.getAllClients);

/**
 * @swagger
 * /api/super-admin/clients/{id}/tier:
 *   put:
 *     summary: Change a workspace subscription tier
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier: { type: string, enum: [free, pro, enterprise] }
 *     responses:
 *       200: { description: Tier updated successfully }
 */
router.put("/clients/:id/tier", superAdminController.updateClientTier);

module.exports = router;
