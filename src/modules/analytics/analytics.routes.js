const express = require("express");
const analyticsController = require("./analytics.controller");
const authenticate = require("../../middleware/authenticate");
const validateVerifiedEmail = require("../../middleware/validateVerifiedEmail");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

router.use(authenticate, validateVerifiedEmail);
router.get("/team-efficiency", authorize("admin", "manager"), analyticsController.getTeamEfficiency);

module.exports = router;
