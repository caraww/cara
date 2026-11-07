const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("checkout error messages are announced to assistive technology", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "checkout.html"), "utf8");
  assert.match(html, /id="err"[^>]*role="alert"/);
  assert.match(html, /id="err"[^>]*aria-live="assertive"/);
  assert.match(html, /id="err"[^>]*aria-atomic="true"/);
});
