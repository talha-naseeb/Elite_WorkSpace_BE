const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

const { createLogger } = require("../src/utils/logger");
const { createRequestLogger } = require("../src/middleware/requestLogger.middleware");

test("production logger writes structured JSON entries", () => {
  const entries = [];
  const logger = createLogger({
    env: { NODE_ENV: "production" },
    sink: {
      info: (entry) => entries.push(entry),
    },
  });

  logger.info("api.request", {
    method: "GET",
    path: "/api/v1/tasks",
    statusCode: 200,
  });

  assert.equal(entries.length, 1);
  assert.deepEqual(JSON.parse(entries[0]), {
    level: "info",
    message: "api.request",
    method: "GET",
    path: "/api/v1/tasks",
    statusCode: 200,
  });
});

test("development logger keeps readable console output", () => {
  const entries = [];
  const logger = createLogger({
    env: { NODE_ENV: "development" },
    sink: {
      warn: (...entry) => entries.push(entry),
    },
  });

  logger.warn("cors.missing_origins", { mode: "allow-all" });

  assert.deepEqual(entries, [["cors.missing_origins", { mode: "allow-all" }]]);
});

test("request logger records method, URL, status, duration, and origin on response finish", () => {
  const entries = [];
  const requestLogger = createRequestLogger({
    info: (message, meta) => entries.push({ message, meta }),
  });
  const req = {
    method: "POST",
    originalUrl: "/api/v1/tasks",
    headers: {
      origin: "https://app.example.com",
    },
    ip: "127.0.0.1",
  };
  const res = new EventEmitter();
  res.statusCode = 201;
  let nextCalled = false;

  requestLogger(req, res, () => {
    nextCalled = true;
  });
  res.emit("finish");

  assert.equal(nextCalled, true);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].message, "api.request");
  assert.deepEqual(entries[0].meta, {
    method: "POST",
    path: "/api/v1/tasks",
    statusCode: 201,
    origin: "https://app.example.com",
    durationMs: entries[0].meta.durationMs,
  });
  assert.equal(typeof entries[0].meta.durationMs, "number");
});
