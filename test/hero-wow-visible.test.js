const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/nav-hero.css", "utf8");
const script = fs.readFileSync("js/hero-lineup.js", "utf8");

test("homepage loads one versioned nav-hero stylesheet and bracelet lineup script", () => {
  const links = html.match(/<link[^>]+nav-hero\.css\?v=1[^>]*>/g) || [];
  assert.equal(links.length, 1, "homepage must load one authoritative nav-hero stylesheet");
  assert.ok(html.indexOf(links[0]) > html.indexOf('/css/polish.css?v=7'));
  const scripts = html.match(/<script[^>]+hero-lineup\.js\?v=6[^>]*>/g) || [];
  assert.equal(scripts.length, 1, "homepage must load the bracelet lineup script once");
});

test("current hero styles target the hx section and bracelet lineup", () => {
  assert.match(html, /class="hx"/);
  assert.match(html, /class="cara-bracelet-lineup"/);
  assert.match(css, /\.hx__in/);
  assert.match(css, /\.cara-bracelet-lineup__viewport/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /\.hero\.hero2/);
  assert.doesNotMatch(css, /\.cn-hero/);
});

test("bracelet lineup script supports reduced motion, visibility, keyboard, and swipe", () => {
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /getElementById\("caraBraceletLineup"\)/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /pointerup/);
  assert.match(script, /visibilitychange/);
});
