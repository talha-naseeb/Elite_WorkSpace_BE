const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const readSource = (...segments) => readFileSync(path.join(root, ...segments), "utf8");

test("dashboard top bar separates daily attendance controls from global task timer", () => {
  const layout = readSource("front-end", "src", "components", "layout", "DashboardLayout.tsx");

  assert.match(layout, /attendanceService/, "top bar should use attendanceService for daily presence");
  assert.match(layout, /Check in/, "top bar should render a Check in button");
  assert.match(layout, /Check out/, "top bar should render a Check out button");
  assert.match(layout, /Daily Attendance/, "attendance section should be visually labeled");
  assert.match(layout, /Task Timer/, "task timer section should be visually labeled");
  assert.match(layout, /activeEntry\?\.task\?\.title/, "global timer should show the active task name");
  assert.doesNotMatch(layout, /timeTrackingService\.clockIn/, "top bar should not start free-form task timers");
  assert.match(layout, /timeTrackingService\.clockOut/, "top bar should still stop the active task timer");
});

test("task board cards expose task timer controls tied to task ids", () => {
  const board = readSource("front-end", "src", "pages", "tasks", "components", "TaskBoard.tsx");

  assert.match(board, /onStartTimer/, "task board should accept a start timer callback");
  assert.match(board, /onStopTimer/, "task board should accept a stop timer callback");
  assert.match(board, /activeTimeEntry/, "task board should know which task is actively tracked");
  assert.match(board, /Start timer/, "task cards should render Start timer");
  assert.match(board, /Stop/, "active task card should render Stop");
});

test("task page owns timer mutations and passes them to board and table views", () => {
  const page = readSource("front-end", "src", "pages", "tasks", "TasksPage.tsx");
  const table = readSource("front-end", "src", "pages", "tasks", "components", "TaskTable.tsx");

  assert.match(page, /timeTrackingService\.clockIn\(\{\s*taskId:/, "task page should start timers with taskId");
  assert.match(page, /timeTrackingService\.clockOut/, "task page should stop active timers");
  assert.match(page, /activeTimeEntry/, "task page should fetch the active time entry");
  assert.match(table, /Start timer/, "task table should render Start timer");
  assert.match(table, /onStartTimer/, "task table should accept a start timer callback");
  assert.match(table, /onStopTimer/, "task table should accept a stop timer callback");
});
