const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build, BUNDLE } = require("../tools/build-home-css.js");

const root = path.resolve(__dirname, "..");

test("homepage CSS bundle matches its source manifest", () => {
  const { css, html, version } = build();
  assert.equal(fs.readFileSync(path.join(root, BUNDLE), "utf8"), css, "run npm run build:home-css");
  assert.match(html, new RegExp(`/${BUNDLE.replace(/\./g, "\\.")}\\?v=${version}`), "bundle version must match content");
});
