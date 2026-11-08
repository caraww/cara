const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero keeps four photo-guided 3D Delica bracelets visible together", () => {
  const html = read("index.html");
  const script = read("js/hero-lineup.js");
  const css = read("css/hero-lineup.css");
  assert.match(html, /id="caraBraceletLineup"/);
  assert.match(html, /data-bracelet="thousand-eyes"/);
  assert.match(html, /data-bracelet="waterfall"/);
  assert.match(html, /data-bracelet="duck"/);
  assert.match(html, /data-bracelet="peacock"/);
  assert.match(html, /hero-lineup\.js\?v=1/);
  assert.doesNotMatch(html, /hero-gallery-carousel\.js/);
  assert.match(script, /const models = \{/);
  assert.match(script, /Delica thread opening/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(css, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
