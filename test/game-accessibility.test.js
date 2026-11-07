const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("practice game has a non-OKLCH color fallback and no blocking alert", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "js/game.js"), "utf8");
  assert.match(js, /CSS\.supports\("color", "oklch/);
  assert.match(js, /hsl\(/);
  assert.match(js, /if \(r\.error\) \{ clearInterval\(timer\); note\(r\.error\); show\("start"\); return; \}/);
  assert.doesNotMatch(js, /alert\(r\.error\)/);
});
