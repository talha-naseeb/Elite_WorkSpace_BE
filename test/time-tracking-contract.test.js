const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");

const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");
const assertExists = (...segments) =>
  assert.ok(existsSync(path.join(srcRoot, ...segments)), `${segments.join("/")} should exist`);

test("time tracking exposes a dedicated module mounted under /api/v1/time-tracking", () => {
  for (const filePath of [
    ["modules", "time-tracking", "time-entry.model.js"],
    ["modules", "time-tracking", "time-tracking.routes.js"],
    ["modules", "time-tracking", "time-tracking.controller.js"],
    ["modules", "time-tracking", "time-tracking.service.js"],
    ["modules", "time-tracking", "time-tracking.repository.js"],
    ["modules", "time-tracking", "time-tracking.mapper.js"],
    ["modules", "time-tracking", "time-tracking.validation.js"],
  ]) {
    assertExists(...filePath);
  }

  const apiRoutes = readSource("api", "v1", "index.js");
  assert.match(apiRoutes, /timeTrackingRoutes/, "v1 router should import time tracking routes");
  assert.match(apiRoutes, /router\.use\("\/time-tracking",\s*timeTrackingRoutes\)/, "v1 router should mount /time-tracking");
});

test("time entry model separates work sessions from attendance presence", () => {
  const model = readSource("modules", "time-tracking", "time-entry.model.js");

  for (const field of ["user", "workspace", "project", "task", "clockInAt", "clockOutAt", "durationMinutes", "source", "notes", "status"]) {
    assert.match(model, new RegExp(`${field}:`), `TimeEntry should include ${field}`);
  }

  assert.match(model, /"manual"/, "source enum should support manual entries");
  assert.match(model, /"desktop-app"/, "source enum should support desktop app entries");
  assert.match(model, /"browser"/, "source enum should support browser entries");
  assert.match(model, /"active"/, "status enum should support active sessions");
  assert.match(model, /"completed"/, "status enum should support completed sessions");
  assert.match(model, /partialFilterExpression:\s*\{\s*status:\s*"active"\s*\}/, "model should prevent multiple active sessions per user");
});

test("time tracking routes are agent-ready and cover active session, history, workspace, and summary", () => {
  const routes = readSource("modules", "time-tracking", "time-tracking.routes.js");

  for (const operationId of [
    "clockInTimeTracking",
    "clockOutTimeTracking",
    "getActiveTimeEntry",
    "getMyTimeEntries",
    "getWorkspaceTimeEntries",
    "getTimeTrackingSummary",
  ]) {
    assert.match(routes, new RegExp(`operationId:\\s*${operationId}`), `${operationId} should be documented`);
  }

  for (const route of [
    /router\.post\("\/clock-in"/,
    /router\.post\("\/clock-out"/,
    /router\.get\("\/active"/,
    /router\.get\("\/my-history"/,
    /router\.get\("\/workspace"/,
    /router\.get\("\/summary"/,
  ]) {
    assert.match(routes, route);
  }
});

test("attendance clock routes remain as daily attendance compatibility aliases", () => {
  const attendanceService = readSource("modules", "attendance", "attendance.service.js");

  assert.doesNotMatch(attendanceService, /timeTrackingService\.clockIn/, "attendance check-in should not start task timers");
  assert.match(attendanceService, /clockIn:\s*checkIn/, "attendance clock-in alias should point to check-in");
  assert.match(attendanceService, /clockOut:\s*checkOut/, "attendance clock-out alias should point to check-out");
});
