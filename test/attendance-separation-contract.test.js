const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("attendance model represents one daily presence record per user and workspace", () => {
  const model = readSource("models", "attendance.model.js");

  for (const field of ["user", "workspace", "date", "checkInAt", "checkOutAt", "totalMinutes", "status", "closedBy", "closedReason"]) {
    assert.match(model, new RegExp(`${field}:`), `Attendance should include ${field}`);
  }

  for (const status of ["present", "absent", "half-day", "leave", "incomplete"]) {
    assert.match(model, new RegExp(`"${status}"`), `Attendance should support ${status}`);
  }

  assert.match(
    model,
    /attendanceSchema\.index\(\{\s*user:\s*1,\s*workspace:\s*1,\s*date:\s*1\s*\},\s*\{\s*unique:\s*true\s*\}\)/,
    "Attendance should enforce one record per user/workspace/date"
  );
});

test("attendance routes expose daily check-in, check-out, manual close, and weekly reports", () => {
  const routes = readSource("modules", "attendance", "attendance.routes.js");

  for (const operationId of [
    "checkInAttendance",
    "checkOutAttendance",
    "manualCloseAttendance",
    "getWeeklyAttendance",
  ]) {
    assert.match(routes, new RegExp(`operationId:\\s*${operationId}`), `${operationId} should be documented`);
  }

  for (const route of [
    /router\.post\("\/check-in"/,
    /router\.post\("\/check-out"/,
    /router\.patch\("\/:id\/manual-close"/,
    /router\.get\("\/week"/,
    /router\.post\("\/clock-in"/,
    /router\.post\("\/clock-out"/,
  ]) {
    assert.match(routes, route);
  }
});

test("attendance service owns attendance records and only auto-stops task timers on check-out", () => {
  const service = readSource("modules", "attendance", "attendance.service.js");

  assert.match(service, /checkIn/, "attendance service should expose checkIn");
  assert.match(service, /checkOut/, "attendance service should expose checkOut");
  assert.match(service, /manualClose/, "attendance service should expose manualClose");
  assert.match(service, /getWeeklyAttendance/, "attendance service should expose getWeeklyAttendance");
  assert.doesNotMatch(service, /timeTrackingService\.clockIn/, "attendance check-in should not create TimeEntry records");
  assert.match(service, /stopActiveEntryForAttendanceCheckout/, "attendance check-out should auto-stop active task timer");
});

test("weekly attendance response includes role scope, week, pagination, and summary metadata", () => {
  const controller = readSource("modules", "attendance", "attendance.controller.js");

  assert.match(controller, /getWeeklyAttendance/, "controller should expose getWeeklyAttendance");
  assert.match(controller, /records:\s*attendanceMapper\.toListResponse/, "controller should map records");
  assert.match(controller, /pagination/, "controller should include pagination");
  assert.match(controller, /week/, "controller should include week metadata");
  assert.match(controller, /accessScope/, "controller should include access scope");
  assert.match(controller, /summary/, "controller should include weekly summary");
});

test("time tracking exposes internal attendance checkout stop without touching attendance records", () => {
  const service = readSource("modules", "time-tracking", "time-tracking.service.js");

  assert.match(service, /stopActiveEntryForAttendanceCheckout/, "time tracking should expose an internal auto-stop helper");
  assert.doesNotMatch(service, /ensureAttendanceClockIn/, "time tracking should not update attendance on task timer start");
  assert.doesNotMatch(service, /ensureAttendanceClockOut/, "time tracking should not update attendance on task timer stop");
  assert.doesNotMatch(service, /attendanceRepository/, "time tracking should not depend on attendance repository");
});
