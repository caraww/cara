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
  assert.doesNotMatch(css, /#cara-remind/, "the old reminder must live only in recovery.css");
  assert.doesNotMatch(js, /cara-remind/, "contact.js must not render a second reminder");
});

test("only one design reminder is rendered per page", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js/contact.js"), "utf8");
  const recovery = fs.readFileSync(path.join(__dirname, "..", "js/recovery.js"), "utf8");
  assert.match(recovery, /caraRecovery/);
  assert.doesNotMatch(js, /ادامه بده|ادامه طراحی/);
});
