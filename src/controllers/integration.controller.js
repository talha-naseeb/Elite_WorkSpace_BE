const Integration = require("../models/integration.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/helpers/asyncHandler");
const { sendSlackNotification } = require("../utils/slack");
const { logActivity } = require("../utils/activityLogger");

const ALLOWED_INTEGRATION_TYPES = ["slack", "teams", "github", "google_calendar"];
const ALLOWED_INTEGRATION_STATUSES = ["active", "inactive"];

const validateIntegrationType = (type) => {
  if (!ALLOWED_INTEGRATION_TYPES.includes(type)) {
    throw ApiError.badRequest("Invalid integration type");
  }
};

const validateIntegrationStatus = (status) => {
  if (!ALLOWED_INTEGRATION_STATUSES.includes(status)) {
    throw ApiError.badRequest("Invalid integration status");
  }
};

const validateSlackConfig = (config = {}) => {
  if (!config.webhookUrl || !config.webhookUrl.startsWith("https://hooks.slack.com/")) {
    throw ApiError.badRequest("Webhook URL must start with https://hooks.slack.com/");
  }
};

const logIntegrationActivity = ({ req, type, action }) =>
  logActivity({
    type: "settings_update",
    message: `${type} integration ${action}`,
    userId: req.user._id,
    adminRef: req.user._id,
    metadata: {
      integration: type,
      action,
    },
    io: req.app.get("io"),
  });

// @desc    Get all active integrations for the workspace
// @route   GET /api/integrations
// @access  Admin only
exports.getIntegrations = asyncHandler(async (req, res) => {
  const adminId = req.user._id;
  const integrations = await Integration.find({ adminRef: adminId });
  
  const response = ApiResponse.success("Integrations retrieved", { integrations });
  res.status(response.statusCode).json(response);
});

// @desc    Toggle integration status
// @route   POST /api/integrations/toggle
// @access  Admin only
exports.toggleIntegration = asyncHandler(async (req, res) => {
  const { type, status } = req.body;
  const adminId = req.user._id;

  validateIntegrationType(type);
  validateIntegrationStatus(status);

  let integration = await Integration.findOne({ adminRef: adminId, type });

  if (integration) {
    integration.status = status;
    await integration.save();
  } else if (status === "active") {
    integration = await Integration.create({
      adminRef: adminId,
      type,
      status: "active",
    });
  }

  await logIntegrationActivity({ req, type, action: status });

  const response = ApiResponse.success(`${type} integration ${status}`, { integration });
  res.status(response.statusCode).json(response);
});

// @desc    Test integration webhook (e.g., send test Slack message)
// @route   POST /api/integrations/:type/test
// @access  Admin only
exports.testWebhook = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const adminId = req.user._id;

  validateIntegrationType(type);
  if (type !== "slack") throw ApiError.badRequest("Webhook test only supported for Slack");

  const integration = await Integration.findOne({ adminRef: adminId, type, status: "active" });
  if (!integration?.config?.webhookUrl) {
    throw ApiError.badRequest("No webhook URL configured. Save a webhook URL first.");
  }
  validateSlackConfig(integration.config);

  const result = await sendSlackNotification(
    integration.config.webhookUrl,
    "✅ Test message from *Workspace Elite* — your Slack integration is working!"
  );

  if (!result.success) throw ApiError.badRequest(`Webhook test failed: ${result.error}`);

  await logIntegrationActivity({ req, type, action: "tested" });

  const response = ApiResponse.success("Test message sent to Slack successfully");
  res.status(response.statusCode).json(response);
});

// @desc    Update integration config (e.g., webhook URL)
// @route   PATCH /api/integrations/:type
// @access  Admin only
exports.updateConfig = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { config } = req.body;
  const adminId = req.user._id;

  validateIntegrationType(type);
  if (type === "slack") validateSlackConfig(config);

  const integration = await Integration.findOneAndUpdate(
    { adminRef: adminId, type },
    { config },
    { new: true }
  );

  if (!integration) throw ApiError.notFound("Integration not found");

  await logIntegrationActivity({ req, type, action: "configured" });

  const response = ApiResponse.success("Integration configuration updated", { integration });
  res.status(response.statusCode).json(response);
});
