const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("gallery image build never deletes entire output directories", () => {
  const source = fs.readFileSync("tools/build-works.js", "utf8");
  assert.match(source, /for \(const d of \[THUMB_DIR, VIEW_DIR\]\) fs\.mkdirSync\(d, \{ recursive: true \}\)/);
  assert.doesNotMatch(source, /fs\.rmSync\(d,\s*\{\s*recursive:\s*true/);
  assert.match(source, /هیچ فایل دیگری حذف نمی‌شود/);
});
