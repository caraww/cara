const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const worksSource = fs.readFileSync(path.join(root, "js/works.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const heroCss = fs.readFileSync(path.join(root, "css/nav-hero.css"), "utf8");
const heroJs = fs.readFileSync(path.join(root, "js/hero-stage.js"), "utf8");

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

test("Black Friday banner stays animated by default", () => {
  assert.match(index, /<img[^>]+src="\/img\/black-friday\.gif\?v=\d+"/);
  assert.match(
    index,
    /<source[^>]+media="\(prefers-reduced-motion: reduce\)"[^>]+black-friday\.avif/,
  );
});

test("hero images blend into the cream card instead of showing a white box", () => {
  assert.match(heroCss, /\.hx__card img\s*\{[^}]*mix-blend-mode:\s*multiply/);
  assert.doesNotMatch(heroCss, /\.hx__card > picture\s*\{[^}]*z-index/);
  assert.doesNotMatch(heroCss, /hx__card-bg/);
  assert.doesNotMatch(heroJs, /hx__card-bg/);
});
