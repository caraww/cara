const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("offline fallback page is excluded from search indexing", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "offline.html"), "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /فعلاً آفلاین هستی/);
  assert.match(html, /location\.reload\(\)/, "offline retry remains self-contained without an external script");
});
