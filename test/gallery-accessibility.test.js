const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("gallery result count and lightbox have accessible names and announcements", () => {
  const html = fs.readFileSync(path.join(root, "gallery.html"), "utf8");
  assert.match(html, /id="wkCount" role="status" aria-live="polite" aria-atomic="true"/);
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
