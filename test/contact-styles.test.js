const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("contact shortcuts load a same-origin stylesheet instead of injecting inline CSS", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js/contact.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "css/contact.css"), "utf8");
  assert.match(js, /stylesheet\.href = "\/css\/contact\.css"/);
  assert.doesNotMatch(js, /createElement\("style"\)|st\.textContent/);
  assert.doesNotMatch(js, /style="background:/);
  assert.match(js, /class="cara-contact-instagram"/);
  assert.match(js, /class="cara-contact-phone"/);
  assert.match(css, /#cara-contact/);
  assert.match(css, /#cara-remind/);
});
