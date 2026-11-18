const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("private customer and admin pages do not load third-party analytics", () => {
  for (const file of ["admin.html", "customers.html", "checkout.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal(html.includes("googletagmanager.com"), false, file + " must not load Google Tag Manager");
    assert.equal(/GTM-[A-Z0-9]+/.test(html), false, file + " must not contain a GTM container");
    assert.equal(html.includes("function gtag"), false, file + " must not bootstrap gtag");
  }
});
