const express = require("express");
const localAuthRoutes = require("../../routes/auth/local.routes");
const oauthRoutes = require("../../routes/auth/oauth.routes");

const router = express.Router();

router.use(localAuthRoutes);
router.use(oauthRoutes);

module.exports = router;
