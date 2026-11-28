const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { CARA_PALETTE } = require("../js/palette.js");
const builderSource = fs.readFileSync(path.join(__dirname, "../js/builder.js"), "utf8");
const THUMBS = path.join(__dirname, "../img/beads/thumbs");

/* «قرمز شفاف» و «قرمز آجری» با کد رنگی تقریباً یکسان دیده می‌شدند؛
   پالت استودیو حالا عکس واقعی منجوق را نشان می‌دهد و هر رنگ سطح خودش را دارد. */
test("every palette colour exposes a known surface finish", () => {
  const known = new Set(["glass", "matte", "gloss", "satin", "metal", "pearl", "solid"]);
  for (const p of CARA_PALETTE) {
    assert.ok(known.has(p.finish), `${p.code} finish نامعتبر است: ${p.finish}`);
  }
  assert.equal(CARA_PALETTE.find((p) => p.code === "DB0774").finish, "glass");
  assert.notEqual(
    CARA_PALETTE.find((p) => p.code === "DB0774").finish,
    CARA_PALETTE.find((p) => p.code === "DB2119").finish,
  );
});

test("every palette colour has a light bead thumbnail", () => {
  for (const p of CARA_PALETTE) {
    const file = path.join(THUMBS, `${p.code}.webp`);
    assert.ok(fs.existsSync(file), `بندانگشتی ${p.code} نیست`);
    assert.ok(fs.statSync(file).size < 12 * 1024, `بندانگشتی ${p.code} سنگین است`);
  }
});

test("studio swatches render the real bead photo with a colour fallback", () => {
  assert.match(builderSource, /img\/beads\/thumbs\/\$\{p\.code\}\.webp/);
  assert.match(builderSource, /b\.classList\.add\("has-photo"\)/);
  assert.match(builderSource, /b\.dataset\.finish = p\.finish/);
});
