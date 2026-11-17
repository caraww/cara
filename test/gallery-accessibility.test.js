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

test("gallery result count and lightbox have accessible names and announcements", () => {
  const html = fs.readFileSync(path.join(root, "gallery.html"), "utf8");
  const count = tagWithId(html, "wkCount");
  assert.match(count, /\\brole="status"/);
  assert.match(count, /\\baria-live="polite"/);
  assert.match(count, /\\baria-atomic="true"/);
  assert.match(html, /<dialog class="wk-lb" id="lb" aria-labelledby="lbTitle">/);
  assert.match(html, /<h2 id="lbTitle"><\\/h2>/);
});

test("gallery cards and dynamically generated controls remain keyboard-operable", () => {
  const js = fs.readFileSync(path.join(root, "js/gallery.js"), "utf8");
  assert.match(js, /<button type="button" class="wk-open" aria-label="\\$\\{esc\\(w\\.title\\)\\}"><\\/button>/);
  assert.match(js, /<button type="button" class="tool" data-tag=/);
  assert.match(js, /aria-pressed="\\$\\{k === 0\\}"/);
  assert.match(js, /x\\.setAttribute\\("aria-pressed", String\\(active\\)\\)/);
});
