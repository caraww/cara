const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/home.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("homepage Pay Your Way promo restores the original light aqua and lilac design", () => {
  assert.match(html, /class="cara-payment-promo"/);
  assert.match(html, /PAY YOUR WAY/);
  assert.match(css, /Restore the original light aqua\/lilac DigiPay promo appearance/);
  assert.match(css, /linear-gradient\(120deg,#f7fbfb 0%,#eaf5f6 52%,#f5f0f7 100%\)/);
  assert.match(css, /background:#263b4c/);
  assert.match(css, /background:linear-gradient\(120deg,#123f57,#087b9c\)/);
});

test("Pay Your Way label is arranged above the DigiPay card on desktop and mobile", () => {
  assert.match(css, /cara-payment-promo__tagline\s*\{[^}]*order: -1/);
  assert.match(css, /cara-payment-promo__card\s*\{[^}]*order: 0/);
  assert.match(css, /@media\s*\(max-width:700px\)/);
});
