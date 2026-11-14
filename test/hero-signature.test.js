const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage uses the current hx hero, bracelet lineup, and shared header", () => {
  const html = read("index.html");
  const css = read("css/nav-hero.css");
  assert.match(html, /<section class="hx"/);
  assert.match(html, /class="hx__copy"/);
  assert.match(html, /class="cara-bracelet-lineup"/);
  assert.match(html, /nav-hero\.css\?v=1/);
  assert.match(html, /nav-hero\.js\?v=1/);
  assert.match(css, /\.hx__in/);
  assert.match(css, /\.hx__copy/);
  assert.match(css, /\.cara-bracelet-lineup__viewport/);
  assert.match(css, /prefers-reduced-motion/);
});

test("current hero exposes three named bracelet canvases and keyboard controls", () => {
  const html = read("index.html");
  const heroStart = html.indexOf('<section class="hx"');
  const heroEnd = html.indexOf('<section class="cara-weaving"', heroStart);
  assert.ok(heroStart >= 0 && heroEnd > heroStart, "current hero section exists");
  const hero = html.slice(heroStart, heroEnd);
  assert.equal((hero.match(/<canvas class="cara-bracelet-card__art"/g) || []).length, 3);
  for (const id of ["thousand-eyes", "waterfall", "duck"]) {
    assert.match(hero, new RegExp('data-bracelet="' + id + '"'));
  }
  assert.match(hero, /aria-label="دستبند قبلی"/);
  assert.match(hero, /aria-label="دستبند بعدی"/);
  assert.match(hero, /aria-label="نمایش سه دستبند دست‌باف cara"/);
});

test("legacy cn and hero2 markup is not required by the current homepage", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /class="hero hero2"/);
  assert.doesNotMatch(html, /class="cn-header"/);
  assert.match(html, /class="sh"/);
  assert.match(html, /class="sh__toggle"/);
});
