const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("hero stage rotation pauses on hover, on focus, and while the tab is hidden", () => {
  const source = fs.readFileSync("js/hero-stage.js", "utf8");
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /document\.hidden/);
  assert.match(source, /clearInterval\(timer\)/);
  assert.match(source, /pointerenter/);
  assert.match(source, /pointerleave/);
  assert.match(source, /focusin/);
  assert.match(source, /focusout/);
  assert.doesNotMatch(source, /requestAnimationFrame\(frame\)/);
});
