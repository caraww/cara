(() => {
  const C = CARA, L = C.L, $ = (id) => document.getElementById(id);
  const out = $("out"), msg = $("msg"), drop = $("drop"), cv = $("crop"), cropper = $("cropper"), stage = cv.parentElement;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fa = (n) => C.faNum(n);
  const MAXSIDE = 1600; /* عکس بزرگ رو برای سرعت تا این اندازه کوچیک می‌کنیم */

  /* ===== رنگ‌ها (فاصله‌ی Lab) ===== */
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lf = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  function toLab(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b);
    const fx = lf((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), fy = lf(R * 0.2126 + G * 0.7152 + B * 0.0722), fz = lf((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  const PAL = C.palette.map((p) => { const rgb = C.hexRgb(p.hex); return { code: p.code, rgb, lab: toLab(...rgb) }; });
  const ALL = PAL.map((_, i) => i);
  function nearestIn(sub, r, g, b) {
    const l = toLab(r, g, b); let best = sub[0], d = Infinity;
    for (let k = 0; k < sub.length; k++) {
      const p = PAL[sub[k]], e = (l[0] - p.lab[0]) ** 2 + (l[1] - p.lab[1]) ** 2 + (l[2] - p.lab[2]) ** 2;
      if (e < d) { d = e; best = sub[k]; }
    }
    return best;
  }

  /* ===== وضعیت ===== */
  let work = null, base = null, bw = 0, bh = 0, q = 0, angle = 0, flip = false;
  let crop = null, s = 1, dispW = 0, dispH = 0, drag = null, ct;
  const schedule = (ms = 120) => { clearTimeout(ct); ct = setTimeout(convert, ms); };
  const aspect = () => {
    const w = clamp(Number($("w").value) || L.DEF_W, 1, L.MAX_W), h = clamp(Number($("h").value) || L.DEF_H, 1, L.MAX_H);
    return (w * L.BEAD_ASPECT) / h;
  };

  /* ===== بارگذاری عکس ===== */
  function load(file) {
    if (!file || !file.type.startsWith("image/")) { msg.hidden = false; msg.textContent = "این فایل عکس نیست."; return; }
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => { URL.revokeObjectURL(url); start(im); };
    im.onerror = () => { URL.revokeObjectURL(url); msg.hidden = false; msg.textContent = "این عکس باز نشد، یه فایل دیگه امتحان کن."; };
    im.src = url;
  }
  /* از گالری: upload.html?src=beadworks/eye.jpg (فقط عکس‌های هم‌دامنه) */
  (function fromGallery() {
    const sp = new URLSearchParams(location.search).get("src");
    if (!sp) return;
    let u; try { u = new URL(sp, location.href); } catch { return; }
    if (u.origin !== location.origin) return;
    msg.textContent = "دارم عکس رو باز می‌کنم…";
    const im = new Image();
    im.onload = () => start(im);
    im.onerror = () => { msg.textContent = "عکس گالری باز نشد؛ می‌تونی خودت یه عکس انتخاب کنی."; };
    im.src = u.href;
  })();
  $("file").addEventListener("change", (e) => { const f = e.target.files[0]; load(f); e.target.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => load(e.dataTransfer.files[0]));
  ["dragover", "drop"].forEach((ev) => addEventListener(ev, (e) => e.preventDefault()));

  function start(im) {
    const iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.min(1, MAXSIDE / Math.max(iw, ih));
    work = document.createElement("canvas"); work.width = Math.max(1, Math.round(iw * sc)); work.height = Math.max(1, Math.round(ih * sc));
    const g = work.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, work.width, work.height);
    g.imageSmoothingQuality = "high"; g.drawImage(im, 0, 0, work.width, work.height);
    q = 0; angle = 0; flip = false; $("angle").value = 0; $("flipH").setAttribute("aria-pressed", "false");
    updateOuts(); cropper.hidden = false; rebuild();
    out.classList.remove("reveal"); void out.offsetWidth; out.classList.add("reveal");
    schedule(0);
  }

  /* ===== چرخش، آینه و بوم برش ===== */
  function rebuild() {
    const th = ((q * 90 + angle) * Math.PI) / 180, c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
    bw = Math.max(1, Math.round(work.width * c + work.height * sn)); bh = Math.max(1, Math.round(work.width * sn + work.height * c));
    base = base || document.createElement("canvas"); base.width = bw; base.height = bh;
    const g = base.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, bw, bh); g.imageSmoothingQuality = "high";
    g.translate(bw / 2, bh / 2); g.scale(flip ? -1 : 1, 1); g.rotate(th); g.drawImage(work, -work.width / 2, -work.height / 2);
    layoutCrop(); defaultCrop(); drawCrop();
  }
  function layoutCrop() {
    const avail = Math.max(200, Math.min(760, stage.clientWidth - 28)), d = devicePixelRatio || 1;
    s = Math.min(avail / bw, 440 / bh, 1);
    dispW = Math.max(1, Math.round(bw * s)); dispH = Math.max(1, Math.round(bh * s));
    cv.width = Math.round(dispW * d); cv.height = Math.round(dispH * d);
    cv.style.width = dispW + "px"; cv.style.height = "auto";
  }
  function defaultCrop() {
    let cw = bw, ch = bh;
    if ($("lock").checked) { const a = aspect(); if (bw / bh > a) cw = bh * a; else ch = bw / a; }
    crop = { x: (bw - cw) / 2, y: (bh - ch) / 2, w: cw, h: ch };
  }
  function refit() { /* بعد از عوض شدن قفل یا ابعاد: کادر فعلی رو با نسبت جدید جا می‌دیم */
    if (!crop || !$("lock").checked) return;
    const a = aspect(), cx = crop.x + crop.w / 2, cy = crop.y + crop.h / 2;
    let w = crop.w, h = crop.h; if (w / h > a) w = h * a; else h = w / a;
    crop = { x: clamp(cx - w / 2, 0, bw - w), y: clamp(cy - h / 2, 0, bh - h), w, h };
  }
  function drawCrop() {
    if (!base) return;
    const g = cv.getContext("2d"), d = devicePixelRatio || 1;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, dispW, dispH); g.drawImage(base, 0, 0, dispW, dispH);
    const r = { x: crop.x * s, y: crop.y * s, w: crop.w * s, h: crop.h * s };
    g.fillStyle = "rgba(20,12,30,.55)";
    g.fillRect(0, 0, dispW, r.y); g.fillRect(0, r.y + r.h, dispW, dispH - r.y - r.h);
    g.fillRect(0, r.y, r.x, r.h); g.fillRect(r.x + r.w, r.y, dispW - r.x - r.w, r.h);
    g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1; g.beginPath();
    for (let i = 1; i < 3; i++) {
      g.moveTo(r.x + (r.w * i) / 3, r.y); g.lineTo(r.x + (r.w * i) / 3, r.y + r.h);
      g.moveTo(r.x, r.y + (r.h * i) / 3); g.lineTo(r.x + r.w, r.y + (r.h * i) / 3);
    }
    g.stroke();
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(r.x, r.y, r.w, r.h);
    [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => {
      g.fillStyle = "#cfae6c"; g.strokeStyle = "#fff"; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x - 8, y - 8, 16, 16, 5); g.fill(); g.stroke();
    });
  }
  const toDisp = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * dispW) / r.width, ((e.clientY - r.top) * dispH) / r.height]; };
  function hit(px, py) {
    if (!crop) return null;
    const r = { x: crop.x * s, y: crop.y * s, w: crop.w * s, h: crop.h * s };
    let best = null, bd = 22;
    [[r.x, r.y, "nw"], [r.x + r.w, r.y, "ne"], [r.x, r.y + r.h, "sw"], [r.x + r.w, r.y + r.h, "se"]].forEach(([x, y, k]) => {
      const dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = k; }
    });
    if (best) return best;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h ? "move" : null;
  }
  const CUR = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", move: "move" };
  cv.addEventListener("pointerdown", (e) => {
    if (!crop) return;
    const [px, py] = toDisp(e), k = hit(px, py); if (!k) return;
    e.preventDefault(); drag = { k, px, py, c: { ...crop } }; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    const [px, py] = toDisp(e);
    if (!drag) { cv.style.cursor = CUR[hit(px, py)] || "default"; return; }
    const c = drag.c;
    if (drag.k === "move") {
      crop.x = clamp(c.x + (px - drag.px) / s, 0, bw - c.w); crop.y = clamp(c.y + (py - drag.py) / s, 0, bh - c.h);
    } else {
      const sx = drag.k.includes("w") ? -1 : 1, sy = drag.k.includes("n") ? -1 : 1;
      const ax = sx > 0 ? c.x : c.x + c.w, ay = sy > 0 ? c.y : c.y + c.h, MIN = Math.max(12, Math.min(bw, bh) * 0.04);
      let w = Math.max(MIN, (px / s - ax) * sx), h = Math.max(MIN, (py / s - ay) * sy);
      const aw = sx > 0 ? bw - ax : ax, ah = sy > 0 ? bh - ay : ay;
      if ($("lock").checked) { const a = aspect(); w = Math.max(w, h * a); w = Math.min(w, aw, ah * a); h = w / a; }
      else { w = Math.min(w, aw); h = Math.min(h, ah); }
      crop = { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h };
    }
    drawCrop(); schedule(60);
  });
  const endDrag = () => { if (drag) { drag = null; clearTimeout(ct); convert(); } };
  cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);

  function transformed() { if (!work) return; rebuild(); schedule(80); }
  $("rotL").onclick = () => { q = (q + 3) % 4; transformed(); };
  $("rotR").onclick = () => { q = (q + 1) % 4; transformed(); };
  $("flipH").onclick = (e) => { flip = !flip; e.currentTarget.setAttribute("aria-pressed", flip); transformed(); };
  $("angle").addEventListener("input", () => { angle = Number($("angle").value) || 0; updateOuts(); transformed(); });
  $("cropReset").onclick = () => {
    if (!work) return;
    q = 0; angle = 0; flip = false; $("angle").value = 0; $("flipH").setAttribute("aria-pressed", "false"); updateOuts(); transformed();
  };
  $("lock").addEventListener("change", () => { if (!work) return; refit(); drawCrop(); schedule(60); });
  addEventListener("resize", () => { if (work) { layoutCrop(); drawCrop(); } });

  /* ===== تنظیمات ===== */
  const ncol = $("ncol"); ncol.max = PAL.length; ncol.value = PAL.length;
  const DEF = { sharp: 30, bri: 0, con: 0, sat: 10 };
  function updateOuts() {
    $("angleOut").textContent = fa(angle) + "°";
    ["ncol", "sharp", "bri", "con", "sat"].forEach((id) => { $(id + "Out").textContent = fa(Number($(id).value)); });
  }
  ["ncol", "sharp", "bri", "con", "sat"].forEach((id) => $(id).addEventListener("input", () => { updateOuts(); schedule(); }));
  $("auto").addEventListener("change", () => schedule(0));
  $("tuneReset").onclick = () => {
    ncol.value = PAL.length; Object.entries(DEF).forEach(([k, v]) => ($(k).value = v)); $("auto").checked = true; updateOuts(); schedule(0);
  };
  function syncMode() { const sharp = $("mode").value === "sharp"; $("dither").disabled = sharp; $("dither").parentElement.style.opacity = sharp ? 0.5 : ""; }
  $("mode").addEventListener("change", () => { syncMode(); schedule(0); });
  $("dither").addEventListener("change", () => schedule(0));
  ["w", "h"].forEach((id) => $(id).addEventListener("input", () => { if (!work) return; refit(); drawCrop(); schedule(200); }));
  syncMode(); updateOuts();

  /* ===== تبدیل ===== */
  function resample(src, sx, sy, sw, sh, tw, th) {
    let cur = document.createElement("canvas"); cur.width = Math.max(1, Math.round(sw)); cur.height = Math.max(1, Math.round(sh));
    let g = cur.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(src, sx, sy, sw, sh, 0, 0, cur.width, cur.height);
    while (cur.width > tw * 2 || cur.height > th * 2) { /* نصف‌نصف کوچیک می‌کنیم تا ریزه‌کاری‌ها قاطی نشن */
      const n = document.createElement("canvas"); n.width = Math.max(tw, Math.ceil(cur.width / 2)); n.height = Math.max(th, Math.ceil(cur.height / 2));
      g = n.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, n.width, n.height); cur = n;
    }
    if (cur.width !== tw || cur.height !== th) {
      const n = document.createElement("canvas"); n.width = tw; n.height = th;
      g = n.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, tw, th); cur = n;
    }
    return cur;
  }
  function adjust(px, tw, th) {
    const n = tw * th, b = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { b[i * 3] = px[i * 4]; b[i * 3 + 1] = px[i * 4 + 1]; b[i * 3 + 2] = px[i * 4 + 2]; }
    let lo = 0, gain = 1;
    if ($("auto").checked) { /* کشیدن روشن‌ترین و تیره‌ترین نقطه‌ی عکس به دو سر بازه */
      const hist = new Uint32Array(256);
      for (let i = 0; i < n; i++) hist[clamp(Math.round(0.299 * b[i * 3] + 0.587 * b[i * 3 + 1] + 0.114 * b[i * 3 + 2]), 0, 255)]++;
      let acc = 0, a = 0, z = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.015) { a = v; break; } }
      acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.015) { z = v; break; } }
      if (z - a >= 30) { lo = a; gain = Math.min(2.2, 255 / (z - a)); }
    }
    const bri = Number($("bri").value) * 1.28, cc = Number($("con").value) * 2, cf = (259 * (cc + 255)) / (255 * (259 - cc)), sat = 1 + Number($("sat").value) / 100;
    for (let i = 0; i < n; i++) {
      let r = (b[i * 3] - lo) * gain + bri, g = (b[i * 3 + 1] - lo) * gain + bri, bl = (b[i * 3 + 2] - lo) * gain + bri;
      r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; bl = (bl - 128) * cf + 128;
      const gr = 0.299 * r + 0.587 * g + 0.114 * bl;
      b[i * 3] = clamp(gr + (r - gr) * sat, 0, 255); b[i * 3 + 1] = clamp(gr + (g - gr) * sat, 0, 255); b[i * 3 + 2] = clamp(gr + (bl - gr) * sat, 0, 255);
    }
    const amt = (Number($("sharp").value) / 100) * 1.5;
    if (amt > 0 && tw > 2 && th > 2) { /* وضوح لبه‌ها (unsharp mask) */
      const o = new Float32Array(b);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) for (let k = 0; k < 3; k++) {
        let sum = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= tw || yy >= th) continue;
          sum += b[(yy * tw + xx) * 3 + k]; cnt++;
        }
        const v = b[(y * tw + x) * 3 + k]; o[(y * tw + x) * 3 + k] = clamp(v + amt * (v - sum / cnt), 0, 255);
      }
      return o;
    }
    return b;
  }
  function quantize(b, tw, th, w, h, k, sharpMode, dither) {
    const n = tw * th, want = clamp(Number(ncol.value) || PAL.length, 2, PAL.length);
    let sub = ALL;
    if (want < PAL.length) { /* فقط پرکاربردترین رنگ‌ها */
      const cnt = new Uint32Array(PAL.length);
      for (let i = 0; i < n; i++) cnt[nearestIn(ALL, b[i * 3], b[i * 3 + 1], b[i * 3 + 2])]++;
      sub = ALL.filter((i) => cnt[i] > 0).sort((a, c) => cnt[c] - cnt[a]).slice(0, want);
    }
    const data = [];
    if (sharpMode) { /* تیز: هر خونه رنگی رو می‌گیره که بیشتر پیکسل‌هاش داره */
      const idx = new Uint16Array(n); for (let i = 0; i < n; i++) idx[i] = nearestIn(sub, b[i * 3], b[i * 3 + 1], b[i * 3 + 2]);
      const cnt = new Uint16Array(PAL.length);
      for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
          cnt.fill(0); let best = -1, bc = 0;
          for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
            const v = idx[(y * k + dy) * tw + x * k + dx]; if (++cnt[v] > bc) { bc = cnt[v]; best = v; }
          }
          row.push(PAL[best].code);
        }
        data.push(row);
      }
      return data;
    }
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3, r = clamp(b[i], 0, 255), g = clamp(b[i + 1], 0, 255), bl = clamp(b[i + 2], 0, 255);
        const p = PAL[nearestIn(sub, r, g, bl)]; row.push(p.code);
        if (dither) {
          const er = [r - p.rgb[0], g - p.rgb[1], bl - p.rgb[2]];
          [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]].forEach(([dx, dy, f]) => {
            const nx = x + dx, ny = y + dy; if (nx < 0 || nx >= w || ny >= h) return;
            const j = (ny * w + nx) * 3; for (let c = 0; c < 3; c++) b[j + c] += er[c] * f;
          });
        }
      }
      data.push(row);
    }
    return data;
  }
  function convert() {
    if (!work || !crop) return;
    try {
      const w = clamp(Number($("w").value) || L.DEF_W, 1, L.MAX_W), h = clamp(Number($("h").value) || L.DEF_H, 1, L.MAX_H);
      $("warn").hidden = w <= L.WARN_W;
      const sharpMode = $("mode").value === "sharp", k = sharpMode ? 4 : 1, tw = w * k, th = h * k;
      const c = resample(base, crop.x, crop.y, crop.w, crop.h, tw, th);
      const px = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, tw, th).data;
      const data = quantize(adjust(px, tw, th), tw, th, w, h, k, sharpMode, !sharpMode && $("dither").checked);
      const cw = clamp(Math.floor(720 / w), 10, 26), ch = Math.round(cw / L.BEAD_ASPECT), d = devicePixelRatio || 1;
      out.width = w * cw * d; out.height = h * ch * d; out.style.width = w * cw + "px"; out.style.height = h * ch + "px";
      const o = out.getContext("2d"); o.setTransform(d, 0, 0, d, 0, 0);
      o.fillStyle = "#EFECF4"; o.fillRect(0, 0, w * cw, h * ch); C.drawPattern(o, data, cw, ch);
      out.hidden = false; msg.hidden = true;
      const used = new Set(data.flat()).size, info = $("info");
      info.hidden = false; info.textContent = `${fa(w)} × ${fa(h)} · ${fa(w * h)} منجوق · ${fa(used)} رنگ`;
      C.savePattern(w, h, data); /* ذخیره خودکار برای سازنده و سفارش */
    } catch (err) {
      console.error(err); msg.hidden = false; msg.textContent = "تبدیل عکس به مشکل خورد؛ یه عکس دیگه امتحان کن.";
    }
  }
})();
