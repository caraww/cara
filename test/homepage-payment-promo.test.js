const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/home.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("homepage Pay Your Way promo uses the DigiPay banner", () => {
  assert.match(html, /class="cara-payment-promo cara-payment-promo--banner"/);
  assert.match(html, /id="caraPaymentTitle"/);
  assert.match(html, /src="\/img\/digipay-merchant-website-banner-3\.webp"/);
  assert.match(css, /\.cara-payment-promo\.cara-payment-promo--banner\{/);
  assert.match(css, /\.cara-payment-promo--banner \.cara-payment-promo__banner\{/);
});

test("DigiPay banner spans the shared homepage frame on desktop and mobile", () => {
  assert.match(css, /width:min\(1920px,calc\(100% - 44px\)\)/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /width:calc\(100% - 28px\)/);
});
