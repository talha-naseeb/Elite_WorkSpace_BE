const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const backendRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(backendRoot, "src");

const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");
const assertExists = (...segments) => assert.ok(existsSync(path.join(srcRoot, ...segments)), `${segments.join("/")} should exist`);

test("runtime startup is separated from Express app composition", () => {
  const appSource = readSource("app.js");
  const serverSource = readSource("server.js");

  assert.doesNotMatch(appSource, /\.listen\(/, "app.js should not start the HTTP server");
  assert.doesNotMatch(appSource, /connectDB\(\)/, "app.js should not connect to MongoDB");
  assert.match(serverSource, /server\.listen\(/, "server.js should start the HTTP server");
  assert.match(serverSource, /connectDB\(\)/, "server.js should connect to MongoDB");
});

test("API routes are mounted under versioned /api/v1 prefix", () => {
  const appSource = readSource("app.js");

  assertExists("api", "v1", "index.js");
  assert.match(appSource, /app\.use\("\/api\/v1",\s*v1Routes\)/, "app.js should mount v1 routes at /api/v1");
  assert.doesNotMatch(appSource, /app\.use\("\/api",\s*routes\)/, "app.js should not mount unversioned /api routes");
});

test("shared foundation files exist", () => {
  for (const filePath of [
    ["shared", "errors", "apiError.js"],
    ["shared", "responses", "apiResponse.js"],
    ["shared", "utils", "asyncHandler.js"],
    ["shared", "utils", "authHelpers.js"],
    ["shared", "constants", "roles.js"],
    ["shared", "constants", "task-status.js"],
    ["shared", "constants", "attendance-status.js"],
    ["shared", "constants", "events.js"],
  ]) {
    assertExists(...filePath);
  }
});

test("middleware is split by responsibility", () => {
  for (const filePath of [
    ["middleware", "authenticate.js"],
    ["middleware", "authorize.js"],
    ["middleware", "validateVerifiedEmail.js"],
    ["middleware", "validators", "auth.validation.js"],
  ]) {
    assertExists(...filePath);
  }
});

test("infrastructure services, jobs, and events exist", () => {
  for (const filePath of [
    ["services", "email", "email.service.js"],
    ["services", "email", "email.transport.js"],
    ["services", "notifications", "slack.service.js"],
    ["services", "notifications", "socket.service.js"],
    ["services", "stats", "stats.service.js"],
    ["jobs", "index.js"],
    ["jobs", "expired-token-cleanup.job.js"],
    ["events", "eventBus.js"],
    ["events", "index.js"],
  ]) {
    assertExists(...filePath);
  }
});

test("primary domains expose module layers", () => {
  for (const [domain, baseName] of [
    ["auth", "auth"],
    ["tasks", "task"],
    ["attendance", "attendance"],
    ["projects", "project"],
    ["tickets", "ticket"],
    ["users", "user"],
    ["teams", "manager"],
    ["admin", "admin"],
    ["integrations", "integration"],
    ["super-admin", "superAdmin"],
  ]) {
    assertExists("modules", domain, `${baseName}.routes.js`);
    assertExists("modules", domain, `${baseName}.controller.js`);
    assertExists("modules", domain, `${baseName}.service.js`);
    assertExists("modules", domain, `${baseName}.repository.js`);
    assertExists("modules", domain, `${baseName}.validation.js`);
    assertExists("modules", domain, `${baseName}.mapper.js`);
  }
});

test("shared response and error helpers keep API shape stable", () => {
  const ApiError = require("../src/shared/errors/apiError");
  const ApiResponse = require("../src/shared/responses/apiResponse");

  const error = ApiError.unauthorized("Token expired");
  assert.equal(error.statusCode, 401);
  assert.equal(error.message, "Token expired");
  assert.equal(error.success, false);

  const response = ApiResponse.success("OK", { value: 1 });
  assert.equal(response.statusCode, 200);
  assert.equal(response.message, "OK");
  assert.deepEqual(response.data, { value: 1 });
  assert.equal(response.success, true);
});
