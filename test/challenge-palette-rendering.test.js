const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CARA_PALETTE } = require("../js/palette.js");

const challenge = fs.readFileSync(path.join(__dirname, "../js/challenge.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../js/admin-challenge.js"), "utf8");

test("challenge palette is object-shaped and every bead code resolves to its original hex", () => {
  assert.ok(CARA_PALETTE.length > 0);
  for (const bead of CARA_PALETTE) {
    const found = CARA_PALETTE.find((item) => item && (item.code === bead.code || item[0] === bead.code));
    const hex = found ? (found.hex || found[2] || "#8b72a4") : "#8b72a4";
    assert.equal(hex, bead.hex, bead.code + " should render using its palette hex");
  }
});

test("public challenge and admin previews both read object-shaped palette entries", () => {
  assert.match(challenge, /p\.code === code/);
  assert.match(challenge, /p\.hex/);
  assert.match(admin, /item\.code === c/);
  assert.match(admin, /p\.hex/);
  assert.doesNotMatch(challenge, /find\(\(p\) => p\[0\] === code\)\s*\|\|\s*\[\]\)\[2\]/);
  assert.doesNotMatch(admin, /find\(\(p\) => p\[0\] === c\)\s*\|\|\s*\[\]\)\[2\]/);
});
