/* Persian, screen-reader friendly description of a bead pattern.
   Pure and dependency-free so the same code runs in the browser and in Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CARA_PATTERN_NARRATE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const nameOf = (palette, code) => {
    const item = (palette || []).find((p) => p && p.code === code);
    return item ? item.name || item.code : code;
  };

  function runsOf(row, palette) {
    const runs = [];
    for (const code of row || []) {
      if (!code) {
        if (runs.length && runs[runs.length - 1].code === null) runs[runs.length - 1].count++;
        else runs.push({ code: null, name: "خالی", count: 1 });
        continue;
      }
      const last = runs[runs.length - 1];
      if (last && last.code === code) last.count++;
      else runs.push({ code, name: nameOf(palette, code), count: 1 });
    }
    return runs;
  }

  function describe(data, palette, options = {}) {
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
      return { width: 0, height: 0, total: 0, colors: [], rows: [], summary: "الگوی خالی است." };
    }
    const width = data[0].length;
    const height = data.length;
    const counts = new Map();
    let total = 0;
    const rows = [];
    data.forEach((row, index) => {
      const safe = Array.isArray(row) ? row : [];
      safe.forEach((code) => {
        if (!code) return;
        total++;
        counts.set(code, (counts.get(code) || 0) + 1);
      });
      const runs = runsOf(safe, palette).filter((run) => run.code !== null);
      rows.push({
        index: index + 1,
        runs,
        text: runs.length
          ? runs.map((run) => `${run.name}×${run.count.toLocaleString("fa-IR")}`).join("، ")
          : "خالی",
      });
    });
    const colors = [...counts.entries()]
      .map(([code, count]) => ({
        code,
        name: nameOf(palette, code),
        count,
        percent: total ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
    const maxRows = Math.max(1, Number(options.maxRows) || height);
    const spokenRows = rows.slice(0, maxRows);
    const summary = total
      ? `الگوی ${width.toLocaleString("fa-IR")} در ${height.toLocaleString("fa-IR")} با ${total.toLocaleString("fa-IR")} منجوق و ${colors.length.toLocaleString("fa-IR")} رنگ.`
      : `الگوی ${width.toLocaleString("fa-IR")} در ${height.toLocaleString("fa-IR")} هنوز خالی است.`;
    return {
      width,
      height,
      total,
      colors,
      rows,
      spokenRows,
      truncated: rows.length > spokenRows.length,
      summary,
      text:
        summary +
        " " +
        colors
          .map((c) => `${c.name} ${c.count.toLocaleString("fa-IR")} عدد، ${c.percent.toLocaleString("fa-IR")} درصد`)
          .join("؛ "),
    };
  }

  return Object.freeze({ describe, runsOf });
});
