const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

function tagWithId(html, id) {
  const token = 'id="' + id + '"';
  const index = html.indexOf(token);
  assert.ok(index >= 0, "element #" + id + " must remain present");
  const start = html.lastIndexOf("<", index);
  const end = html.indexOf(">", index);
  assert.ok(start >= 0 && end > index, "element #" + id + " must have a complete opening tag");
  return html.slice(start, end + 1);
}

test("builder save feedback is announced politely and atomically", () => {
  const html = fs.readFileSync(path.join(root, "builder.html"), "utf8");
  const saved = tagWithId(html, "saved");
  assert.ok(saved.includes('role="status"'));
  assert.ok(saved.includes('aria-live="polite"'));
  assert.ok(saved.includes('aria-atomic="true"'));
});

test("photo conversion progress and result summaries are announced", () => {
  const html = fs.readFileSync(path.join(root, "upload.html"), "utf8");
  const message = tagWithId(html, "msg");
  assert.ok(message.includes('role="status"'));
  assert.ok(message.includes('aria-live="polite"'));
  assert.ok(message.includes('aria-atomic="true"'));

  const info = tagWithId(html, "info");
  assert.ok(info.includes('role="status"'));
  assert.ok(info.includes('aria-live="polite"'));
  assert.ok(info.includes('aria-atomic="true"'));
  assert.ok(/\bhidden\b/.test(info));
});
