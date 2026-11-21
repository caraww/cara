const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/nav-hero.css", "utf8");
const script = fs.readFileSync("js/hero-stage.js", "utf8");

test("homepage loads one versioned nav-hero stylesheet and one hero stage script", () => {
  const links = html.match(/<link[^>]+nav-hero\.css\?v=[\w.-]+[^>]*>/g) || [];
  assert.equal(links.length, 1, "homepage must load one authoritative nav-hero stylesheet");
  assert.ok(html.indexOf(links[0]) > html.search(/\/css\/polish\.css\?v=\d+/));
  const scripts = html.match(/<script[^>]+hero-stage\.js\?v=\d+[^>]*>/g) || [];
  assert.equal(scripts.length, 1, "homepage must load the hero stage script once");
});

test("current hero styles target the hx section and the photo stage", () => {
  assert.match(html, /class="hx"/);
  assert.match(html, /class="hx__stage"/);
  assert.match(css, /\.hx__in/);
  assert.match(css, /\.hx__stage/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /\.hero\.hero2/);
  assert.doesNotMatch(css, /\.cn-hero/);
});

test("hero stage script parses and supports reduced motion, keyboard, swipe, and pause", () => {
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /getElementById\("heroStage"\)/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /touchend/);
  assert.match(script, /pointerleave/);
  assert.match(script, /document\.hidden/);
});
