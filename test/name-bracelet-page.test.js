const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("name bracelet page loads external styles, manifest, and deferred scripts", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "name-bracelet.html"), "utf8");
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /css\/name-bracelet\.css/);
  assert.match(html, /js\/name-bracelet\.js[^"]*" defer/);
  assert.match(html, /js\/decor\.js[^"]*" defer/);
  assert.match(html, /js\/pwa\.js[^"]*" defer/);
  assert.doesNotMatch(html, /<style[\s>]/i);
  assert.doesNotMatch(html, /<script>\s*\(/i);
});

test("name bracelet checks savePattern result before navigating", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js", "name-bracelet.js"), "utf8");
  assert.match(js, /if \(!C\.savePattern\(/);
  assert.match(js, /الگو ذخیره نشد/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.match(js, /willReadFrequently: true/);
});
