const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const readBackend = (...segments) => readFileSync(path.join(root, "src", ...segments), "utf8");
const readWorkspace = (...segments) => readFileSync(path.join(workspaceRoot, ...segments), "utf8");
const existsBackend = (...segments) => existsSync(path.join(root, "src", ...segments));

test("attendance and time-tracking domains stay independent behind a workflow orchestrator", () => {
  const attendanceService = readBackend("modules", "attendance", "attendance.service.js");
  const timeTrackingService = readBackend("modules", "time-tracking", "time-tracking.service.js");
  const workflow = readBackend("services", "workflows", "time-workflow.service.js");

  assert.doesNotMatch(attendanceService, /time-tracking|timeTrackingService/, "attendance service must not import time tracking");
  assert.doesNotMatch(timeTrackingService, /attendance/, "time tracking service must not import attendance");
  assert.match(workflow, /attendanceService/, "workflow should coordinate attendance");
  assert.match(workflow, /timeTrackingService/, "workflow should coordinate time tracking");
  assert.match(workflow, /startTaskTimerWorkflow/, "workflow should expose timer start orchestration");
  assert.match(workflow, /checkOutAttendanceWorkflow/, "workflow should expose attendance checkout orchestration");
});

test("workspace policy module exists and is mounted", () => {
  for (const file of [
    ["modules", "workspace-policy", "workspace-policy.model.js"],
    ["modules", "workspace-policy", "workspace-policy.repository.js"],
    ["modules", "workspace-policy", "workspace-policy.service.js"],
    ["modules", "workspace-policy", "workspace-policy.controller.js"],
    ["modules", "workspace-policy", "workspace-policy.routes.js"],
  ]) {
    assert.ok(existsBackend(...file), `${file.join("/")} should exist`);
  }

  const model = readBackend("modules", "workspace-policy", "workspace-policy.model.js");
  const api = readBackend("api", "v1", "index.js");
  assert.match(model, /workspaceId.*unique/s, "policy should have unique workspaceId");
  assert.match(model, /standardHoursPerDay.*8/s, "policy should define standard hours");
  assert.match(model, /overtimeThresholdMinutes.*480/s, "policy should define overtime threshold");
  assert.match(model, /shiftStartTime.*09:00/s, "policy should define shift start");
  assert.match(model, /attendanceMode:/, "policy should define attendanceMode");
  assert.match(model, /enum:\s*\[\s*"flexible",\s*"fixed"\s*\]/, "attendanceMode should expose flexible and fixed modes");
  assert.match(model, /default:\s*"fixed"/, "attendanceMode should default to fixed");
  assert.match(api, /workspacePolicyRoutes/, "v1 API should import workspace policy routes");
  assert.match(api, /router\.use\("\/workspace-policy"/, "v1 API should mount workspace policy routes");
});

test("attendance model is session-based and state-machine ready", () => {
  const model = readBackend("models", "attendance.model.js");

  for (const field of [
    "userId",
    "workspaceId",
    "shiftDate",
    "currentState",
    "attendanceStatus",
    "approvalStatus",
    "sessions",
    "totalWorkMinutes",
    "totalBreakMinutes",
    "adjustmentRequest",
  ]) {
    assert.match(model, new RegExp(`${field}:`), `AttendanceDay should include ${field}`);
  }

  for (const value of ["offline", "working", "break", "checked_out", "present", "absent", "half_day", "leave", "late"]) {
    assert.match(model, new RegExp(`"${value}"`), `AttendanceDay should support ${value}`);
  }

  assert.match(model, /attendanceSchema\.index\(\s*\{\s*userId:\s*1,\s*workspaceId:\s*1,\s*shiftDate:\s*1\s*\}/);
  assert.match(model, /unique:\s*true/, "AttendanceDay uniqueness should be enforced");
  assert.match(model, /partialFilterExpression:\s*\{[\s\S]*userId:\s*\{\s*\$exists:\s*true\s*\}[\s\S]*workspaceId:\s*\{\s*\$exists:\s*true\s*\}[\s\S]*shiftDate:\s*\{\s*\$exists:\s*true\s*\}/);
});

test("attendance service implements valid state transitions and timezone shiftDate", () => {
  const service = readBackend("modules", "attendance", "attendance.service.js");
  const timezone = readBackend("shared", "utils", "timezone.js");

  for (const fn of ["checkIn", "startBreak", "endBreak", "checkOut", "getToday", "getMyWeek", "getTeamWeek", "getWorkspaceWeek"]) {
    assert.match(service, new RegExp(`${fn}\\s*=`), `attendance service should expose ${fn}`);
  }

  assert.match(service, /INVALID_STATE_TRANSITION/, "invalid transitions should expose structured code");
  assert.match(service, /handleFixedCheckIn/, "fixed attendance mode should have an explicit check-in handler");
  assert.match(service, /handleFlexibleCheckIn/, "flexible attendance mode should have an explicit check-in handler");
  assert.match(service, /handleFixedCheckOut/, "fixed attendance mode should have an explicit check-out handler");
  assert.match(service, /handleFlexibleCheckOut/, "flexible attendance mode should have an explicit check-out handler");
  assert.match(service, /attendanceMode === "fixed"/, "service should branch fixed mode rules from policy");
  assert.match(service, /attendanceMode === "flexible"/, "service should branch flexible mode rules from policy");
  assert.match(service, /currentState = "offline"/, "flexible checkout should return attendance to offline");
  assert.match(service, /calculateImplicitBreakMinutes/, "flexible mode should compute implicit breaks from session gaps");
  assert.match(service, /allowedActions/, "service should expose mode-aware allowed next actions");
  assert.match(service, /currentState/, "invalid transition errors should include currentState");
  assert.match(service, /totalWorkMinutes/, "service should compute work totals");
  assert.match(service, /totalBreakMinutes/, "service should compute break totals");
  assert.match(timezone, /getShiftDate/, "timezone helper should derive shiftDate");
  assert.match(timezone, /Intl\.DateTimeFormat/, "shiftDate should be timezone-derived");
});

test("attendance routes expose transition and scoped report endpoints", () => {
  const routes = readBackend("modules", "attendance", "attendance.routes.js");

  for (const route of [
    /router\.post\("\/check-in"/,
    /router\.post\("\/start-break"/,
    /router\.post\("\/end-break"/,
    /router\.post\("\/check-out"/,
    /router\.get\("\/today"/,
    /router\.get\("\/my-week"/,
    /router\.get\("\/team-week"/,
    /router\.get\("\/workspace-week"/,
  ]) {
    assert.match(routes, route);
  }

  for (const operationId of [
    "checkInAttendance",
    "startAttendanceBreak",
    "endAttendanceBreak",
    "checkOutAttendance",
    "getTodayAttendance",
    "getMyWeekAttendance",
    "getTeamWeekAttendance",
    "getWorkspaceWeekAttendance",
  ]) {
    assert.match(routes, new RegExp(`operationId:\\s*${operationId}`));
  }

  assert.match(routes, /attendanceMode/, "attendance routes should document policy-driven attendanceMode");
  assert.match(routes, /allowedActions/, "attendance routes should document mode-aware allowedActions");
});

test("time entry model is a flat task timer session model", () => {
  const model = readBackend("modules", "time-tracking", "time-entry.model.js");

  for (const field of ["taskId", "userId", "workspaceId", "projectId", "startAt", "endAt", "timezone", "durationMinutes", "notes", "isActive"]) {
    assert.match(model, new RegExp(`${field}:`), `TimeEntry should include ${field}`);
  }

  assert.doesNotMatch(model, /sessions:\s*\[/, "TimeEntry should not embed sessions");
  assert.match(model, /partialFilterExpression:\s*\{\s*isActive:\s*true\s*\}/, "active timer uniqueness should be enforced");
});

test("time tracking routes expose start-stop APIs and session history APIs", () => {
  const routes = readBackend("modules", "time-tracking", "time-tracking.routes.js");
  const service = readBackend("modules", "time-tracking", "time-tracking.service.js");

  for (const route of [
    /router\.post\("\/start"/,
    /router\.post\("\/stop"/,
    /router\.get\("\/active"/,
    /router\.get\("\/my-history"/,
    /router\.get\("\/task\/:taskId"/,
    /router\.get\("\/workspace"/,
  ]) {
    assert.match(routes, route);
  }

  assert.match(service, /startTimer/, "service should expose startTimer");
  assert.match(service, /stopTimer/, "service should expose stopTimer");
  assert.match(service, /findActiveByUser/, "service should enforce one active timer");
  assert.match(service, /entry\.userId\s*=\s*entry\.userId\s*\|\|\s*entry\.user/, "legacy entries should hydrate userId before validation");
  assert.match(service, /entry\.workspaceId\s*=\s*entry\.workspaceId\s*\|\|\s*entry\.workspace/, "legacy entries should hydrate workspaceId before validation");
  assert.match(service, /entry\.startAt\s*=\s*entry\.startAt\s*\|\|\s*entry\.clockInAt/, "legacy entries should hydrate startAt before validation");
});

test("reports module is mounted and aggregates attendance plus task time", () => {
  for (const file of [
    ["modules", "reports", "reports.routes.js"],
    ["modules", "reports", "reports.controller.js"],
    ["modules", "reports", "reports.service.js"],
  ]) {
    assert.ok(existsBackend(...file), `${file.join("/")} should exist`);
  }

  const service = readBackend("modules", "reports", "reports.service.js");
  const api = readBackend("api", "v1", "index.js");
  for (const field of ["attendanceMinutes", "taskMinutes", "breakMinutes", "idleMinutes", "overtimeMinutes"]) {
    assert.match(service, new RegExp(field), `reports should compute ${field}`);
  }
  assert.match(service, /calculateImplicitBreakMinutes/, "reports should compute flexible-mode implicit breaks");
  assert.match(service, /attendanceMode === "flexible"/, "reports should branch flexible break calculations");
  assert.match(api, /reportsRoutes/, "v1 API should import reports routes");
  assert.match(api, /router\.use\("\/reports"/, "v1 API should mount reports routes");
});

test("frontend services and top bar use attendance state machine and timezone payloads", () => {
  const attendanceService = readWorkspace("front-end", "src", "services", "attendance.service.ts");
  const workspacePolicyService = readWorkspace("front-end", "src", "services", "workspacePolicy.service.ts");
  const timeTrackingService = readWorkspace("front-end", "src", "services", "timeTracking.service.ts");
  const layout = readWorkspace("front-end", "src", "components", "layout", "DashboardLayout.tsx");
  const header = readWorkspace("front-end", "src", "components", "layout", "DashboardHeader.tsx");
  const topBarSource = `${layout}\n${header}`;
  const settings = readWorkspace("front-end", "src", "pages", "settings", "IntegrationSettings.tsx");

  for (const fn of ["checkIn", "startBreak", "endBreak", "checkOut", "getToday", "getMyWeek", "getTeamWeek", "getWorkspaceWeek"]) {
    assert.match(attendanceService, new RegExp(`${fn}:`), `frontend attendance service should expose ${fn}`);
  }
  assert.match(attendanceService, /attendanceMode/, "frontend attendance types should include attendanceMode");
  assert.match(attendanceService, /allowedActions/, "frontend attendance types should include allowedActions");
  assert.match(workspacePolicyService, /attendanceMode:\s*"flexible"\s*\|\s*"fixed"/, "frontend policy service should type attendanceMode");
  assert.match(workspacePolicyService, /getPolicy:/, "frontend policy service should fetch workspace policy");
  assert.match(workspacePolicyService, /updatePolicy:/, "frontend policy service should update workspace policy");
  assert.match(attendanceService, /resolvedOptions\(\)\.timeZone/, "attendance service should send browser timezone");
  assert.match(timeTrackingService, /startTimer/, "time tracking service should expose startTimer");
  assert.match(timeTrackingService, /stopTimer/, "time tracking service should expose stopTimer");
  assert.match(timeTrackingService, /resolvedOptions\(\)\.timeZone/, "time tracking service should send browser timezone");
  assert.match(layout, /attendanceMode === "flexible"/, "top bar should render flexible attendance controls");
  assert.match(layout, /attendanceMode === "fixed"/, "top bar should render fixed attendance controls");
  assert.match(settings, /Attendance Settings/, "admin settings should expose attendance settings");
  assert.match(settings, /Flexible/, "admin settings should expose flexible option");
  assert.match(settings, /Fixed/, "admin settings should expose fixed option");
  for (const label of ["Check In", "Start Break", "End Break", "Check Out", "Task Timer"]) {
    assert.match(topBarSource, new RegExp(label), `top bar should render ${label}`);
  }
});
