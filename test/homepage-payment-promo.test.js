const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/home.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("homepage Pay Your Way promo restores the original navy and gold design", () => {
  assert.match(html, /class="cara-payment-promo"/);
  assert.match(html, /PAY YOUR WAY/);
  assert.match(css, /restore the original navy and gold Pay Your Way design/);
  assert.match(css, /linear-gradient\(125deg, #202747 0%, #30385f 58%, #252d4e 100%\)/);
  assert.match(css, /cara-payment-promo__link[\s\S]*?background: #d9bd83/);
  assert.match(css, /cara-payment-promo__wallet[\s\S]*?#0800f5/);
});

test("Pay Your Way label is arranged above the DigiPay card on desktop and mobile", () => {
  assert.match(css, /cara-payment-promo__visual \.cara-payment-promo__tagline\s*\{\s*order: -1/);
  assert.match(css, /cara-payment-promo__visual \.cara-payment-promo__card\s*\{\s*order: 0/);
  assert.match(css, /@media \(max-width: 700px\)/);
});
