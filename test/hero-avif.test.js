const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const worksSource = fs.readFileSync(path.join(root, "js/works.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("every work has a generated AVIF thumbnail", () => {
  const matches = [...worksSource.matchAll(/"thumbAvif":\s*"([^"]+)"/g)];
  assert.ok(matches.length >= 17, "works.js should include thumbAvif entries");
  for (const [, url] of matches) {
    const file = decodeURIComponent(url.split("?")[0]);
    assert.ok(fs.existsSync(path.join(root, file)), `missing ${file}`);
  }
});

test("hero and Black Friday images offer AVIF sources", () => {
  assert.match(index, /rel="preload"[^>]*type="image\/avif"[^>]*works-thumbs[^>]*\.avif/);
  assert.ok((index.match(/type="image\/avif"/g) || []).length >= 4, "hero cards and banner should use AVIF");
  assert.ok(fs.existsSync(path.join(root, "img/black-friday.avif")));
  assert.match(index, /black-friday\.avif/);
});
