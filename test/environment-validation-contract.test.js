const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getMissingRequiredEnv,
  enforceProductionEnv,
} = require("../src/config/env");

test("production environment validation reports missing required variables", () => {
  const env = {
    NODE_ENV: "production",
    PORT: "5001",
    MONGODB_URI: "mongodb://example",
    JWT_SECRET: "secret",
  };

  const missing = getMissingRequiredEnv(env);

  assert.deepEqual(missing, ["ADMIN_SECRET", "FRONTEND_URL", "CLIENT_ORIGINS"]);
});

test("production environment validation passes when all required variables exist", () => {
  const env = {
    NODE_ENV: "production",
    PORT: "5001",
    MONGODB_URI: "mongodb://example",
    JWT_SECRET: "secret",
    ADMIN_SECRET: "admin-secret",
    FRONTEND_URL: "https://app.example.com",
    CLIENT_ORIGINS: "https://app.example.com",
  };

  assert.deepEqual(getMissingRequiredEnv(env), []);
  assert.doesNotThrow(() => enforceProductionEnv(env));
});

test("development environment validation does not require production-only variables", () => {
  const env = {
    NODE_ENV: "development",
  };

  assert.deepEqual(getMissingRequiredEnv(env), []);
  assert.doesNotThrow(() => enforceProductionEnv(env));
});
