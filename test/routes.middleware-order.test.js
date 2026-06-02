const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routesDir = path.resolve(__dirname, "../src");

const readRoute = (...segments) => readFileSync(path.join(routesDir, ...segments), "utf8");

test("top-level API router does not verify email before authentication", () => {
  const indexRoutes = readRoute("api", "v1", "index.js");

  for (const mountPath of ["/tasks", "/super-admin", "/admin", "/attendance", "/integrations"]) {
    assert.doesNotMatch(
      indexRoutes,
      new RegExp(`router\\.use\\("${mountPath}",\\s*validateUserEmail,`),
      `${mountPath} must not run validateUserEmail before its route module authenticates the request`,
    );
  }
});

test("admin routes authenticate before email and role checks", () => {
  const adminRoutes = readRoute("modules", "admin", "admin.routes.js");

  assert.match(
    adminRoutes,
    /router\.use\(authenticate,\s*validateVerifiedEmail,\s*isAdmin\)/,
    "admin routes should run authenticate -> validateVerifiedEmail -> isAdmin",
  );
});

test("attendance routes authenticate before email checks", () => {
  const attendanceRoutes = readRoute("modules", "attendance", "attendance.routes.js");

  assert.match(
    attendanceRoutes,
    /router\.use\(authenticate,\s*validateVerifiedEmail\)/,
    "attendance routes should run authenticate -> validateVerifiedEmail for all attendance endpoints",
  );
  assert.match(
    attendanceRoutes,
    /router\.get\("\/my-history",\s*attendanceController\.getMyHistory\)/,
    "my-history should rely on the route-level authenticated middleware stack",
  );
});
