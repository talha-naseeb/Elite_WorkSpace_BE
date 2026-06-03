const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const uploadMiddleware = readFileSync(path.join(__dirname, "..", "src", "middleware", "upload.middleware.js"), "utf8");

test("upload middleware uses explicit image MIME allow-list and 5MB limit", () => {
  assert.match(uploadMiddleware, /MAX_UPLOAD_FILE_SIZE_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(uploadMiddleware, /ALLOWED_IMAGE_MIME_TYPES/);
  assert.match(uploadMiddleware, /"image\/jpeg"/);
  assert.match(uploadMiddleware, /"image\/png"/);
  assert.match(uploadMiddleware, /"image\/webp"/);
  assert.match(uploadMiddleware, /ALLOWED_IMAGE_MIME_TYPES\.has\(file\.mimetype\)/);
  assert.doesNotMatch(uploadMiddleware, /file\.mimetype\.startsWith\("image\/"\)/);
});
