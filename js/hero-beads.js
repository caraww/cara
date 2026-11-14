/* hero-beads.js — هیروی صفحه‌ی اصلی (فقط index.html)
   یه دست با سوزن و نخ وارد قاب می‌شه، از راست به چپ می‌ره و عبارت «منجوق‌به‌منجوق» رو با
   منجوق‌های دلیکا (چیدمان آجری) می‌بافه؛ بعد از تموم‌شدن دست از قاب خارج می‌شه و هیچ حرکتی نمی‌مونه.
   همه‌چیز روی یک canvas به اندازه‌ی کل هیرو کشیده می‌شه (pointer-events:none).
   جفت CSS: css/hero-beads.css */
(() => {
  "use strict";
  const root = document.querySelector(".hx");
  const slot = root && root.querySelector(".hx__slot");
  const fx = root && root.querySelector(".hx__fx");
  const wordEl = root && root.querySelector(".hx__wordtext");
  if (!slot || !fx || !wordEl || !fx.getContext) return;
  const ctx = fx.getContext("2d");
  const layer = document.createElement("canvas"); /* منجوق‌های تموم‌شده یک‌بار اینجا کشیده می‌شن */
  const lctx = layer.getContext("2d");
  const text = wordEl.textContent.trim();
  if (!text) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const Z = "\u200c", DPR = 2;
  const FAMILY = 'Vazirmatn, "Vazir", Tahoma, system-ui, sans-serif';
  const STOPS = [[0, [155, 143, 193]], [0.34, [217, 138, 166]], [0.66, [207, 174, 108]], [1, [243, 226, 180]]];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c) => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  const ramp = (t) => {
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) { const a = STOPS[i - 1], b = STOPS[i]; return mix(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1)); }
    }
    return STOPS[STOPS.length - 1][1];
  };
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIn = (x) => x * x * x;

  const T_ENTER = 0.9, T_WEAVE = 3.4, T_EXIT = 0.9, TOTAL = T_ENTER + T_WEAVE + T_EXIT, WAVES = 7;
  let RW = 0, RH = 0, sx = 0, sy = 0, sw = 0, sh = 0, bw = 6, bh = 5, beads = [], head = 0, raf = 0, t0 = 0, S = 1;

  function layout() {
    const rr = root.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    RW = Math.max(1, Math.round(rr.width)); RH = Math.max(1, Math.round(rr.height));
    sx = sr.left - rr.left; sy = sr.top - rr.top;
    sw = Math.max(1, Math.round(sr.width)); sh = Math.max(1, Math.round(sr.height));
    [fx, layer].forEach((c) => { c.width = RW * DPR; c.height = RH * DPR; });
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.max(0.8, Math.min(1.15, sh / 250));
  }

  function build() {
    const M = 2; /* ماسک متن با دقت دو برابر؛ روی موبایل عبارت دو خطی می‌شه */
    const parts = text.split(Z + "به" + Z);
    const lines = sw < 620 && parts.length === 2 ? [parts[0] + Z + "به", parts[1]] : [text];
    const m = document.createElement("canvas"); m.width = sw * M; m.height = sh * M;
    const mc = m.getContext("2d", { willReadFrequently: true });
    mc.scale(M, M); mc.textAlign = "center"; mc.textBaseline = "middle";
    try { mc.direction = "rtl"; } catch (e) {}
    let fs = 100;
    mc.font = "900 " + fs + "px " + FAMILY;
    const widest = Math.max.apply(null, lines.map((l) => mc.measureText(l).width)) || 1;
    fs = Math.floor(Math.min((fs * sw * 0.94) / widest, (sh * 0.92) / (lines.length * 1.18)));
    mc.font = "900 " + fs + "px " + FAMILY;
    mc.fillStyle = "#000";
    const lh = fs * 1.18;
    lines.forEach((l, i) => mc.fillText(l, sw / 2, sh / 2 + (i - (lines.length - 1) / 2) * lh));
    const mw = sw * M, mh = sh * M, data = mc.getImageData(0, 0, mw, mh).data;
    const on = (x, y) => {
      const ix = Math.round(x * M), iy = Math.round(y * M);
      return ix < 0 || iy < 0 || ix >= mw || iy >= mh ? 0 : data[(iy * mw + ix) * 4 + 3] > 110 ? 1 : 0;
    };
    const step = Math.max(4.6, Math.min(7.2, sw / 175)), rowH = step * 0.8;
    bw = step * 0.94; bh = rowH * 0.92;
    const snap = (v) => Math.round(v * DPR) / DPR;
    beads = []; head = 0;
    for (let row = 0, y = rowH / 2; y < sh; row++, y += rowH) {
      const off = row & 1 ? step / 2 : 0;
      for (let x = step / 2 + off; x < sw; x += step) {
        let c = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) c += on(x + (i * bw) / 3, y + (j * bh) / 3);
        if (c < 5) continue;
        const k = (Math.random() - 0.5) * 0.12;
        const base = k > 0 ? mix(ramp(x / sw), [255, 255, 255], k) : mix(ramp(x / sw), [0, 0, 0], -k);
        beads.push({
          x: snap(sx + x), y: snap(sy + y),
          t: T_ENTER + ((sw + 20 - x) / (sw + 40)) * T_WEAVE + Math.random() * 0.08, /* لحظه‌ای که نوک سوزن می‌رسه */
          done: false, c: rgb(base), hi: rgb(mix(base, [255, 255, 255], 0.5)), lo: rgb(mix(base, [0, 0, 0], 0.34)),
        });
      }
    }
    beads.sort((a, b) => a.t - b.t);
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  function drawBead(c, b, a, s) {
    const w = bw * s, h = bh * s, x = b.x - w / 2, y = b.y - h / 2, r = h * 0.4;
    c.globalAlpha = a;
    c.fillStyle = b.c; rr(c, x, y, w, h, r); c.fill();
    c.fillStyle = b.hi; c.globalAlpha = a * 0.7; rr(c, x + w * 0.14, y + h * 0.1, w * 0.72, h * 0.26, r * 0.6); c.fill();
    c.fillStyle = b.lo; c.globalAlpha = a * 0.6; rr(c, x + w * 0.14, y + h * 0.68, w * 0.72, h * 0.2, r * 0.5); c.fill();
    c.globalAlpha = 1;
  }

  /* ---------- دست و سوزن (مختصات محلی: نوک سوزن = ۰،۰؛ دست سمت چپ و بالای نوک) ---------- */
  const SKIN = "#e9cdb8", SHADE = "#c4a089", CUFF = "#9b8fc1", CUFF_D = "#7d71a6";
  function thick(pts, w) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    [[w + 4, SHADE], [w, SKIN]].forEach(([lw, col]) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    });
  }
  function poly(pts, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
  }
  function drawHand(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(S, S);
    /* نخ */
    ctx.lineCap = "round"; ctx.strokeStyle = "rgba(232,213,161,.95)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-112, -29); ctx.quadraticCurveTo(-200, -40, -300, -130); ctx.quadraticCurveTo(-380, -200, -760, -250); ctx.stroke();
    /* ساعد + سرآستین */
    poly([[-240, -75], [-760, -243], [-760, -125], [-245, 8]], SKIN, SHADE);
    poly([[-330, -104], [-760, -243], [-760, -125], [-335, -16]], CUFF, CUFF_D);
    /* کف دست و انگشت‌های جمع‌شده */
    ctx.beginPath(); ctx.ellipse(-215, -35, 48, 40, -0.2, 0, 6.2832); ctx.fillStyle = SKIN; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = SHADE; ctx.stroke();
    thick([[-195, -22], [-160, 8]], 18); thick([[-205, -4], [-172, 24]], 18); thick([[-212, 14], [-185, 40]], 17);
    /* سوزن */
    ctx.lineCap = "round"; ctx.strokeStyle = "#f4f1fb"; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-118, -30); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(-112, -29, 5, 1.6, -0.25, 0, 6.2832); ctx.stroke();
    /* شست و اشاره‌ی گیرنده‌ی سوزن */
    thick([[-175, -10], [-120, -2], [-80, -14]], 22);
    thick([[-170, -70], [-110, -48], [-78, -30]], 20);
    ctx.restore();
  }

  function paintStatic() {
    for (const b of beads) if (!b.done) { drawBead(lctx, b, 1, 1); b.done = true; }
    ctx.clearRect(0, 0, RW, RH); ctx.drawImage(layer, 0, 0, RW, RH);
  }

  function frame(now) {
    raf = 0;
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    if (t >= TOTAL) { paintStatic(); return; }
    ctx.clearRect(0, 0, RW, RH);
    ctx.drawImage(layer, 0, 0, RW, RH);
    while (head < beads.length && beads[head].done) head++;
    for (let i = head; i < beads.length; i++) {
      const b = beads[i], p = (t - b.t) / 0.35;
      if (p <= 0) break; /* لیست بر اساس زمان مرتبه */
      if (p >= 1) { drawBead(lctx, b, 1, 1); b.done = true; ctx.drawImage(layer, 0, 0, RW, RH); continue; }
      const e = easeOut(p); drawBead(ctx, b, e, 0.7 + 0.3 * e);
    }
    /* مسیر دست */
    const u = t < T_ENTER ? 0 : t < T_ENTER + T_WEAVE ? (t - T_ENTER) / T_WEAVE : 1;
    let ox = 0, oy = 0;
    if (t < T_ENTER) { const e = easeOut(t / T_ENTER); ox = (1 - e) * 360; oy = -(1 - e) * 300; }
    else if (t > T_ENTER + T_WEAVE) { const e = easeIn((t - T_ENTER - T_WEAVE) / T_EXIT); ox = -e * 200; oy = -e * 380; }
    const tipX = sx + sw + 20 - u * (sw + 40) + ox;
    const tipY = sy + sh / 2 + Math.sin(u * Math.PI * 2 * WAVES) * sh * 0.34 + oy;
    drawHand(tipX, tipY, 0.1 * Math.cos(u * Math.PI * 2 * WAVES));
    raf = requestAnimationFrame(frame);
  }

  function init() {
    root.classList.add("hx--beads");
    layout(); build();
    if (calm) { paintStatic(); return; }
    raf = requestAnimationFrame(frame);
  }
  let rz = 0;
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (!root.classList.contains("hx--beads")) return;
        const rr0 = root.getBoundingClientRect();
        if (Math.abs(rr0.width - RW) > 1 || Math.abs(rr0.height - RH) > 1) {
          if (raf) cancelAnimationFrame(raf); raf = 0;
          layout(); build(); paintStatic(); /* بعد از تغییر اندازه: نتیجه‌ی نهایی، بدون تکرار انیمیشن */
        }
      }, 150);
    }).observe(root);
  }
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load("900 100px Vazirmatn", text), new Promise((ok) => setTimeout(ok, 1500))])
    : Promise.resolve();
  fontReady.catch(() => {}).then(() => {
    try { init(); } catch (e) { root.classList.remove("hx--beads"); console.error("hero-beads", e); }
  });
})();
