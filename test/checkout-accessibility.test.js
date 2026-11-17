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

test("checkout validation errors and payment status are announced to assistive technology", () => {
  const html = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
  const result = tagWithId(html, "result");
  assert.match(result, /\\brole="status"/);
  assert.match(result, /\\baria-live="polite"/);
  assert.match(result, /\\baria-atomic="true"/);
  assert.match(result, /\\bhidden\\b/);

  const error = tagWithId(html, "err");
  assert.match(error, /\\brole="alert"/);
  assert.match(error, /\\baria-atomic="true"/);
  assert.match(error, /\\bhidden\\b/, "error stays hidden until checkout.js reveals it");

  const discountStatus = tagWithId(html, "dcNote");
  assert.match(discountStatus, /\\brole="status"/);
  assert.match(discountStatus, /\\baria-live="polite"/);
  assert.match(discountStatus, /\\baria-atomic="true"/);

  const js = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
  assert.match(js, /err\\.textContent = m; err\\.hidden = false/);
});
