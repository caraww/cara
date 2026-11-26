const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("the home gallery lists all works, with reviewed works first", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const js = fs.readFileSync("js/home.js", "utf8");
  assert.doesNotMatch(html, /id="miniGalComments"/);
  assert.match(js, /api\/reviews\?all=1/);
  assert.match(js, /mini-gal__quote/);
  assert.match(js, /works\.filter\(hasReviews\)\.sort/);
  assert.match(js, /works\.filter\(\(s\) => !hasReviews\(s\)\)/);
  assert.match(js, /slice\(0, 4\)/);
  assert.match(js, /mini-gal__media/);
  assert.match(js, /mini-gal__quote-card/);
});

test("the weekly featured card is white in both themes", () => {
  const css = fs.readFileSync("css/home.css", "utf8");
  assert.match(css, /\.featured-card \{[^}]*background: #fff;/);
  assert.match(css, /\.featured-card__img \{[^}]*background: #fff;/);
});
