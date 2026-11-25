const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("site nav labels never wrap and tighten on mid-size screens", () => {
  const css = fs.readFileSync(path.join(root, "css/nav-hero.css"), "utf8");
  const rule = css.match(/\.sh__nav a \{[\s\S]*?\n\}/);
  assert.ok(rule, "nav link rule exists");
  assert.match(rule[0], /white-space:\s*nowrap/);
  assert.match(css, /@media \(min-width: 851px\) and \(max-width: 1100px\)[\s\S]*?\.sh__nav a \{ font-size: 13px; \}/);
  const layout = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.match(layout, /\/css\/nav-hero\.css\?v=20261125-wide/);
});
