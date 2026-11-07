const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const paletteSource = fs.readFileSync(path.join(root, "js/palette.js"), "utf8");

function loadCara(setItem) {
  const window = { CARA: { preexistingFeature: "preserved" } };
  const context = {
    window,
    document: {},
    localStorage: { setItem },
    Date,
    JSON,
    Map,
    Math,
    Object,
    Set,
  };
  vm.runInNewContext(paletteSource, context);
  return window.CARA;
}

test("palette setup merges into an existing CARA namespace", () => {
  const cara = loadCara(() => {});
  assert.equal(cara.preexistingFeature, "preserved");
  assert.equal(typeof cara.byCode, "function");
  assert.equal(typeof cara.savePattern, "function");
});

test("savePattern reports successful localStorage writes", () => {
  let savedKey, savedValue;
  const cara = loadCara((key, value) => { savedKey = key; savedValue = value; });
  assert.equal(cara.savePattern(1, 1, [["DB0010"]]), true);
  assert.equal(savedKey, "cara-pattern");
  assert.equal(JSON.parse(savedValue).data[0][0], "DB0010");
});

test("savePattern reports quota or privacy failures instead of silently swallowing them", () => {
  const cara = loadCara(() => { throw new Error("QuotaExceededError"); });
  assert.equal(cara.savePattern(1, 1, [["DB0010"]]), false);
});

test("studio, upload, and live weaving surfaces storage failures", () => {
  const builder = fs.readFileSync(path.join(root, "js/builder.js"), "utf8");
  const upload = fs.readFileSync(path.join(root, "js/upload.js"), "utf8");
  const weave = fs.readFileSync(path.join(root, "js/weave.js"), "utf8");
  assert.match(builder, /ذخیره نشد؛ فضای ذخیره‌سازی مرورگر در دسترس نیست/);
  assert.match(upload, /الگو ساخته شد، اما در مرورگر ذخیره نشد/);
  assert.match(weave, /ذخیره‌ی الگو در مرورگر ممکن نشد/);
  assert.match(weave, /if \(!C\.savePattern\(/);
});
