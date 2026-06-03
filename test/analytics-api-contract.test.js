const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");
const sourceExists = (...segments) => existsSync(path.join(srcRoot, ...segments));

test("analytics routes expose role-aware team efficiency API", () => {
  const indexRoutes = readSource("api", "v1", "index.js");
  assert.equal(
    sourceExists("modules", "analytics", "analytics.routes.js"),
    true,
    "analytics routes module should exist",
  );
  assert.equal(
    sourceExists("modules", "analytics", "analytics.service.js"),
    true,
    "analytics service module should exist",
  );

  const analyticsRoutes = readSource("modules", "analytics", "analytics.routes.js");
  const analyticsService = readSource("modules", "analytics", "analytics.service.js");

  assert.match(indexRoutes, /router\.use\("\/analytics",\s*analyticsRoutes\)/, "v1 router should mount analytics routes");
  assert.match(
    analyticsRoutes,
    /router\.get\("\/team-efficiency",\s*authorize\("admin",\s*"manager"\),\s*analyticsController\.getTeamEfficiency\)/,
    "team efficiency should be limited to admins and managers",
  );
  assert.match(
    analyticsService,
    /efficiencyPercent/,
    "team efficiency response should include an efficiencyPercent metric",
  );
  assert.match(
    analyticsService,
    /completedTasksCount/,
    "team efficiency response should include completed task counts",
  );
  assert.match(
    analyticsService,
    /trackedMinutes/,
    "team efficiency response should include tracked time",
  );
  assert.match(
    analyticsService,
    /scope:\s*user\.role === "manager" \? "team" : "workspace"/,
    "team efficiency should report whether the caller is seeing team or workspace scope",
  );
  assert.match(
    analyticsService,
    /Task\.find\(\{\s*\$and:/,
    "team efficiency task metrics should be scoped to the requested date range",
  );
  assert.match(
    analyticsService,
    /completedAt:\s*\{\s*\$gte:\s*startAt/,
    "team efficiency should include recently completed tasks in the date range",
  );
});

test("activities API supports user filtering, limits, and grouping by user", () => {
  const activityController = readSource("controllers", "activity.controller.js");

  assert.match(activityController, /req\.query\.limit/, "activities should accept a limit query parameter");
  assert.match(activityController, /req\.query\.page/, "activities should accept a page query parameter");
  assert.match(activityController, /\.skip\(/, "activities should apply server-side pagination offset");
  assert.match(activityController, /countDocuments/, "activities should count total matching records");
  assert.match(activityController, /pagination/, "activities should return pagination metadata");
  assert.match(activityController, /req\.query\.userId/, "activities should accept a userId query parameter");
  assert.match(activityController, /req\.query\.type/, "activities should accept an activity type filter");
  assert.match(activityController, /req\.query\.search/, "activities should accept a search filter");
  assert.match(activityController, /req\.query\.from/, "activities should accept a from date filter");
  assert.match(activityController, /req\.query\.to/, "activities should accept a to date filter");
  assert.match(activityController, /setHours\(23,\s*59,\s*59,\s*999\)/, "to date filter should include the full selected day");
  assert.match(activityController, /\$regex/, "activities should search activity messages and user matches");
  assert.match(activityController, /mongoose\.Types\.ObjectId\.isValid/, "activities should validate userId before querying");
  assert.match(activityController, /req\.query\.groupBy === "user"/, "activities should support groupBy=user");
  assert.match(activityController, /allMatchingActivities/, "grouped activity counts should use all matching rows, not just the current page");
  assert.match(activityController, /activityByUser/, "grouped activity response should include activityByUser");
  assert.match(
    activityController,
    /user\.role === "manager"/,
    "activities should restrict manager responses to their team scope",
  );
});

test("workspace actions write activity rows for the live recent activity feed", () => {
  const taskController = readSource("controllers", "task.controller.js");
  const managerController = readSource("controllers", "manager.controller.js");

  assert.match(taskController, /logActivity/, "task actions should write activity rows");
  assert.match(taskController, /type:\s*"task_created"/, "task creation should appear in recent activity");
  assert.match(taskController, /type:\s*"task_updated"/, "task updates should appear in recent activity");
  assert.match(managerController, /logActivity/, "user management actions should write activity rows");
  assert.match(managerController, /type:\s*"user_added"/, "employee creation should appear in recent activity");
});
