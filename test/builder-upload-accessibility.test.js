const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("builder save feedback is announced politely and atomically", () => {
  const html = fs.readFileSync(path.join(root, "builder.html"), "utf8");
  assert.match(html, /id="saved" role="status" aria-live="polite" aria-atomic="true"/);
});

test("photo conversion progress and result summaries are announced", () => {
  const html = fs.readFileSync(path.join(root, "upload.html"), "utf8");
  assert.match(html, /id="msg" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="info" role="status" aria-live="polite" aria-atomic="true" hidden/);
});
