/* Deterministic daily "odd bead" puzzle and streak math.
   Pure so it can be tested in Node; the UI lives in daily.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CARA_DAILY_PUZZLE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function random(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function previousKey(key) {
    const date = new Date(key + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) return null;
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function puzzleForDate(key, round = 0, size = 5) {
    const rnd = random(hash(`${key}|${round}`));
    const hue = Math.floor(rnd() * 360);
    const saturation = 55 + Math.floor(rnd() * 20);
    const lightness = 52 + Math.floor(rnd() * 18);
    const delta = 0.045 + rnd() * 0.075;
    const direction = lightness > 66 ? -1 : 1;
    const oddIndex = Math.floor(rnd() * size * size);
    const base = { h: hue, s: saturation, l: lightness };
    const odd = {
      h: (hue + Math.round(delta * 90) + 360) % 360,
      s: Math.min(92, Math.max(35, saturation + Math.round(direction * delta * 55))),
      l: Math.max(22, Math.min(88, Math.round((lightness + direction * delta * 100) * 10) / 10)),
    };
    return {
      dateKey: key,
      round,
      size,
      oddIndex,
      base,
      odd,
      baseCss: `hsl(${base.h} ${base.s}% ${base.l}%)`,
      oddCss: `hsl(${odd.h} ${odd.s}% ${odd.l}%)`,
    };
  }

  function emptyStreak() {
    return { streak: 0, best: 0, last: null, played: 0 };
  }

  function streakUpdate(state, todayKey) {
    const current = { ...emptyStreak(), ...(state || {}) };
    if (current.last === todayKey) {
      return { ...current, playedToday: true, isNew: false };
    }
    const continued = current.last && previousKey(todayKey) === current.last;
    const streak = continued ? Number(current.streak || 0) + 1 : 1;
    return {
      streak,
      best: Math.max(Number(current.best || 0), streak),
      last: todayKey,
      played: Number(current.played || 0) + 1,
      playedToday: true,
      isNew: true,
    };
  }

  return Object.freeze({ puzzleForDate, streakUpdate, dateKey, previousKey, emptyStreak, hash });
});
