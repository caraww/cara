const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero renders all four bracelets with the original rotating 3D Delica engine and swipe controls", () => {
  const html = read("index.html");
  const script = read("js/hero-lineup.js");
  const css = read("css/hero-lineup.css");
  assert.match(html, /id="caraBraceletLineup"/);
  for (const id of ["thousand-eyes", "waterfall", "duck", "peacock"]) assert.match(html, new RegExp('data-bracelet="' + id + '"'));
  assert.match(html, /hero-lineup\.js\?v=3/);
  assert.match(script, /const palettes=\{/);
  assert.match(script, /const models=\{/);
  assert.match(script, /"#DF2A1B"/);\n  assert.match(script, /"#251A82"/);\n  assert.match(script, /"#F1E00A"/);
  assert.match(script, /111111111/);
  assert.match(script, /dy=Math.abs\(j-6\)/);\n  assert.match(script, /dx<=5&&dy<=4/);
  assert.match(script, /const flow=r\*\.62/);
  assert.match(css, /translateY\(7px\)/);
  assert.match(script, /function sprite\(/);
  assert.match(script, /Miyuki Delica thread opening/);
  assert.match(script, /const rot=.*t\*\.00011/s);
  assert.match(script, /Math\.sin\(theta\)/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(html, /cara-bracelet-lineup__arrow--prev/);
  assert.match(html, /cara-bracelet-lineup__arrow--next/);
  assert.match(script, /pointerdown/);
  assert.match(script, /pointerup/);
  assert.match(script, /function show\(next\)/);
  assert.match(css, /cara-bracelet-lineup__slides/);
  assert.match(css, /\.cara-bracelet-card\.is-active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
