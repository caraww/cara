const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const accountSource = fs.readFileSync(path.join(__dirname, "../js/account.js"), "utf8");
const paletteSource = fs.readFileSync(path.join(__dirname, "../js/palette.js"), "utf8");

/* CARA.palette entries are {code,name,hex} objects; reading them as arrays
   (p[0]/p[2]) made every cell fall back to the purple placeholder. */
test("saved-design thumbnails resolve bead colors through CARA.byCode", () => {
  assert.match(paletteSource, /\.map\(\(\[code, name, hex\]\) => \(\{ code, name, hex, finish: finishOf\(name\) \}\)\)/);
  assert.match(accountSource, /CARA\?\.byCode\?\.\(code\)\?\.hex/);
  assert.doesNotMatch(accountSource, /palette\?\.find\(\(p\) => p\[0\]/);
});
