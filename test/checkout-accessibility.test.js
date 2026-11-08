const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("checkout validation errors and payment status are announced to assistive technology", () => {
  const html = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
  const result = html.match(/<div id="result"([^>]*)><\/div>/);
  assert.ok(result, "payment result region must remain present");
  assert.match(result[1], /\brole="status"/);
  assert.match(result[1], /\baria-live="polite"/);
  assert.match(result[1], /\baria-atomic="true"/);
  assert.match(result[1], /\bhidden\b/);

  const match = html.match(/<p class="err" id="err"([^>]*)><\/p>/);
  assert.ok(match, "checkout error region must remain present");
  assert.match(match[1], /\brole="alert"/);
  assert.match(match[1], /\baria-atomic="true"/);
  assert.match(match[1], /\bhidden\b/, "error stays hidden until checkout.js reveals it");

  const discountStatus = html.match(/<p class="muted" id="dcNote"([^>]*)><\/p>/);
  assert.ok(discountStatus, "discount feedback region must remain present");
  assert.match(discountStatus[1], /\brole="status"/);
  assert.match(discountStatus[1], /\baria-live="polite"/);
  assert.match(discountStatus[1], /\baria-atomic="true"/);

  const js = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
  assert.match(js, /err\.textContent = m; err\.hidden = false/);
});
