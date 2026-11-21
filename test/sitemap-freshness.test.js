const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");

test("sitemap lastmod values reflect the latest committed page regeneration", () => {
  const entries = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)];
  assert.equal(entries.length, 80, "all public bracelet, color, category, blog, starter, and primary pages stay listed");
  assert.match(sitemap, /https:\/\/caraw\.ir\/starter\.html/);
  assert.match(sitemap, /https:\/\/caraw\.ir\/faq\.html/);
  assert.match(sitemap, /https:\/\/caraw\.ir\/category\/gift-birthday\.html/);
  assert.match(sitemap, /https:\/\/caraw\.ir\/blog\/order-guide\.html/);
  for (const [, url, lastmod] of entries) {
    assert.ok(lastmod >= "2026-11-14", url + " has stale lastmod " + lastmod);
  }
  assert.doesNotMatch(sitemap, /https:\/\/caraw\.ir\/(?:checkout\.html|admin\.html)/);
});
