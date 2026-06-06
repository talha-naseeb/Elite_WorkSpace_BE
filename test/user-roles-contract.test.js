const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readBackend = (...segments) => readFileSync(path.join(root, "src", ...segments), "utf8");

test("user schema defines the canonical permission roles", () => {
  const model = readBackend("models", "user.model.js");

  assert.match(model, /enum:\s*\["super_admin",\s*"admin",\s*"manager",\s*"member"\]/);
  assert.match(model, /default:\s*"member"/);
  assert.doesNotMatch(model, /"developer"|"employee"/);
});

test("workspace user creation defaults regular users to member", () => {
  const managerController = readBackend("controllers", "manager.controller.js");

  assert.match(managerController, /role:\s*requestedRole\s*\|\|\s*"member"/);
  assert.doesNotMatch(managerController, /role:\s*requestedRole\s*\|\|\s*"developer"/);
});

test("role authorization accepts member and no legacy regular-user role names", () => {
  const authMiddleware = readBackend("middleware", "auth.middleware.js");
  const projectRoutes = readBackend("routes", "project.routes.js");

  assert.match(authMiddleware, /\["super_admin",\s*"admin",\s*"manager",\s*"member"\]/);
  assert.doesNotMatch(authMiddleware, /"developer"|"employee"/);
  assert.match(projectRoutes, /authorize\("admin",\s*"manager",\s*"member"\)/);
  assert.doesNotMatch(projectRoutes, /"developer"|"employee"/);
});
