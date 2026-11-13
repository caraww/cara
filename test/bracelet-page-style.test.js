const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("bracelet weaving guide button uses the same white text treatment as navigation", () => {
  const css = fs.readFileSync(path.join(root, "css/builder.css"), "utf8");
  const rule = css.match(/\.summary \.dl-weave,[\s\S]*?\n\}/);
  assert.ok(rule, "weaving guide button rule exists");
  assert.match(rule[0], /color:\s*#fff\s*!important/);
  assert.match(rule[0], /-webkit-text-fill-color:\s*#fff\s*!important/);
});

test("gallery bracelet pages load their dedicated layout after the shared nav styles", () => {
  const css = fs.readFileSync(path.join(root, "css/bracelet-pages.css"), "utf8");
  assert.match(css, /\.pg-grid/);
  assert.match(css, /\.pg-price/);
  assert.match(css, /\.rel/);
  const layout = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.match(layout, /\/css\/bracelet-pages\.css\?v=1/);
  assert.match(layout, /\/css\/site-nav\.css\?v=20261113/);
  assert.ok(layout.indexOf("/css/site-nav.css") > layout.indexOf("/css/bracelet-pages.css"));
});
