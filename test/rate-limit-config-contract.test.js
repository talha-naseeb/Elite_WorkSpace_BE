const assert = require("node:assert/strict");
const test = require("node:test");

const { createLimiterConfig } = require("../src/middleware/rateLimit.middleware");

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  return response;
};

test("rate-limit handler returns the limiter-specific message payload", () => {
  const message = {
    success: false,
    message: "Too many auth attempts from this IP, please try again after 15 minutes.",
  };
  const config = createLimiterConfig({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message,
    keyGenerator: (req) => req.ip,
  });
  const response = createMockResponse();

  config.handler({ path: "/api/v1/auth/login" }, response);

  assert.equal(response.statusCode, 429);
  assert.deepEqual(response.payload, message);
});

test("rate-limit config skips health and metrics endpoints", () => {
  const config = createLimiterConfig({
    windowMs: 10 * 60 * 1000,
    max: 300,
    message: {
      success: false,
      message: "Too many requests from this IP, please slow down and try again later.",
    },
    keyGenerator: (req) => req.ip,
  });

  assert.equal(config.skip({ path: "/health" }), true);
  assert.equal(config.skip({ path: "/api/health" }), true);
  assert.equal(config.skip({ path: "/metrics" }), true);
  assert.equal(config.skip({ path: "/api/v1/tasks" }), false);
});
