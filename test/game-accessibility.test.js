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


test("Worker rate limiting fails closed when Durable Object is missing or unavailable", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "game-worker.js"), "utf8");
  assert.match(source, /export async function rateLimit\(env, key, max, windowMs\) \{\s*if \(!env\.GAME\) return false;\s*try \{ return await stub\(env, "rl:" \+ key\)\.hit\(max, windowMs\); \} catch \{ return false; \}\s*\}/);
  assert.doesNotMatch(source, /export async function rateLimit[\s\S]{0,260}catch \{ return true; \}/);
});
