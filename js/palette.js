/* منبع واحد رنگ‌ها: هم مرورگر و هم server.js از همین فایل می‌خوانند.
   کدهای hex برای رنگ‌هایی که عکس واقعی دارند (پوشه‌ی img/beads) از روی همان عکس‌ها گرفته شده؛ بقیه هنوز تقریبی‌اند. */
const CARA_PALETTE = [
  ["FGB0370", "سفید ابریشمی", "#E9E6E3"],
  ["DB0010", "مشکی براق", "#171717"],
  ["DB0654", "سرخابی", "#791D27"],
  ["DB0757", "قرمز مات", "#D81718"],
  ["DB2103", "نارنجی روشن", "#F79F0D"],
  ["DB0310", "مشکی مات", "#272726"],
  ["DB0732", "کرم", "#E9CFAB"],
  ["DB0726", "آبی کبالت", "#251A82"],
  ["DB0727", "قرمز", "#DF2A1B"],
  ["DB0157", "کرم هفت رنگ", "#EDCAA1"],
  ["DB1498", "خاکستری روشن", "#A29EA1"],
  ["DB0725", "فیروزه ای", "#50A7CD"],
  ["DB0321", "نقره ای متالیک", "#7C7370"],
  ["DB0721", "زرد", "#F1E00A"],
  ["DB2359", "بنفش", "#5E4697"],
  ["DB0756", "کبالت مات", "#282094"],
  ["DB1133", "نارنجی", "#F98B0A"],
  ["DB0724", "سبز چمنی", "#4C8241"],
  ["DB0774", "قرمز شفاف", "#8D181B"],
  ["DB1134", "عنابی", "#672226"],
  ["DB2109", "دارچینی", "#905A25"],
  ["DB0351", "سفید مات", "#ECE9ED"],
  ["DB0200", "سفید", "#F0EDF2"],
  ["DB2264", "Turquoise", "#657C6E"],
  ["DB0785", "بنفش مات شفاف", "#35295E"],
  ["DB0628", "آبی ابریشمی", "#6F9CAC"],
  ["DB0766", "سبز فسفری", "#A4B12B"],
  ["DB1832", "طلایی", "#B08B4B"],
  ["DB1582", "زرد", "#FABC03"],
].map(([code, name, hex]) => ({ code, name, hex }));

/* BEAD_ASPECT = عرض خانه ÷ ارتفاع خانه. اگر بافتت با پهلوی منجوق فرق دارد این عدد را عوض کن (مثلاً 0.8) */
const CARA_LIMITS = {
  MAX_W: 40,
  MAX_H: 200,
  WARN_W: 25,
  DEF_W: 15,
  DEF_H: 80,
  BEAD_ASPECT: 1,
};

if (typeof module !== "undefined") {
  module.exports = { CARA_PALETTE, CARA_LIMITS };
} else {
  const P = CARA_PALETTE,
    KEY = "cara-pattern";
  const BY = new Map(P.map((p) => [p.code, p])),
    byCode = (c) => BY.get(c);
  const faNum = (n) => Number(n).toLocaleString("fa-IR");
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lin = (v) =>
    (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  function toLab(r, g, b) {
    const R = lin(r),
      G = lin(g),
      B = lin(b);
    const fx = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
    const fy = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
    const fz = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  const PL = P.map((p) => ({
    code: p.code,
    rgb: hexRgb(p.hex),
    lab: toLab(...hexRgb(p.hex)),
  }));
  function nearestRaw(r, g, b) {
    const l = toLab(r, g, b);
    let best = PL[0],
      d = Infinity;
    for (const p of PL) {
      const e =
        (l[0] - p.lab[0]) ** 2 +
        (l[1] - p.lab[1]) ** 2 +
        (l[2] - p.lab[2]) ** 2;
      if (e < d) {
        d = e;
        best = p;
      }
    }
    return best;
  }
  /* نزدیک‌ترین مهره با کش؛ پیکسل‌های تکراری عکس دوباره محاسبه نمی‌شوند */
  const NC = new Map();
  function nearest(r, g, b) {
    r = Math.round(r); g = Math.round(g); b = Math.round(b);
    const k = (r << 16) | (g << 8) | b;
    let n = NC.get(k);
    if (!n) { if (NC.size > 60000) NC.clear(); n = nearestRaw(r, g, b); NC.set(k, n); }
    return n;
  }
  function loadPattern() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (
        s &&
        Array.isArray(s.data) &&
        s.data.length &&
        Array.isArray(s.data[0])
      ) {
        /* داده‌ی ذخیره‌شده را با محدودیت‌ها هم‌اندازه می‌کنیم تا خرابی localStorage صفحه را نشکند */
        const W = Math.min(CARA_LIMITS.MAX_W, Math.max(1, s.data[0].length));
        s.data = s.data.slice(0, CARA_LIMITS.MAX_H).map((r) => Array.from({ length: W }, (_, i) => (r && byCode(r[i]) ? r[i] : null)));
        s.height = s.data.length;
        s.width = s.data[0].length;
        return s;
      }
    } catch {}
    return null;
  }
  function savePattern(width, height, data) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          width,
          height,
          data,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {}
  }
  function drawBead(g, x, y, w, h, hex) {
    const r = Math.min(w, h) * 0.28;
    g.fillStyle = hex;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.38)";
    g.beginPath();
    g.roundRect(x + w * 0.12, y + h * 0.1, w * 0.76, h * 0.26, r);
    g.fill();
    g.fillStyle = "rgba(0,0,0,.16)";
    g.beginPath();
    g.roundRect(x + w * 0.1, y + h * 0.72, w * 0.8, h * 0.2, r * 0.6);
    g.fill();
  }
  function drawPattern(g, data, cw, ch, ox = 0, oy = 0) {
    data.forEach((row, r) =>
      row.forEach((code, c) => {
        if (code)
          drawBead(
            g,
            ox + c * cw + 1,
            oy + r * ch + 1,
            cw - 2,
            ch - 2,
            byCode(code).hex,
          );
      }),
    );
  }
  window.CARA = {
    palette: P,
    L: CARA_LIMITS,
    byCode,
    faNum,
    hexRgb,
    nearest,
    loadPattern,
    savePattern,
    drawBead,
    drawPattern,
  };
}
