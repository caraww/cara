const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/hero-wow.css", "utf8");
const script = fs.readFileSync("js/hero-wow.js", "utf8");

test("Hero WOW stylesheet is loaded once, last, and cache-busted", () => {
  const links = html.match(/<link[^>]+hero-wow\.css[^>]*>/g) || [];
  assert.equal(links.length, 1, "homepage must load one authoritative Hero WOW stylesheet");
  assert.match(links[0], /\/css\/hero-wow\.css\?v=20261114/);
  assert.ok(html.indexOf(links[0]) > html.indexOf('/css/cn-top.css?v=1'));
});

test("Hero WOW selectors target the current homepage hero and bracelet lineup", () => {
  assert.match(html, /class="cn-hero"/);
  assert.match(html, /class="cara-bracelet-lineup"/);
  assert.match(css, /\.cn-hero::before/);
  assert.match(css, /\.cn-hero \.cara-bracelet-lineup__viewport::before/);
  assert.match(css, /\.cn-hero \.cara-bracelet-lineup__viewport::after/);
  assert.doesNotMatch(css, /\.hero\.hero2/);
  assert.doesNotMatch(css, /\.hero2 \.prod/);
});

test("Hero WOW script attaches to the current hero and respects reduced motion", () => {
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /querySelector\("\.cn-hero"\)/);
  assert.match(script, /querySelector\("\.cara-bracelet-lineup"\)/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /pointermove/);
  assert.match(html, /hero-wow\.js\?v=20261114/);
});
