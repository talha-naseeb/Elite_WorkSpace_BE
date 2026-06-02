const express = require("express");
const router = express.Router();
const taskController = require("../../controllers/task.controller");
const { authenticate, validateUserEmail } = require("../../middleware/auth.middleware");

// All task routes require an authenticated, verified user.
router.use(authenticate, validateUserEmail);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get tasks assigned to or created by the user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of tasks }
 */
router.get("/", taskController.getTasks);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               assignee: { type: string, description: User ID }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *               dueDate: { type: string, format: date-time }
 *     responses:
 *       201: { description: Task created }
 */
router.post("/", taskController.createTask);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [todo, in-progress, under-review, changes-requested, completed, cancelled] }
 *               comment: { type: string }
 *     responses:
 *       200: { description: Status updated }
 */
router.patch("/:id/status", taskController.updateTaskStatus);

/**
 * @swagger
 * /api/tasks/{id}/reassign:
 *   patch:
 *     summary: Reassign task to another user
 *     tags: [Tasks]
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
 *             required: [assignee]
 *             properties:
 *               assignee: { type: string, description: User ID }
 *               comment: { type: string }
 *     responses:
 *       200: { description: Task reassigned }
 */
router.patch("/:id/reassign", taskController.reassignTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task details (Admin/Manager only)
 *     tags: [Tasks]
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *               dueDate: { type: string, format: date-time }
 *               assignee: { type: string }
 *     responses:
 *       200: { description: Task updated }
 *       403: { description: Permission denied }
 */
router.put("/:id", taskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Task deleted }
 */
router.delete("/:id", taskController.deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/comments:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Tasks]
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
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       200: { description: Comment added }
 */
router.post("/:id/comments", taskController.addComment);

module.exports = router;
