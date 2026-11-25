const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "sale.html"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

test("Black Friday landing page is indexable and linked from the sitemap", () => {
  assert.match(html, /<h1>حراج بلک فرایدی کارا<\/h1>/);
  assert.match(html, /🔥 فقط تا ۱۳ آذر/);
  assert.match(home, /<span aria-hidden="true">🔥<\/span> حراج بلک فرایدی/);
  assert.match(html, /<link rel="canonical" href="https:\/\/caraw\.ir\/sale\.html">/);
  assert.match(html, /data-sale-countdown/);
  assert.match(html, /black-friday\.webp/);
  assert.match(html, /black-friday\.avif/);
  assert.match(sitemap, /https:\/\/caraw\.ir\/sale\.html/);
});

test("sale page has item list and FAQ structured data without fabricated reviews", () => {
  assert.match(html, /"@type":"ItemList"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.doesNotMatch(html, /aggregateRating|reviewCount/);
});
