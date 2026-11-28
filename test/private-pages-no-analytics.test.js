const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

/* Private operator and customer pages must never load third-party analytics.
   track.html is excluded too: its URL carries the private order-tracking token. */
test("private customer and admin pages do not load third-party analytics", () => {
  for (const file of [
    "admin.html",
    "admin/index.html",
    "admin-reviews.html",
    "challenge-admin.html",
    "customers.html",
    "track.html",
  ]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal(html.includes("googletagmanager.com"), false, file + " must not load Google Tag Manager");
    assert.equal(/GTM-[A-Z0-9]+/.test(html), false, file + " must not contain a GTM container");
    assert.equal(html.includes("function gtag"), false, file + " must not bootstrap gtag");
  }
});

/* checkout.html needs begin_checkout/purchase, so it does load GTM. What it must
   never do is hand customer details to analytics. */
test("checkout analytics payloads carry no customer identity", () => {
  const js = fs.readFileSync(path.join(root, "js", "checkout.js"), "utf8");
  assert.equal(js.includes("CARA.ecom"), true);
  const match = js.match(/function ecomPayload\(\) \{[\s\S]*?\n  \}/);
  assert.ok(match, "ecomPayload() must exist in checkout.js");
  const pushed = match[0];
  for (const field of ["firstName", "lastName", "phone", "address", "postalCode", "email", "customer"]) {
    assert.equal(pushed.includes(field + ":"), false, "ecommerce payload must not include " + field);
  }
});
