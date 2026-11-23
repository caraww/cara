const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const js = fs.readFileSync(path.join(__dirname, "../js/challenge.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/challenge.css"), "utf8");

/* A 25×71 bracelet squashed into a fixed 240px-tall box lost rows and colors. */
test("challenge previews keep the pattern aspect ratio inside a matte frame", () => {
  assert.match(js, /chl-thumb/);
  assert.match(css, /\.chl-thumb \{[^}]*height: 260px/);
  assert.match(css, /\.chl-thumb canvas \{[^}]*max-height: calc\(100% - 20px\)/);
  assert.doesNotMatch(css, /\.chl-card canvas \{[^}]*height: 240px/);
});

test("light beads stay visible on the preview matte", () => {
  assert.match(js, /rgba\(74, 58, 90, \.45\)/);
});
