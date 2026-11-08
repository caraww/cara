const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("offline page uses external cached CSS/JS and stays noindex", () => {
  const html = fs.readFileSync(path.join(root, "offline.html"), "utf8");
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /href="\/css\/fonts\.css"/);
  assert.match(html, /href="\/css\/offline\.css"/);
  assert.match(html, /src="\/js\/offline\.js" defer/);
  assert.match(html, /id="connection-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /<style\b|onclick=/);
});

test("service worker precaches offline styles, retry script, and local font weights", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sw, /const CACHE_NAME = "cara-pwa-v6"/);
  for (const asset of [
    "/offline.html",
    "/css/fonts.css",
    "/css/offline.css",
    "/js/offline.js",
    "/fonts/vazirmatn-arabic-400.woff2",
    "/fonts/vazirmatn-arabic-700.woff2",
    "/fonts/vazirmatn-arabic-900.woff2",
  ]) assert.ok(sw.includes('"' + asset + '"'), asset);
});

test("offline retry and connection feedback use external event listeners", () => {
  const js = fs.readFileSync(path.join(root, "js/offline.js"), "utf8");
  assert.match(js, /addEventListener\("click"/);
  assert.match(js, /location\.reload\(\)/);
  assert.match(js, /addEventListener\("online"/);
  assert.match(js, /addEventListener\("offline"/);
  assert.match(js, /connection-status/);
  assert.doesNotMatch(js, /setAttribute\("onclick"/);
});
