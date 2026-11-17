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

test("gallery result count and lightbox have accessible names and announcements", () => {
  const html = fs.readFileSync(path.join(root, "gallery.html"), "utf8");
  const count = tagWithId(html, "wkCount");
  assert.ok(count.includes('role="status"'));
  assert.ok(count.includes('aria-live="polite"'));
  assert.ok(count.includes('aria-atomic="true"'));
  assert.match(html, /<dialog class="wk-lb" id="lb" aria-labelledby="lbTitle">/);
  assert.match(html, /<h2 id="lbTitle"><\/h2>/);
});

test("gallery cards and dynamically generated controls remain keyboard-operable", () => {
  const js = fs.readFileSync(path.join(root, "js/gallery.js"), "utf8");
  assert.match(js, /<button type="button" class="wk-open" aria-label="\$\{esc\(w\.title\)\}"><\/button>/);
  assert.match(js, /<button type="button" class="tool" data-tag=/);
  assert.match(js, /aria-pressed="\$\{k === 0\}"/);
  assert.match(js, /x\.setAttribute\("aria-pressed", String\(active\)\)/);
});
