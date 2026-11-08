const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero renders original 3D Delica bead bracelets with swipe and accessible controls", () => {
  const html = read("index.html");
  const script = read("js/hero-gallery-carousel.js");
  const css = read("css/hero-carousel.css");
  assert.match(html, /id="heroShowcase"/);
  assert.match(html, /hero-carousel\.css\?v=1/);
  assert.match(html, /hero-gallery-carousel\.js\?v=1/);
  assert.match(script, /\["آبشار رنگی", "اردک تک تک", "طاووس"\]/);
  assert.match(script, /const models = \[/);\n  assert.match(script, /function drawBead/);\n  assert.match(script, /hero-showcase__beadwork/);\n  assert.match(script, /Delica tube opening/);\n  assert.doesNotMatch(script, /work\.src|window\.CARA\.works/);
  assert.match(script, /pointerdown/);
  assert.match(script, /pointerup/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /aria-current/);
  assert.match(css, /hero-showcase__beadwork/);\n  assert.match(css, /cara-waterfall-float/);
  assert.match(css, /cara-duck-orbit/);
  assert.match(css, /cara-peacock-glide/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
