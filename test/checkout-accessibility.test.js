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

test("checkout validation errors and payment status are announced to assistive technology", () => {
  const html = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
  const result = tagWithId(html, "result");
  assert.ok(result.includes('role="status"'));
  assert.ok(result.includes('aria-live="polite"'));
  assert.ok(result.includes('aria-atomic="true"'));
  assert.ok(/\bhidden\b/.test(result));

  const error = tagWithId(html, "err");
  assert.ok(error.includes('role="alert"'));
  assert.ok(error.includes('aria-atomic="true"'));
  assert.ok(/\bhidden\b/.test(error), "error stays hidden until checkout.js reveals it");

  const discountStatus = tagWithId(html, "dcNote");
  assert.ok(discountStatus.includes('role="status"'));
  assert.ok(discountStatus.includes('aria-live="polite"'));
  assert.ok(discountStatus.includes('aria-atomic="true"'));

  const js = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
  assert.match(js, /err\.textContent = m; err\.hidden = false/);
});
