const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");

test("backend setup does not advertise unsupported Microsoft OAuth", () => {
  const envExample = fs.readFileSync(path.join(repoRoot, "backend", ".env.example"), "utf8");
  const backendPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "backend", "package.json"), "utf8"));

  assert.equal(envExample.includes("MICROSOFT_"), false);
  assert.equal(Boolean(backendPackage.dependencies["passport-microsoft"]), false);
});
