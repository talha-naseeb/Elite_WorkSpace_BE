const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("user model stores theme preference with light default", () => {
  const userModel = readSource("models", "user.model.js");

  assert.match(userModel, /theme:\s*\{/, "User schema should define a theme field");
  assert.match(userModel, /enum:\s*\[\s*"light",\s*"dark",\s*"system"\s*\]/, "theme should only allow supported values");
  assert.match(userModel, /default:\s*"light"/, "theme should default to light");
});

test("profile update endpoint allows theme updates", () => {
  const userController = readSource("controllers", "user.controller.js");

  assert.match(userController, /allowedFields\s*=\s*\[[^\]]*"theme"/s, "update profile should persist theme");
});

test("profile update validation rejects unsupported theme values", () => {
  const authMiddleware = readSource("middleware", "auth.middleware.js");

  assert.match(authMiddleware, /theme/, "profile validation should inspect theme");
  assert.match(authMiddleware, /\["light",\s*"dark",\s*"system"\]\.includes\(theme\)/, "profile validation should allow only supported themes");
});
