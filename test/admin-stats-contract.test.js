const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("admin stats expose activeTasks instead of misleading activeProjects", () => {
  const statsHelper = readSource("utils", "stats-helper.js");

  assert.match(statsHelper, /const activeTasks = await Task\.countDocuments/, "stats should calculate activeTasks");
  assert.match(statsHelper, /activeTasks,/, "stats response should expose activeTasks");
  assert.doesNotMatch(statsHelper, /activeProjects/, "stats response should not expose activeProjects");
});

test("admin stats count task statuses that exist in the task model", () => {
  const statsHelper = readSource("utils", "stats-helper.js");
  const taskModel = readSource("models", "task.model.js");

  for (const status of ["todo", "in-progress", "under-review", "changes-requested"]) {
    assert.match(statsHelper, new RegExp(`"${status}"`), `stats should count ${status} as active`);
    assert.match(taskModel, new RegExp(`"${status}"`), `${status} should exist in Task status enum`);
  }

  for (const invalidStatus of ["pending", "in-review"]) {
    assert.doesNotMatch(statsHelper, new RegExp(`"${invalidStatus}"`), `stats should not query invalid status ${invalidStatus}`);
  }
});
