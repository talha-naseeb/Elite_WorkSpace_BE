const assert = require("node:assert/strict");
const test = require("node:test");

const corsPath = require.resolve("../src/config/cors");

const withEnv = (nextEnv, fn) => {
  const previousEnv = { ...process.env };

  process.env = { ...previousEnv, ...nextEnv };
  if (nextEnv.CLIENT_ORIGINS === undefined) {
    delete process.env.CLIENT_ORIGINS;
  }

  try {
    return fn();
  } finally {
    process.env = previousEnv;
    delete require.cache[corsPath];
  }
};

test("production CORS config loads without terminating the process when CLIENT_ORIGINS is missing", () => {
  withEnv({ NODE_ENV: "production", CLIENT_ORIGINS: undefined }, () => {
    const originalExit = process.exit;
    process.exit = () => {
      throw new Error("process.exit should not be called by CORS config");
    };

    try {
      const { isAllowedOrigin } = require(corsPath);

      assert.equal(isAllowedOrigin("https://app.example.com"), false);
      assert.equal(isAllowedOrigin(undefined), true);
    } finally {
      process.exit = originalExit;
    }
  });
});

test("CORS allows only configured client origins when CLIENT_ORIGINS is set", () => {
  withEnv({ NODE_ENV: "production", CLIENT_ORIGINS: "https://app.example.com, https://admin.example.com" }, () => {
    const { isAllowedOrigin } = require(corsPath);

    assert.equal(isAllowedOrigin("https://app.example.com"), true);
    assert.equal(isAllowedOrigin("https://admin.example.com"), true);
    assert.equal(isAllowedOrigin("https://evil.example.com"), false);
    assert.equal(isAllowedOrigin(undefined), true);
  });
});
