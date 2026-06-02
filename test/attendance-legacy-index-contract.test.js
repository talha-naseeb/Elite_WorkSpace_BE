const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const srcRoot = path.resolve(__dirname, "../src");
const readSource = (...segments) => readFileSync(path.join(srcRoot, ...segments), "utf8");

test("attendance check-in reuses and migrates legacy records that only match user/date", () => {
  const repository = readSource("modules", "attendance", "attendance.repository.js");
  const service = readSource("modules", "attendance", "attendance.service.js");

  assert.match(repository, /findLegacyByUserAndDate/, "repository should expose legacy user/date lookup");
  assert.match(service, /findLegacyByUserAndDate/, "check-in should fall back to legacy user/date records");
  assert.match(service, /migrateLegacyAttendanceRecord/, "service should migrate legacy attendance shape before saving");
  assert.match(service, /attendance\.workspace = workspaceId/, "legacy records should receive workspace before save");
  assert.match(service, /attendance\.checkInAt = attendance\.checkInAt \|\| legacyLoginTime \|\| fallbackCheckInAt/, "legacy loginTime should map to checkInAt");
});

test("database startup removes stale pre-workspace attendance unique index", () => {
  const database = readSource("config", "database.js");
  const indexes = readSource("config", "attendance-indexes.js");

  assert.match(database, /ensureAttendanceIndexes/, "database startup should ensure attendance indexes");
  assert.match(indexes, /dropIndex\("user_1_date_1"\)/, "stale user/date unique index should be dropped explicitly");
  assert.match(indexes, /IndexNotFound/, "missing stale index should be ignored safely");
});
