const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("contact shortcuts load a same-origin stylesheet instead of injecting inline CSS", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js/contact.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "css/contact.css"), "utf8");
  assert.match(js, /stylesheet\.href = "\/css\/contact\.css\?v=/);
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

test("contact FAB exposes an accessible toggle instead of two always-visible buttons", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js/contact.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "css/contact.css"), "utf8");
  assert.match(js, /aria-expanded="false"/);
  assert.match(js, /aria-controls="cara-contact-menu"/);
  assert.match(js, /menu\.hidden = !open/);
  assert.match(js, /cara-contact-toggle__icon--close/);
  assert.match(js, /toggle\.addEventListener\("click"/);
  assert.match(js, /setOpen\(menu\.hidden\)/);
  assert.match(js, /document\.activeElement/);
  assert.match(css, /#cara-contact \.cara-contact__menu\[hidden\]\{display:none\}/);
  assert.match(css, /#cara-contact \.cara-contact-toggle\{/);
  assert.match(css, /#cara-contact\.is-open \.cara-contact-toggle__icon--close\{display:grid\}/);
});
