const test = require("node:test");
const assert = require("node:assert/strict");
const daily = require("../js/daily-puzzle.js");

test("daily puzzles are deterministic for the same date and round", () => {
  const a = daily.puzzleForDate("2026-11-21", 2);
  const b = daily.puzzleForDate("2026-11-21", 2);
  assert.deepEqual(a, b);
  assert.ok(a.oddIndex >= 0 && a.oddIndex < 25);
  assert.notEqual(a.baseCss, a.oddCss);
});

test("different dates and rounds produce different puzzles", () => {
  const a = daily.puzzleForDate("2026-11-21", 0);
  const b = daily.puzzleForDate("2026-11-22", 0);
  const c = daily.puzzleForDate("2026-11-21", 1);
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("streak starts at one and continues only on the next day", () => {
  const first = daily.streakUpdate(daily.emptyStreak(), "2026-11-21");
  assert.equal(first.streak, 1);
  assert.equal(first.playedToday, true);

  const same = daily.streakUpdate(first, "2026-11-21");
  assert.equal(same.streak, 1);
  assert.equal(same.isNew, false);

  const next = daily.streakUpdate(first, "2026-11-22");
  assert.equal(next.streak, 2);
  assert.equal(next.best, 2);

  const gap = daily.streakUpdate(next, "2026-11-25");
  assert.equal(gap.streak, 1);
  assert.equal(gap.best, 2);
});

test("date helpers use local calendar keys", () => {
  assert.equal(daily.dateKey(new Date(2026, 10, 21)), "2026-11-21");
  assert.equal(daily.previousKey("2026-03-01"), "2026-02-28");
});
