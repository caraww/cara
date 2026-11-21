const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("hero stage rotates three real bracelet photos with arrows, dots, keyboard, and swipe", () => {
  const html = read("index.html");
  const script = read("js/hero-stage.js");
  const css = read("css/nav-hero.css");

  assert.match(html, /hero-stage\.js\?v=\d+/);
  assert.doesNotMatch(html, /hero-lineup\.js/);
  assert.equal((html.match(/class="hx__card/g) || []).length, 3);
  assert.match(html, /hx__arrow--prev/);
  assert.match(html, /hx__arrow--next/);
  assert.match(html, /aria-label="دستبند ۱: آبشار رنگی"/);
  assert.match(html, /aria-current="true"/);

  assert.match(script, /getElementById\("heroStage"\)/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /touchstart/);
  assert.match(script, /touchend/);
  assert.match(script, /setInterval/);
  assert.match(script, /clearInterval/);
  assert.match(script, /pointerenter/);

  assert.match(css, /\.hx__card\.is-active/);
  assert.match(css, /\.hx__card\.is-next/);
  assert.match(css, /\.hx__card\.is-prev/);
  assert.match(css, /aspect-ratio: 1 \/ 1\.04/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
