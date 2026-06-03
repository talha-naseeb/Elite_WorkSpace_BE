const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validateUserEmail } = require("../middleware/auth.middleware");
const projectController = require("../controllers/project.controller");

// All project routes require authentication + verified email
router.use(authenticate, validateUserEmail);

// GET  /api/projects        — list all workspace projects
// POST /api/projects        — create a new project
router
  .route("/")
  .get(authorize("admin", "manager", "developer", "employee"), projectController.getProjects)
  .post(authorize("admin", "manager"), projectController.createProject);

// GET    /api/projects/:id  — get project + its tasks
// PUT    /api/projects/:id  — update project
// DELETE /api/projects/:id  — delete project
router
  .route("/:id")
  .get(authorize("admin", "manager", "developer"), projectController.getProjectById)
  .put(authorize("admin", "manager"), projectController.updateProject)
  .delete(authorize("admin", "manager"), projectController.deleteProject);

module.exports = router;
