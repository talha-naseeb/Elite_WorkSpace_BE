const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("project detail response includes tracked time summary and project activity", () => {
  const projectController = readSource("controllers", "project.controller.js");

  assert.match(projectController, /TimeEntry/, "project detail should aggregate time entries server-side");
  assert.match(projectController, /Activity/, "project detail should fetch project-scoped activity server-side");
  assert.match(projectController, /timeSummary/, "project detail payload should include a timeSummary object");
  assert.match(projectController, /recentActivity/, "project detail payload should include recentActivity rows");
  assert.match(projectController, /trackedMinutesByTask/, "project detail should expose per-task tracked minutes");
});

test("project and task activity metadata includes project references", () => {
  const activityModel = readSource("models", "activity.model.js");
  const projectController = readSource("controllers", "project.controller.js");
  const taskController = readSource("controllers", "task.controller.js");

  assert.match(activityModel, /project_created/, "activity model should allow project creation activity");
  assert.match(activityModel, /project_updated/, "activity model should allow project update activity");
  assert.match(activityModel, /project_deleted/, "activity model should allow project deletion activity");
  assert.match(projectController, /type:\s*"project_created"/, "project creation should write activity");
  assert.match(projectController, /type:\s*"project_updated"/, "project updates should write activity");
  assert.match(projectController, /type:\s*"project_deleted"/, "project deletion should write activity");
  assert.match(taskController, /projectId:\s*task\.projectRef/, "task activity metadata should carry projectId");
});
