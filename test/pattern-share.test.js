const test = require("node:test");
const assert = require("node:assert/strict");
const share = require("../js/pattern-share.js");

const palette = [
  { code: "DB0010" },
  { code: "DB0200" },
  { code: "DB1832" },
];
const limits = { MAX_W: 40, MAX_H: 200 };

test("round-trips colors and empty cells", () => {
  const data = [["DB0010", null, "DB1832"], ["DB0200", "DB0010", null]];
  const hash = share.makeHash(data, palette);
  assert.equal(hash, "#pattern=3x2:A-CBA-");
  assert.deepEqual(share.parseHash(hash, palette, limits), { width: 3, height: 2, data });
});

test("round-trips the smallest supported grid", () => {
  const data = [["DB0200"]];
  assert.deepEqual(share.parseHash(share.makeHash(data, palette), palette, limits), {
    width: 1, height: 1, data,
  });
});

test("rejects invalid dimensions, excess size, malformed and truncated hashes", () => {
  for (const hash of [
    "#pattern=0x1:A",
    "#pattern=41x1:" + "A".repeat(41),
    "#pattern=1x201:" + "A".repeat(201),
    "#pattern=2x2:ABC",
    "#pattern=1x1:!",
    "#pattern=1x1:D",
    "#other=1x1:A",
  ]) assert.equal(share.parseHash(hash, palette, limits), null, hash);
});

test("rejects ragged grids and unknown bead colors during encoding", () => {
  assert.throws(() => share.encode([["DB0010"], ["DB0010", "DB0200"]], palette), /equal width/);
  assert.throws(() => share.encode([["NOT-A-COLOR"]], palette), /unknown bead color/);
});

test("accepts configured maximum dimensions", () => {
  const data = Array.from({ length: limits.MAX_H }, () => Array(limits.MAX_W).fill("DB0010"));
  const packed = share.encode(data, palette);
  assert.equal(share.decode(packed, limits.MAX_W, limits.MAX_H, palette, limits).data.length, limits.MAX_H);
});
