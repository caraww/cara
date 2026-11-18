const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

test("local secrets and Wrangler state are ignored without hiding examples", () => {
  for (const file of [".env", ".env.production", ".dev.vars", ".dev.vars.local", ".wrangler/state.json"]) {
    assert.doesNotThrow(() => execFileSync("git", ["check-ignore", "-q", file]), file + " must be ignored");
  }
  for (const file of [".env.example", ".dev.vars.example"]) {
    assert.throws(() => execFileSync("git", ["check-ignore", "-q", file]), file + " must remain shareable as a template");
  }
});
