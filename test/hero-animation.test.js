const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("hero bracelet animation pauses outside viewport and while tab is hidden", () => {
  const source = fs.readFileSync("js/hero-bracelet.js", "utf8");
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /document\.addEventListener\("visibilitychange",\s*syncAnimation\)/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /inViewport\s*&&\s*!document\.hidden\s*&&\s*!RM/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /requestAnimationFrame\(draw\)/);
});
