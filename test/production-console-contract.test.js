const assert = require("node:assert/strict");
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");
const test = require("node:test");

const srcRoot = join(__dirname, "..", "src");
const sourceExtensions = new Set([".js", ".cjs", ".mjs"]);
const allowedFiles = new Set([
  join(srcRoot, "utils", "logger.js"),
]);

const collectSourceFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) return collectSourceFiles(fullPath);
    if (![...sourceExtensions].some((extension) => fullPath.endsWith(extension))) return [];
    if (allowedFiles.has(fullPath)) return [];

    return [fullPath];
  });

test("backend source avoids raw console.log debug statements", () => {
  const offenders = collectSourceFiles(srcRoot)
    .filter((filePath) => /console\.log/.test(readFileSync(filePath, "utf8")))
    .map((filePath) => relative(srcRoot, filePath));

  assert.deepEqual(offenders, []);
});
