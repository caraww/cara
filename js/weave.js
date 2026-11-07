/* weave.js — interactive live name bracelet for the homepage.
   Uses CARA.palette / byCode / faNum / savePattern from palette.js. */
(() => {
  const C = window.CARA;
  if (!C || !C.palette) return;
  const $ = (id) => document.getElementById(id), fa = C.faNum;
  const cv = $("wvCanvas");
  if (!cv) return;
  const g = cv.getContext("2d"), RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_COLS = 90, PAD = 18;
  let fg = "DB1832", bg = "DB2359", cells = [], cols = 0, rows = 0, total = 0, cs = 12;
  let t = 0, playing = false, last = 0, raf = 0, timer = 0, seq = 0, fontWaited = false;
  const hex = (code) => C.byCode(code).hex;
  const warn = (m) => { const w = $("wvWarn"); w.textContent = m || ""; w.hidden = !m; };

  /* Build accessible color controls from the complete cara palette. */
  function swatches(id, get, set) {
    const box = $(id);
    C.palette.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button"; b.style.background = p.hex; b.title = p.name; b.setAttribute("aria-label", p.name);
      b.setAttribute("aria-pressed", String(p.code === get()));
      b.onclick = () => { set(p.code); box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); restart(); };
      box.appendChild(b);
    });
  }
  swatches("wvFg", () => fg, (c) => (fg = c));
  swatches("wvBg", () => bg, (c) => (bg = c));

  /* Render the entered name as a bead mask, resized to the selected bracelet width. */
  function mask(name, th) {
    const fs = 160, big = document.createElement("canvas"), c = big.getContext("2d"), font = `900 ${fs}px Vazirmatn, Tahoma, sans-serif`;
    c.font = font; big.width = Math.ceil(c.measureText(name).width) + 60; big.height = fs * 2;
    c.font = font; c.fillStyle = "#000"; c.fillText(name, 30, fs * 1.4);
    const d = c.getImageData(0, 0, big.width, big.height).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) if (d[(y * big.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, tw = Math.max(1, Math.round(bw * th / bh));
    const sm = document.createElement("canvas"); sm.width = tw; sm.height = th;
    const s = sm.getContext("2d"); s.imageSmoothingQuality = "high"; s.drawImage(big, x0, y0, bw, bh, 0, 0, tw, th);
    const sd = s.getImageData(0, 0, tw, th).data, px = [];
    for (let y = 0; y < th; y++) { px.push([]); for (let x = 0; x < tw; x++) px[y].push(sd[(y * tw + x) * 4 + 3] > 110); }
    return { px, tw };
  }

  /* null means this build became stale because the user changed an input. */
  async function build() {
    const my = ++seq, name = $("wvName").value.trim(), across = Number($("wvAcross").value);
    $("wvWOut").textContent = fa(across); warn("");
    const fail = (m) => { cells = []; total = 0; warn(m); draw(); return false; };
    if (!name) return fail("یه اسم بنویس تا بافتنش شروع بشه.");
    if (!fontWaited) {
      fontWaited = true;
      try { await Promise.race([document.fonts.load("900 40px Vazirmatn", name), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    }
    if (my !== seq) return null;
    const m = mask(name, across - 2);
    if (!m) return fail("این اسم رو نتونستم بکشم؛ حروف ساده‌تری امتحان کن.");
    if (m.tw + 4 > MAX_COLS) return fail("اسم خیلی بلنده؛ کوتاه‌ترش کن یا پهنا رو کمتر کن.");
    if (fg === bg) warn("رنگ اسم و زمینه یکیه؛ اسم دیده نمی‌شه.");
    cols = m.tw + 4; rows = across;
    cells = Array.from({ length: cols }, (_, x) => Array.from({ length: rows }, (_, y) => { const i = x - 2, j = y - 1; return i >= 0 && i < m.tw && j >= 0 && j < m.px.length && m.px[j][i] ? fg : bg; }));
    total = cols * rows; layout(); return true;
  }

  function layout() {
    const avail = Math.max(240, cv.parentElement.clientWidth - 12);
    cs = Math.max(6, Math.min(22, Math.floor((avail - PAD * 2) / cols)));
    const w = cols * cs + PAD * 2, h = rows * cs + PAD * 2, d = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * d; cv.height = h * d; cv.style.width = w + "px"; cv.style.height = h + "px"; g.setTransform(d, 0, 0, d, 0, 0);
  }

  function bead(x, y, k, color, a) {
    const w = (cs - 2) * k, ht = (cs - 2) * k, cx = x + cs / 2, cy = y + cs / 2, r = Math.min(w, ht) * 0.28;
    g.globalAlpha = a; g.fillStyle = color; g.beginPath();
    if (g.roundRect) g.roundRect(cx - w / 2, cy - ht / 2, w, ht, r); else g.rect(cx - w / 2, cy - ht / 2, w, ht);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.38)"; g.fillRect(cx - w * 0.38, cy - ht * 0.4, w * 0.76, ht * 0.24);
    g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(cx - w * 0.4, cy + ht * 0.22, w * 0.8, ht * 0.2);
    g.globalAlpha = 1;
  }

  function draw() {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.restore();
    if (!total) return;
    g.strokeStyle = "rgba(232,214,183,.3)"; g.lineWidth = 1; g.beginPath();
    for (let r = 0; r < rows; r++) { const y = PAD + r * cs + cs / 2; g.moveTo(PAD - 10, y); g.lineTo(PAD + cols * cs + 10, y); }
    g.stroke();
    const n = Math.max(0, Math.min(total, Math.floor(t)));
    for (let i = 0; i < n; i++) { const c = (i / rows) | 0, r = i % rows; bead(PAD + c * cs, PAD + r * cs, 1, hex(cells[c][r]), 1); }
    if (n < total) {
      const c = (n / rows) | 0, r = n % rows, p = Math.max(0, t - n), e = 1 - Math.pow(1 - p, 3);
      g.fillStyle = "rgba(240,219,169,.25)"; g.fillRect(PAD + c * cs, PAD - 6, cs, rows * cs + 12);
      bead(PAD + c * cs, PAD + r * cs - (1 - e) * cs * 1.2, 0.5 + 0.5 * e, hex(cells[c][r]), e);
    }
    $("wvCount").textContent = fa(n) + " از " + fa(total) + " منجوق";
    $("wvFill").style.width = (n / total * 100) + "%";
  }

  function finish() {
    playing = false; $("wvPlay").textContent = "تموم شد"; $("wvPlay").disabled = true;
    $("wvMsg").textContent = `دستبندت بافته شد؛ ${fa(total)} منجوق. دوستش داری؟ همین الگو رو سفارش بده، یا توی استودیو دستش بزن.`;
    $("wvDone").hidden = false;
  }

  function tick(ts) {
    if (!playing) return;
    t = Math.min(total, t + Math.max(0, Math.min(0.1, (ts - last) / 1000)) * Number($("wvSpeed").value)); last = ts; draw();
    if (t >= total) return finish();
    raf = requestAnimationFrame(tick);
  }
  function play() { if (!total || t >= total) return; playing = true; last = performance.now(); $("wvPlay").textContent = "مکث"; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  function pause() { playing = false; cancelAnimationFrame(raf); $("wvPlay").textContent = "ادامه بده"; }

  /* Clear the loom immediately, then weave it again from the first bead. */
  async function restart() {
    clearTimeout(timer); cancelAnimationFrame(raf); playing = false; t = 0; draw();
    $("wvDone").hidden = true; $("wvPlay").disabled = false; $("wvPlay").textContent = "مکث";
    const ok = await build();
    if (ok === null) return;
    if (!ok) { $("wvPlay").disabled = true; return; }
    if (RM) { t = total; draw(); finish(); } else { draw(); play(); }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(restart, 280); };

  /* Save the same pattern format used by name-bracelet and the studio. */
  function save(to) {
    if (!total) return;
    const grid = Array.from({ length: cols }, (_, r) => Array.from({ length: rows }, (_, c) => cells[r][rows - 1 - c]));
    if (!C.savePattern(grid[0].length, grid.length, grid)) {
      warn("ذخیره‌ی الگو در مرورگر ممکن نشد؛ فضای ذخیره‌سازی را آزاد کن و دوباره امتحان کن.");
      return;
    }
    location.href = to;
  }

  $("wvPlay").onclick = () => (playing ? pause() : play());
  $("wvAgain").onclick = restart;
  $("wvOrder").onclick = () => save("/checkout.html");
  $("wvEdit").onclick = () => save("/builder.html");
  $("wvName").addEventListener("input", later);
  $("wvAcross").addEventListener("input", later);
  $("wvSpeed").addEventListener("change", () => { if (!playing && total && t < total) play(); });
  addEventListener("resize", () => { if (total) { layout(); draw(); } });
  restart();
})();
