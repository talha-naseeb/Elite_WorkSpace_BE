const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "../..");
const readWorkspace = (...segments) => readFileSync(path.join(workspaceRoot, ...segments), "utf8");
const workspaceFileExists = (...segments) => existsSync(path.join(workspaceRoot, ...segments));

test("admin dashboard uses live activity and time tracking data", () => {
  const dashboard = readWorkspace("front-end", "src", "pages", "admin", "AdminDashboard.tsx");
  const activityService = readWorkspace("front-end", "src", "services", "activity.service.ts");
  const activityLogs = readWorkspace("front-end", "src", "pages", "admin", "ActivityLogs.tsx");
  const routes = readWorkspace("front-end", "src", "routes", "AppRoutes.tsx");
  const sidebar = readWorkspace("front-end", "src", "components", "layout", "DashboardSidebar.tsx");
  const layout = readWorkspace("front-end", "src", "components", "layout", "DashboardLayout.tsx");
  assert.equal(
    workspaceFileExists("front-end", "src", "services", "analytics.service.ts"),
    true,
    "frontend should expose an analytics service"
  );
  const analyticsService = readWorkspace("front-end", "src", "services", "analytics.service.ts");

  assert.doesNotMatch(
    dashboard,
    /const recentActivity = \[/,
    "dashboard should not render a static recentActivity fixture"
  );
  assert.match(
    dashboard,
    /activityService\.getActivities/,
    "dashboard should fetch activities through the existing activity service"
  );
  assert.match(
    activityService,
    /api\.get\(['"]\/activities['"]/,
    "activity service should fetch live workspace activities"
  );
  assert.match(
    activityService,
    /params/,
    "activity service should support query params for limits and grouping"
  );
  for (const field of ["page", "type", "search", "from", "to"]) {
    assert.match(activityService, new RegExp(`${field}\\?:`), `activity service should type ${field} query param`);
  }
  assert.match(
    dashboard,
    /queryKey:\s*\[\s*["']recentActivities["']\s*\]/,
    "dashboard should query recent activities"
  );
  assert.match(
    dashboard,
    /getActivities\(\{\s*limit:\s*5\s*\}\)/,
    "admin dashboard should show only five recent activity items"
  );
  assert.match(
    dashboard,
    /navigate\(["']\/admin\/logs["']\)/,
    "admin dashboard View All should navigate to activity logs"
  );
  assert.match(
    dashboard,
    /analyticsService\.getTeamEfficiency/,
    "dashboard should fetch team efficiency through the analytics service"
  );
  assert.match(
    analyticsService,
    /api\.get\(['"]\/analytics\/team-efficiency['"]/,
    "analytics service should fetch live team efficiency data"
  );
  assert.match(
    layout,
    /queryKey:\s*\[\s*["']recentActivities["']\s*\]/,
    "real-time activity events should refresh recent activities"
  );
  assert.match(
    layout,
    /queryKey:\s*\[\s*["']teamEfficiency["']\s*\]/,
    "real-time activity and time tracking events should refresh team efficiency"
  );
  assert.doesNotMatch(
    layout,
    /toast\(activity\.message/,
    "activity toasts should not display long raw audit messages"
  );
  assert.match(
    layout,
    /getActivityToastMessage/,
    "activity toasts should use compact, readable labels"
  );
  assert.match(
    layout,
    /maxWidth:\s*["']260px["']/,
    "activity toasts should stay visually small"
  );
  assert.match(routes, /path="\/manager\/logs"/, "manager should have an activity logs route");
  assert.match(routes, /<ActivityLogs role="manager" \/>/, "manager activity route should render ActivityLogs in manager mode");
  assert.match(sidebar, /path:\s*"\/manager\/logs"/, "manager sidebar should link to activity logs");
  assert.match(sidebar, /title:\s*"Analytics"[\s\S]*path:\s*"\/admin\/analytics"/, "admin sidebar should keep one analytics entry");
  assert.doesNotMatch(sidebar, /title:\s*"Insights"[\s\S]*path:\s*"\/admin\/insights"/, "admin sidebar should not show duplicate insights and analytics entries");
  assert.match(activityLogs, /role = "admin"/, "activity logs page should default to admin role");
  assert.match(activityLogs, /pagination/, "activity logs page should render pagination metadata");
  assert.match(activityLogs, /setPage/, "activity logs page should support page navigation");
  assert.match(activityLogs, /type,/, "activity logs page should send type filter to the API");
  assert.match(activityLogs, /userId:/, "activity logs page should send user filter to the API");
  assert.match(activityLogs, /useAuth/, "activity logs page should include the current user in filter options");
  assert.match(activityLogs, /currentUserOption/, "activity logs page should expose the current admin or manager as a user filter option");
  assert.match(activityLogs, /<table/, "activity logs should render as a table");
  for (const header of ["Name", "Description", "Task", "Date"]) {
    assert.match(activityLogs, new RegExp(`>${header}<`), `activity table should include ${header} column`);
  }
  assert.match(activityLogs, /border-t border-border\/50[\s\S]*Previous[\s\S]*Next/, "pagination controls should stay in the bottom footer");
  assert.match(activityLogs, /border-t border-border\/50[\s\S]*Page size[\s\S]*Previous[\s\S]*Next/, "page size selector should stay in the bottom pagination footer");
  assert.match(activityLogs, /DatePickerCalendar/, "activity logs should use the shared calendar component for date filters");
  assert.match(activityLogs, /PopoverTrigger/, "activity logs date filters should use the shared popover calendar pattern");
  assert.doesNotMatch(activityLogs, /type="date"/, "activity logs should not use raw browser date inputs");
});
