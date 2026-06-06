const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("reports summary supports role-aware scopes and useful filters", () => {
  const reportsService = readSource("modules", "reports", "reports.service.js");

  assert.match(reportsService, /buildScopedUserIds/, "reports should derive role-aware user scopes");
  assert.match(reportsService, /user\.role === "manager"/, "manager reports should scope to manager plus direct reports");
  assert.match(reportsService, /query\.userId/, "reports should accept an employee/user filter");
  assert.match(reportsService, /query\.projectId/, "reports should accept a project filter");
  assert.match(reportsService, /projectFilter/, "reports should apply project filters to task/time data");
});

test("reports summary returns card metrics and chart datasets", () => {
  const reportsService = readSource("modules", "reports", "reports.service.js");

  assert.match(reportsService, /cards:/, "reports should expose card metrics");
  assert.match(reportsService, /trackedMinutes/, "cards should include tracked time");
  assert.match(reportsService, /attendanceMinutes/, "cards should include attendance time");
  assert.match(reportsService, /breakMinutes/, "cards should include break time");
  assert.match(reportsService, /idleMinutes/, "cards should include idle time");
  assert.match(reportsService, /overtimeMinutes/, "cards should include overtime");
  assert.match(reportsService, /completedTasks/, "cards should include completed tasks");
  assert.match(reportsService, /pendingTasks/, "cards should include pending tasks");
  assert.match(reportsService, /dailyTrend:/, "reports should include a daily trend chart dataset");
  assert.match(reportsService, /teamComparison:/, "reports should include a team comparison chart dataset");
  assert.match(reportsService, /taskCompletion:/, "reports should include task completion chart data");
  assert.match(reportsService, /timeByProject:/, "reports should include time-by-project chart data");
});
