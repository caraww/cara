const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero uses the current cn visual system and WOW layer", () => {
  const html = read("index.html");
  const css = read("css/cn-top.css");
  const wow = read("css/hero-wow.css");
  assert.match(html, /class="cn-hero"/);
  assert.match(html, /class="cn-hero__copy"/);
  assert.match(html, /class="cn-hero__visual"/);
  assert.match(html, /class="cara-bracelet-lineup"/);
  assert.match(html, /hero-wow\.css\?v=20261114/);
  assert.match(html, /hero-wow\.js\?v=20261114/);
  assert.match(css, /\.cn-hero__inner/);
  assert.match(css, /\.cn-hero \.cara-bracelet-card__art/);
  assert.match(wow, /\.cn-hero/);
  assert.match(wow, /\.cara-bracelet-lineup/);
  assert.match(wow, /prefers-reduced-motion/);
});

test("current hero keeps its three accessible bracelet canvases and controls", () => {
  const html = read("index.html");
  const heroStart = html.indexOf('<section class="cn-hero"');
  const heroEnd = html.indexOf("</section>", html.indexOf("</section>", heroStart) + 1);
  const hero = html.slice(heroStart, heroEnd);
  assert.equal((hero.match(/<canvas/g) || []).length, 3);
  for (const id of ["thousand-eyes", "waterfall", "duck"]) assert.match(hero, new RegExp('data-bracelet="' + id + '"'));
  assert.match(hero, /aria-label="دستبند قبلی"/);
  assert.match(hero, /aria-label="دستبند بعدی"/);
  assert.match(hero, /aria-label="نمایش سه دستبند دست‌باف cara"/);
  assert.doesNotMatch(html, /class="fc fc[1-4]/);
  assert.doesNotMatch(html, /class="blob b[12]"/);
});

test("legacy hero selectors are not required by the current homepage", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /class="hero hero2"/);
  assert.doesNotMatch(html, /id="braceletCanvas"/);
  assert.match(html, /class="cn-header"/);
  assert.match(html, /class="cn-toggle"/);
});
