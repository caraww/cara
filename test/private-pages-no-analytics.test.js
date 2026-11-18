const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("private customer and admin pages do not load third-party analytics", () => {
  for (const file of ["admin.html", "customers.html", "checkout.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(html, /googletagmanager\\.com|GTM-[A-Z0-9]+|function gtag\\s*\\(/i, file + " must not expose private-page context to GTM");
  }
});
