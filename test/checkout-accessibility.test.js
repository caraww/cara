const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("checkout validation errors are announced to assistive technology", () => {
  const html = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
  const match = html.match(/<p class="err" id="err"([^>]*)><\/p>/);
  assert.ok(match, "checkout error region must remain present");
  assert.match(match[1], /\brole="alert"/);
  assert.match(match[1], /\baria-atomic="true"/);
  assert.match(match[1], /\bhidden\b/, "error stays hidden until checkout.js reveals it");
  const js = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
  assert.match(js, /err\.textContent = m; err\.hidden = false/);
});
