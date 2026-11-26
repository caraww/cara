const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("the home gallery lists all works, with reviewed works first", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const js = fs.readFileSync("js/home.js", "utf8");
  assert.match(html, /id="miniGalComments"/);
  assert.match(html, /id="miniGalRest"/);
  assert.match(html, /id="miniGalRestTitle"/);
  assert.match(js, /api\/reviews\?all=1/);
  assert.match(js, /mini-gal__reviews/);
  assert.match(js, /renderComments/);
  assert.match(js, /works\.filter\(hasReviews\)\.sort/);
  assert.match(js, /works\.filter\(\(s\) => !hasReviews\(s\)\)/);
  assert.match(js, /renderCards\(rest, reviewMap, restGrid\)/);
});

test("the weekly featured card is white in both themes", () => {
  const css = fs.readFileSync("css/home.css", "utf8");
  assert.match(css, /\.featured-card \{[^}]*background: #fff;/);
});
