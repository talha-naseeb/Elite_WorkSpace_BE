const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readBackend = (...segments) => readFileSync(path.join(root, "src", ...segments), "utf8");

test("integration controller validates Slack config before saving or testing", () => {
  const controller = readBackend("controllers", "integration.controller.js");

  assert.match(controller, /validateIntegrationType/);
  assert.match(controller, /validateSlackConfig/);
  assert.match(controller, /https:\/\/hooks\.slack\.com\//);
  assert.match(controller, /Webhook URL must start with https:\/\/hooks\.slack\.com\//);
});

test("integration changes are logged as workspace settings activity", () => {
  const controller = readBackend("controllers", "integration.controller.js");
  const activityModel = readBackend("models", "activity.model.js");
  const activityLogs = readFileSync(path.join(root, "..", "front-end", "src", "pages", "admin", "ActivityLogs.tsx"), "utf8");

  assert.match(controller, /const \{ logActivity \} = require\("\.\.\/utils\/activityLogger"\)/);
  assert.match(controller, /type:\s*"settings_update"/);
  assert.match(controller, /integration:\s*type/);
  assert.match(activityModel, /settings_update/);
  assert.match(activityLogs, /value:\s*"settings_update"/);
});

test("integration settings show explicit status indicators", () => {
  const settings = readFileSync(path.join(root, "..", "front-end", "src", "pages", "settings", "IntegrationSettings.tsx"), "utf8");

  assert.match(settings, /getIntegrationStatus/);
  assert.match(settings, /Needs Config/);
  assert.match(settings, /Not Configurable Yet/);
  assert.match(settings, /Ready/);
});
