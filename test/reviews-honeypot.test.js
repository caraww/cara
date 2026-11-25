const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("review honeypot is clipped without creating horizontal overflow", () => {
  const css = fs.readFileSync("css/reviews.css", "utf8");
  assert.match(css, /\.review-form \.review-website\s*\{[^}]*position: absolute !important/);
  assert.match(css, /\.review-form \.review-website\s*\{[^}]*clip-path: inset\(50%\) !important/);
  assert.match(css, /\.review-form \.review-website\s*\{[^}]*width: 1px !important/);
  assert.match(css, /\.review-form \.review-website\s*\{[^}]*min-height: 0 !important/);
  assert.doesNotMatch(css, /left:\s*-9999px/);
});
