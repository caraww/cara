const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

function tagWithId(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid="${escapedId}")[^>]*>`, "s"));
  assert.ok(match, `element #${id} must remain present`);
  return match[0];
}

test("builder save feedback is announced politely and atomically", () => {
  const html = fs.readFileSync(path.join(root, "builder.html"), "utf8");
  const saved = tagWithId(html, "saved");
  assert.match(saved, /\\brole="status"/);
  assert.match(saved, /\\baria-live="polite"/);
  assert.match(saved, /\\baria-atomic="true"/);
});

test("photo conversion progress and result summaries are announced", () => {
  const html = fs.readFileSync(path.join(root, "upload.html"), "utf8");
  const message = tagWithId(html, "msg");
  assert.match(message, /\\brole="status"/);
  assert.match(message, /\\baria-live="polite"/);
  assert.match(message, /\\baria-atomic="true"/);

  const info = tagWithId(html, "info");
  assert.match(info, /\\brole="status"/);
  assert.match(info, /\\baria-live="polite"/);
  assert.match(info, /\\baria-atomic="true"/);
  assert.match(info, /\\bhidden\\b/);
});
