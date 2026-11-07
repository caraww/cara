const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("gallery image areas stay pure white in cards and enlarged view", () => {
  const css = fs.readFileSync("css/gallery.css", "utf8");
  const html = fs.readFileSync("gallery.html", "utf8");
  assert.match(css, /\.wk-grid > \.wk-card,[\s\S]*?background: #fff !important/);
  assert.match(css, /\.wk-grid img\s*\{\s*background: #fff !important/);
  assert.match(css, /\.wk-stage\s*\{\s*background: #fff !important/);
  assert.match(css, /\.wk-stage #lbImg\s*\{\s*background: #fff !important/);
  assert.match(html, /css\/gallery\.css\?v=20261107-whiteframes/);
});
