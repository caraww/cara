const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("builder disclosure panels close with Escape and restore focus", () => {
  const js = fs.readFileSync(path.join(root, "js/builder.js"), "utf8");
  assert.match(js, /let activePanel = tabs\.find/);
  assert.match(js, /panel\.contains\(document\.activeElement\)\) trigger\.focus\(\)/);
  assert.match(js, /e\.key !== "Escape" \|\| !activePanel/);
  assert.match(js, /openPanel\("".*\)/);
});

test("mobile color panel exposes its control relationship and restores focus", () => {
  const js = fs.readFileSync(path.join(root, "js/builder.js"), "utf8");
  assert.match(js, /btn\.setAttribute\("aria-controls", aside\.id\)/);
  assert.match(js, /if \(!o && aside\.contains\(document\.activeElement\)\) btn\.focus\(\)/);
  assert.match(js, /btn\.setAttribute\("aria-expanded", o \? "true" : "false"\)/);
});
