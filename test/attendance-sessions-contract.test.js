const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("attendance exposes agent-ready weekly daily-attendance endpoint", () => {
  const routes = readSource("modules", "attendance", "attendance.routes.js");

  assert.match(routes, /operationId:\s*getWeeklyAttendance/, "weekly attendance endpoint should have operationId");
  assert.match(routes, /\/attendance\/week/, "weekly attendance endpoint should be documented");
  assert.match(routes, /router\.get\("\/week"/, "weekly attendance endpoint should be mounted");

  for (const queryParam of ["weekStart", "page", "limit", "userId", "status", "search"]) {
    assert.match(routes, new RegExp(`name:\\s*${queryParam}`), `${queryParam} query parameter should be documented`);
  }

  for (const scope of ["workspace", "team", "self"]) {
    assert.match(routes, new RegExp(scope), `${scope} access scope should be documented`);
  }
});

test("attendance repository supports scoped weekly pagination", () => {
  const repository = readSource("modules", "attendance", "attendance.repository.js");

  assert.match(repository, /findWeeklyAttendance/, "repository should expose findWeeklyAttendance");
  assert.match(repository, /countDocuments/, "repository should count matching records for pagination");
  assert.match(repository, /\.skip\(/, "repository should support page offsets");
  assert.match(repository, /\.limit\(/, "repository should support page limits");
  assert.match(repository, /date:\s*\{\s*\$gte:\s*weekStart,\s*\$lte:\s*weekEnd\s*\}/, "repository should filter by week");
});

test("attendance service enforces admin, manager, and self scopes", () => {
  const service = readSource("modules", "attendance", "attendance.service.js");

  assert.match(service, /getAttendanceAccessScope/, "service should compute role access scope");
  assert.match(service, /user\.role === "admin"/, "admin should receive workspace scope");
  assert.match(service, /user\.role === "manager"/, "manager should receive team scope");
  assert.match(service, /manager:\s*userId/, "manager scope should query direct reports");
  assert.match(service, /accessScope:\s*"self"/, "employees should receive self scope");
  assert.match(service, /getWeeklyAttendance/, "service should expose getWeeklyAttendance");
});

test("weekly attendance response includes week and pagination metadata", () => {
  const controller = readSource("modules", "attendance", "attendance.controller.js");

  assert.match(controller, /getWeeklyAttendance/, "controller should expose getWeeklyAttendance");
  assert.match(controller, /records:\s*attendanceMapper\.toListResponse/, "controller should map attendance records");
  assert.match(controller, /pagination/, "controller response should include pagination metadata");
  assert.match(controller, /week/, "controller response should include week metadata");
  assert.match(controller, /accessScope/, "controller response should include access scope");
});
