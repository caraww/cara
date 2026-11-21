const test = require("node:test");
const assert = require("node:assert/strict");
const narrate = require("../js/pattern-narrate.js");

const palette = [
  { code: "DB0010", name: "مشکی" },
  { code: "DB0200", name: "سفید" },
];

test("describes a pattern with color counts and compressed rows", () => {
  const data = [
    ["DB0010", "DB0010", null, "DB0200"],
    [null, null, null, null],
  ];
  const out = narrate.describe(data, palette);
  assert.equal(out.width, 4);
  assert.equal(out.height, 2);
  assert.equal(out.total, 3);
  assert.deepEqual(out.colors.map((c) => [c.code, c.count, c.percent]), [
    ["DB0010", 2, 66.7],
    ["DB0200", 1, 33.3],
  ]);
  assert.equal(out.rows[0].text, "مشکی×۲، سفید×۱");
  assert.equal(out.rows[1].text, "خالی");
  assert.match(out.summary, /۴ در ۲/);
  assert.match(out.summary, /۳ منجوق/);
});

test("keeps empty cells out of the spoken run list but preserves them in counts", () => {
  const runs = narrate.runsOf(["DB0010", null, null, "DB0010"], palette);
  assert.deepEqual(runs.map((r) => [r.code, r.count]), [
    ["DB0010", 1],
    [null, 2],
    ["DB0010", 1],
  ]);
});

test("handles empty and malformed input without throwing", () => {
  for (const value of [[], null, undefined, [[]]]) {
    const out = narrate.describe(value, palette);
    assert.equal(out.total, 0);
    assert.ok(out.summary.length > 0);
  }
});

test("truncates long row narration but keeps the total row count", () => {
  const data = Array.from({ length: 50 }, () => ["DB0010"]);
  const out = narrate.describe(data, palette, { maxRows: 5 });
  assert.equal(out.rows.length, 50);
  assert.equal(out.spokenRows.length, 5);
  assert.equal(out.truncated, true);
});
