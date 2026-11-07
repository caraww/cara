const test = require("node:test");
const assert = require("node:assert/strict");
const share = require("../js/pattern-share.js");
const { CARA_PALETTE } = require("../js/palette.js");

const palette = [
  { code: "DB0010" },
  { code: "DB0200" },
  { code: "DB1832" },
];
const limits = { MAX_W: 40, MAX_H: 200 };

test("writes stable v2 hashes with embedded color codes and round-trips empty cells", () => {
  const data = [["DB0010", null, "DB1832"], ["DB0200", "DB0010", null]];
  const hash = share.makeHash(data, palette);
  assert.equal(hash, "#pattern=v2=3x2:DB0010,DB1832,DB0200:A-BCA-");
  assert.deepEqual(share.parseHash(hash, palette, limits), { width: 3, height: 2, data });
});

test("v2 hashes survive palette reordering", () => {
  const data = [["DB0010", "DB1832", "DB0200"], ["DB1832", null, "DB0010"]];
  const hash = share.makeHash(data, palette);
  const reordered = [palette[2], palette[0], palette[1]];
  assert.deepEqual(share.parseHash(hash, reordered, limits), { width: 3, height: 2, data });
});

test("reads legacy v1 links with their frozen historical palette order", () => {
  const hash = "#pattern=3x2:A-CBA-";
  const expected = [
    ["FGB0370", null, "DB0654"],
    ["DB0010", "FGB0370", null],
  ];
  assert.deepEqual(share.parseHash(hash, CARA_PALETTE, limits), {
    width: 3, height: 2, data: expected,
  });
});

test("round-trips the smallest supported grid", () => {
  const data = [["DB0200"]];
  assert.deepEqual(share.parseHash(share.makeHash(data, palette), palette, limits), {
    width: 1, height: 1, data,
  });
});

test("rejects invalid dimensions, malformed and truncated v1/v2 hashes", () => {
  for (const hash of [
    "#pattern=0x1:A",
    "#pattern=41x1:" + "A".repeat(41),
    "#pattern=1x201:" + "A".repeat(201),
    "#pattern=2x2:ABC",
    "#pattern=1x1:!",
    "#pattern=1x1:_",
    "#pattern=v2=0x1:DB0010:A",
    "#pattern=v2=2x1:DB0010:A",
    "#pattern=v2=1x1:FFFFFF:A",
    "#pattern=v2=1x1:DB0010:B",
    "#pattern=v2=1x1:DB0010,DB0010:A",
    "#pattern=v2=1x1:-:A",
    "#other=1x1:A",
  ]) assert.equal(share.parseHash(hash, CARA_PALETTE, limits), null, hash);
});

test("rejects ragged grids and unknown bead colors during encoding", () => {
  assert.throws(() => share.encode([["DB0010"], ["DB0010", "DB0200"]], palette), /equal width/);
  assert.throws(() => share.makeHash([["NOT-A-COLOR"]], palette), /unknown bead color/);
});

test("accepts configured maximum dimensions", () => {
  const data = Array.from({ length: limits.MAX_H }, () => Array(limits.MAX_W).fill("DB0010"));
  const packed = share.encode(data, palette);
  assert.equal(share.decode(packed, limits.MAX_W, limits.MAX_H, palette, limits).data.length, limits.MAX_H);
});
