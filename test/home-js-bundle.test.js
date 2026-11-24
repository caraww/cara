const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build, SYNC_BUNDLE, DEFER_BUNDLE } = require("../tools/build-home-js.js");

const root = path.resolve(__dirname, "..");

test("homepage JS bundles match their source manifests", () => {
  const { syncCss, deferCss, html, syncVersion, deferVersion } = build();
  assert.equal(fs.readFileSync(path.join(root, SYNC_BUNDLE), "utf8"), syncCss, "run npm run build:home-js");
  assert.equal(fs.readFileSync(path.join(root, DEFER_BUNDLE), "utf8"), deferCss, "run npm run build:home-js");
  assert.match(html, new RegExp(`${SYNC_BUNDLE.replace(/\./g, "\\.")}\\?v=${syncVersion}`));
  assert.match(html, new RegExp(`${DEFER_BUNDLE.replace(/\./g, "\\.")}\\?v=${deferVersion}`));
});
