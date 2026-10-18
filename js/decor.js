/* decor.js — جزئیات و حرکت‌های خلاق؛ روی همه‌ی صفحه‌ها (غیر از admin)، با defer
   ترتیب لود: بعد از palette.js و اسکریپت خود صفحه. قبلاً delight.js بود.
   جفت CSS: decor.css */

/* ==================================================================
   دستبند زنده، دستگاه بافندگی، صدا، توست و ...
   ================================================================== */
/* جزئیات خلاقانه‌ی cara — دستگاه بافندگی زنده.
   بعد از palette.js لود می‌شه و هیچ‌کدوم از کدهای قبلی رو عوض نمی‌کنه. */
(() => {
  const C = window.CARA; if (!C) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LS = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const faToEn = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

  /* ---------- صدا و توست ---------- */
  const sound = { on: LS.get("cara-sound") !== "0" };
  let ac = null;
  function tick() {
    if (!sound.on) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime, o = ac.createOscillator(), v = ac.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(rnd(1500, 2300), t); o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
      v.gain.setValueAtTime(0.05, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(v).connect(ac.destination); o.start(t); o.stop(t + 0.08);
    } catch {}
  }
  let toastEl, tt;
  function say(t) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "dl-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }

  /* ==========================================================
     دستگاه بافندگی: الگو رو منجوق‌به‌منجوق می‌بافه.
     نخ تار (افقی) از قبل کشیده‌ست، سوزن رفت‌وبرگشتی ردیف‌ها رو می‌گذرونه،
     هر منجوق با یه جهش کوچیک می‌شینه و آخرش برق می‌خوره.
     ========================================================== */
  const looms = new Set();
  function Loom(canvas, opt = {}) {
    const g = canvas.getContext("2d"), layer = document.createElement("canvas"), lg = layer.getContext("2d");
    let data = [], steps = [], first = [], h = 0, w = 0, W = 0, H = 0, s = 10, x0 = 0, y0 = 0, d = 1;
    let raf = 0, t0 = 0, dur = 5000, placed = 0, fresh = [], tf = -1e9, state = "idle", sparks = [], lastTick = 0, na = 0, nf = 0;
    const api = { onProgress: null, onDone: null };
    const maxH = () => (typeof opt.maxH === "function" ? opt.maxH() : opt.maxH || 520);
    const hexOf = (r, c) => { const p = C.byCode(data[r][c]); return p ? p.hex : "#999"; };
    /* منجوق دلیکای استوانه‌ای: لبه‌ی تیره، شیشه‌ی براق و سوراخ نخ */
    const putC = (ctx, cx, cy, hex) => {
      const x = cx - s / 2, y = cy - s / 2, bw = Math.max(1, s - 0.8), bh = Math.max(1, s - 0.8);
      if (s < 5) { ctx.fillStyle = hex; ctx.fillRect(x, y, s + 0.4, s + 0.4); return; }
      const rgb = C.hexRgb(hex), tone = (k) => "rgb(" + rgb.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)).join(",") + ")";
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath(); ctx.roundRect(x + .35, y + .65, bw, bh, Math.max(1, s * .18)); ctx.fill();
      const body = ctx.createLinearGradient(x, y, x + bw, y + bh * .25);
      body.addColorStop(0, tone(-.42)); body.addColorStop(.18, tone(.06)); body.addColorStop(.48, tone(.24)); body.addColorStop(.78, hex); body.addColorStop(1, tone(-.38));
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(x, y, bw, bh, Math.max(1, s * .18)); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = Math.max(.45, s * .035);
      ctx.beginPath(); ctx.moveTo(x + s * .22, y + .55); ctx.lineTo(x + bw - s * .22, y + .55); ctx.stroke();
      const shine = ctx.createLinearGradient(0, y, 0, y + bh);
      shine.addColorStop(0, "rgba(255,255,255,.34)"); shine.addColorStop(.38, "rgba(255,255,255,.07)"); shine.addColorStop(1, "rgba(0,0,0,.22)");
      ctx.fillStyle = shine; ctx.beginPath(); ctx.roundRect(x + .5, y + .5, bw - 1, bh - 1, Math.max(.8, s * .14)); ctx.fill();
      /* سطح یک‌دستِ منجوق؛ حجم با سایه‌ی کناره‌ها و برق شیشه‌ای ساخته می‌شود، نه سوراخ وسط */
      ctx.strokeStyle = "rgba(0,0,0,.24)"; ctx.lineWidth = Math.max(.5, s * .045);
      ctx.beginPath(); ctx.roundRect(x + .35, y + .35, bw - .7, bh - .7, Math.max(1, s * .17)); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = Math.max(.45, s * .035);
      ctx.beginPath(); ctx.moveTo(x + s * .2, y + bh - .75); ctx.lineTo(x + bw - s * .2, y + bh - .75); ctx.stroke();
      ctx.restore();
    };
    const FLIP_ROWS = false, FLIP_COLS = true; /* هم‌جهت با پیش‌نمایش مچ توی builder.js */
    const cx = (r) => x0 + (FLIP_ROWS ? h - 1 - r : r) * s + s / 2, cy = (c) => y0 + (FLIP_COLS ? w - 1 - c : c) * s + s / 2;
    const commit = (f) => putC(lg, cx(f.r), cy(f.c), hexOf(f.r, f.c));

    function fit() {
      if (!h) return;
      d = Math.min(2, devicePixelRatio || 1);
      const cw = Math.max(240, canvas.parentElement.clientWidth), padX = 40, padT = 70, padB = 30;
      s = clamp(Math.min((cw - 2 * padX) / h, (maxH() - padT - padB) / w), 2, 26);
      W = cw; H = Math.round(w * s + padT + padB); x0 = (W - h * s) / 2; y0 = padT;
      canvas.width = W * d; canvas.height = H * d; canvas.style.height = H + "px";
      layer.width = W * d; layer.height = H * d; lg.setTransform(d, 0, 0, d, 0, 0);
      for (let i = 0; i < placed; i++) { const [r, c] = steps[i]; putC(lg, cx(r), cy(c), hexOf(r, c)); }
      render(performance.now());
    }

    function load(arr) {
      const ok = arr.map((r) => r.some(Boolean)), a0 = ok.indexOf(true), b0 = ok.lastIndexOf(true); /* ردیف‌های خالیِ اول و آخر بافته نمی‌شن */
      data = a0 < 0 ? arr : arr.slice(a0, b0 + 1); h = data.length; w = data[0].length; steps = []; first = [];
      for (let r = 0; r < h; r++) {
        const st = steps.length, cols = [...Array(w).keys()]; if (r % 2) cols.reverse(); /* سوزن رفت‌وبرگشتی */
        for (const c of cols) if (data[r][c]) { steps.push([r, c]); first.push(st); }
      }
      dur = clamp(steps.length * 34, 7500, 20000); /* آروم و قابل تماشا */
      placed = 0; fresh = []; state = "idle"; tf = -1e9; na = 0; nf = 0;
      fit(); return api;
    }

    function drawLoom(now) {
      const L = x0 - 14, R = x0 + h * s + 14, top = y0 - 12, bottom = y0 + w * s + 12, hh = bottom - top;
      /* قاب واقعی‌تر دستگاه: تیرک‌های کشش در دو سرِ تار */
      const wood = g.createLinearGradient(0, top, 0, bottom);
      wood.addColorStop(0, "#f0d69a"); wood.addColorStop(.45, "#b18a48"); wood.addColorStop(1, "#73552e");
      g.fillStyle = wood;
      g.beginPath(); g.roundRect(L - 12, top - 9, 12, hh + 18, 4); g.fill();
      g.beginPath(); g.roundRect(R + 2, top - 9, 12, hh + 18, 4); g.fill();
      g.fillStyle = "rgba(255,244,211,.7)";
      for (let c = 0; c < w; c++) {
        const y = cy(c);
        /* تارهای موازی با سایه و برق ظریف؛ زیر منجوق‌ها دیده می‌مانند */
        g.strokeStyle = "rgba(9,5,15,.42)"; g.lineWidth = Math.max(1.3, s * .22);
        g.beginPath(); g.moveTo(L - 5, y + 1); g.lineTo(R + 5, y + 1); g.stroke();
        g.strokeStyle = "rgba(238,207,143,.88)"; g.lineWidth = Math.max(.65, s * .075);
        g.beginPath(); g.moveTo(L - 5, y); g.lineTo(R + 5, y); g.stroke();
        g.strokeStyle = "rgba(255,249,225,.52)"; g.lineWidth = .55;
        g.beginPath(); g.moveTo(L - 4, y - .7); g.lineTo(R + 4, y - .7); g.stroke();
      }
      /* پیچ‌های کوچک فلزی روی دو تیرک */
      for (const px of [L - 6, R + 8]) for (let c = 0; c < w; c += Math.max(2, Math.floor(w / 7))) {
        g.fillStyle = "#5d4528"; g.beginPath(); g.arc(px, cy(c), Math.max(1.5, s * .12), 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,244,211,.8)"; g.beginPath(); g.arc(px - .35, cy(c) - .35, Math.max(.5, s * .045), 0, Math.PI * 2); g.fill();
      }
    }

    function render(now) {
      if (!W) return;
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
      drawLoom(now);
      g.drawImage(layer, 0, 0, W, H);
      for (const f of fresh) { /* منجوق تازه‌نشسته: از بالا می‌پره و جا می‌افته */
        const u = clamp((now - f.t) / 230, 0, 1), e = 1 - (1 - u) ** 3;
        g.save(); g.globalAlpha = Math.min(1, u * 1.7); g.translate(cx(f.r), cy(f.c) - (1 - e) * s * 0.9); g.scale(1 + (1 - e) * 0.7, 1 + (1 - e) * 0.7);
        putC(g, 0, 0, hexOf(f.r, f.c)); g.restore();
      }
      if (state === "playing" && steps.length) drawNeedle(now);
      if (state === "done" && now - tf < 1800) drawFinale(now);
    }

    function drawNeedle(now) {
      const N = steps.length, a = Math.min(N - 1, na), b = Math.min(N - 1, na + 1);
      const ax = cx(steps[a][0]), ay = cy(steps[a][1]), bx = cx(steps[b][0]), by = cy(steps[b][1]);
      const nx = ax + (bx - ax) * nf, ny = ay + (by - ay) * nf;
      const fx = cx(steps[a][0]), fy = cy(steps[first[a]][1]);
      /* نخِ پود از مسیر ردیف عبور می‌کند و کمی شل می‌شود */
      g.lineCap = "round";
      g.strokeStyle = "rgba(10,6,16,.5)"; g.lineWidth = Math.max(1.5, s * .15);
      g.beginPath(); g.moveTo(fx, fy + 1); g.lineTo(nx, ny + 1); g.stroke();
      g.strokeStyle = "rgba(255,235,183,.95)"; g.lineWidth = Math.max(.7, s * .075);
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(nx, ny); g.stroke();
      /* نخِ در حال کشیده‌شدن از قرقره، با افت طبیعی */
      const sx = W - 48, sy = 36, ex = nx + Math.max(8, s * .65), ey = ny - Math.max(18, s * 1.6);
      g.strokeStyle = "rgba(12,7,18,.45)"; g.lineWidth = 2.1;
      g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo((ex + sx) / 2, Math.max(ey, sy) + 30 + Math.sin(now / 320) * 3, sx - 10, sy + 8); g.stroke();
      g.strokeStyle = "rgba(255,238,198,.92)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo((ex + sx) / 2, Math.max(ey, sy) + 29 + Math.sin(now / 320) * 3, sx - 10, sy + 7); g.stroke();
      /* قرقره‌ی نخ با لبه‌های فلزی و شیارهای واقعی‌تر */
      g.save(); g.translate(sx, sy);
      g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(1, 3, 15, 17, 0, 0, Math.PI * 2); g.fill();
      const spool = g.createLinearGradient(-13, 0, 13, 0); spool.addColorStop(0, "#785b32"); spool.addColorStop(.22, "#f0d69a"); spool.addColorStop(.55, "#c6a25d"); spool.addColorStop(1, "#72522a");
      g.fillStyle = spool; g.beginPath(); g.roundRect(-12, -15, 24, 30, 5); g.fill();
      g.strokeStyle = "rgba(255,248,222,.55)"; g.lineWidth = 1;
      for (let k = -9; k <= 9; k += 4) { g.beginPath(); g.moveTo(-8, k); g.lineTo(8, k); g.stroke(); }
      g.fillStyle = "#3d2a19"; g.beginPath(); g.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      /* سوزن باریک فولادی، سوراخ سوزن و برق نوک */
      const gl = g.createRadialGradient(nx, ny, 0, nx, ny, 16); gl.addColorStop(0, "rgba(255,236,190,.35)"); gl.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(nx, ny, 16, 0, Math.PI * 2); g.fill();
      const ng = g.createLinearGradient(nx, ny, ex, ey); ng.addColorStop(0, "#fffdf2"); ng.addColorStop(.45, "#b9c0ca"); ng.addColorStop(1, "#657080");
      g.strokeStyle = ng; g.lineWidth = Math.max(1.1, s * .08); g.beginPath(); g.moveTo(nx, ny); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = .65; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + (ex - nx) * .7, ny + (ey - ny) * .7); g.stroke();
      g.strokeStyle = "#25202b"; g.lineWidth = .8; g.beginPath(); g.ellipse(ex - .5, ey + 1.5, 1, 2.3, -.2, 0, Math.PI * 2); g.stroke();
    }

    function drawFinale(now) {
      const t = now - tf, e = clamp(t / 1100, 0, 1), k = e * e * (3 - 2 * e);
      g.save(); g.beginPath(); g.roundRect(x0, y0, h * s, w * s, Math.min(6, s / 2)); g.clip();
      g.translate(x0 - 100 + (h * s + 200) * k, y0); g.transform(1, 0, -0.35, 1, 0, 0);
      const gr = g.createLinearGradient(0, 0, 80, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,250,235,.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, -10, 80, w * s + 20); g.restore();
      g.lineCap = "round";
      for (const p of sparks) {
        const u = clamp((t - p.delay) / 700, 0, 1); if (u <= 0 || u >= 1) continue;
        const a = Math.sin(u * Math.PI), z = (5 + 6 * a) * Math.max(0.6, Math.min(1.6, s / 10)), X = x0 + (FLIP_ROWS ? h - 1 - p.r : p.r) * s, Y = y0 + (FLIP_COLS ? w - 1 - p.c : p.c) * s;
        g.strokeStyle = `rgba(255,247,220,${a})`; g.lineWidth = 1.5; g.beginPath();
        g.moveTo(X - z, Y); g.lineTo(X + z, Y); g.moveTo(X, Y - z); g.lineTo(X, Y + z); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.moveTo(X - z * .5, Y - z * .5); g.lineTo(X + z * .5, Y + z * .5); g.moveTo(X + z * .5, Y - z * .5); g.lineTo(X - z * .5, Y + z * .5); g.stroke();
      }
    }

    function frame(now) {
      const N = steps.length, p = clamp((now - t0) / dur, 0, 1), pe = 0.6 * p + 0.4 * p * p * (3 - 2 * p), tgt = pe * (N - 1);
      na = Math.floor(tgt); nf = tgt - na;
      let moved = false;
      while (placed < Math.min(N, na + 1)) { const [r, c] = steps[placed++]; fresh.push({ r, c, t: now }); moved = true; }
      if (moved) {
        if (opt.tick && now - lastTick > 48) { opt.tick(); lastTick = now; }
        api.onProgress && api.onProgress(placed, N);
      }
      while (fresh.length && now - fresh[0].t > 240) commit(fresh.shift());
      if (p >= 1 && placed >= N && state === "playing") {
        fresh.forEach(commit); fresh = []; state = "done"; tf = now;
        sparks = Array.from({ length: 18 }, () => ({ r: rnd(0, h), c: rnd(0, w), delay: rnd(0, 1000) }));
        api.onDone && api.onDone();
      }
      render(now);
      if (state === "done" && now - tf > 1800) return;
      raf = requestAnimationFrame(frame);
    }

    api.load = load; api.fit = fit; api.stop = () => cancelAnimationFrame(raf);
    api.play = () => {
      if (!steps.length) return;
      if (reduce) return api.skip();
      cancelAnimationFrame(raf); placed = 0; fresh = []; lg.clearRect(0, 0, W, H);
      state = "playing"; t0 = performance.now(); api.onProgress && api.onProgress(0, steps.length); raf = requestAnimationFrame(frame);
    };
    api.skip = () => {
      cancelAnimationFrame(raf); if (!steps.length) return;
      fresh = []; lg.clearRect(0, 0, W, H); placed = steps.length; steps.forEach(([r, c]) => putC(lg, cx(r), cy(c), hexOf(r, c)));
      state = "done"; tf = -1e9; render(performance.now());
      api.onProgress && api.onProgress(placed, placed); api.onDone && api.onDone();
    };
    api.total = () => steps.length; api.rows = () => h;
    looms.add(api);
    return api;
  }
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => looms.forEach((l) => l.fit()), 150); });

  /* ---------- پنجره‌ی «ببین بافته می‌شه» (بیلدر و آپلود) ---------- */
  let dlg, dloom, cnt, prog, ttl;
  function ensureDialog() {
    if (dlg) return;
    dlg = document.createElement("dialog"); dlg.className = "dl-dlg"; dlg.setAttribute("aria-label", "تماشای بافته شدن دستبند");
    dlg.innerHTML = `<div class="dl-hd"><b></b><button class="dl-x" type="button" aria-label="بستن">×</button></div>
      <div class="dl-loom"><canvas></canvas></div><div class="dl-prog"><i></i></div>
      <div class="dl-bar"><span class="dl-cnt"></span><button class="dl-b" type="button" data-a="again">↻ از اول</button><button class="dl-b" type="button" data-a="skip">⏭ رد کن</button><a class="dl-b gold" href="checkout.html">سفارشش بده</a></div>`;
    document.body.appendChild(dlg);
    ttl = dlg.querySelector(".dl-hd b"); cnt = dlg.querySelector(".dl-cnt"); prog = dlg.querySelector(".dl-prog i");
    dloom = Loom(dlg.querySelector("canvas"), { maxH: () => Math.round(innerHeight * 0.52), tick });
    dloom.onProgress = (p, n) => { prog.style.width = (n ? (p / n) * 100 : 0) + "%"; cnt.textContent = `${C.faNum(p)} از ${C.faNum(n)} منجوق`; };
    dloom.onDone = () => { ttl.textContent = "دستبندت آماده‌ست ✨"; cnt.textContent = `${C.faNum(dloom.total())} منجوق توی ${C.faNum(dloom.rows())} ردیف`; };
    const start = () => { ttl.textContent = "دستبندت داره بافته می‌شه…"; dloom.play(); };
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest(".dl-x")) return dlg.close();
      const a = e.target.closest("[data-a]"); if (!a) return;
      if (a.dataset.a === "again") start(); else dloom.skip();
    });
    dlg.addEventListener("close", () => dloom.stop());
    dlg._start = start;
  }
  function openWeave() {
    dispatchEvent(new Event("pagehide")); /* بیلدر همون لحظه الگو رو ذخیره می‌کنه */
    const p = C.loadPattern(), n = p ? p.data.flat().filter(Boolean).length : 0;
    if (!n) return say("اول چندتا منجوق بچین، بعد ببین چطور بافته می‌شه");
    ensureDialog(); dlg.showModal(); dloom.load(p.data); dlg._start();
  }
  const weaveBtn = (cls = "btn dark sm") => {
    const b = document.createElement("button"); b.type = "button"; b.className = cls + " dl-weave dl-pulse"; b.textContent = "▶ ببین چجوری می‌بافمش"; b.onclick = openWeave; return b;
  };

  /* بیلدر: دکمه زیر پیش‌نمایش مچ، صدا، توست نقطه‌عطف */
  const cvGrid = $("grid");
  if (cvGrid) {
    const wb = document.querySelector(".summary .wristbox"); if (wb) wb.insertAdjacentElement("afterend", weaveBtn());
    const bar = document.querySelector(".statusbar");
    if (bar) {
      const b = document.createElement("button"); b.type = "button"; b.className = "dl-sound";
      const paint = () => { b.setAttribute("aria-pressed", sound.on); b.textContent = sound.on ? "♪ صدای منجوق: روشن" : "♪ صدای منجوق: خاموش"; };
      b.onclick = () => { sound.on = !sound.on; LS.set("cara-sound", sound.on ? "1" : "0"); paint(); tick(); }; paint(); bar.appendChild(b);
    }
    let lastCell = "";
    cvGrid.addEventListener("pointerdown", (e) => { if (e.button === 0 || e.button === 2) { lastCell = ""; tick(); } });
    cvGrid.addEventListener("pointermove", (e) => {
      if (e.buttons !== 1 && e.buttons !== 2) return;
      const k = Math.floor(e.clientX / 14) + "," + Math.floor(e.clientY / 14);
      if (k !== lastCell) { lastCell = k; tick(); }
    });
    const MS = [[1, "اولین منجوق نشست! 🧵"], [50, "پنجاه‌تا شد؛ نخ داره راه می‌افته"], [100, "صدتا! الان دیگه اسمش طرحه"], [250, "دویست‌وپنجاه منجوق… دستت درد نکنه!"], [500, "پانصدتا؟! من باید زودتر شروع کنم بافتن"], [1000, "هزارتا! این دیگه یه شاهکاره 👑"]];
    const tot = $("total"), num = () => Number(faToEn((tot && tot.textContent) || "0").replace(/\D/g, "")) || 0;
    let prev = num();
    if (tot) new MutationObserver(() => {
      const n = num(); tot.classList.remove("dl-bump"); void tot.offsetWidth; if (n !== prev) tot.classList.add("dl-bump");
      for (const [m, t] of MS) if (prev < m && n >= m) say(t);
      prev = n;
    }).observe(tot, { childList: true, characterData: true, subtree: true });
  }

  /* آپلود: بعد از تبدیل عکس، دکمه‌ی تماشای بافت */
  const upBtns = document.querySelector(".wrap.narrow .btns");
  if ($("out") && upBtns) {
    const b = weaveBtn("btn"); b.style.width = "auto"; b.style.marginTop = "0";
    b.onclick = () => { if ($("out").hidden) return say("اول یه عکس انتخاب کن"); openWeave(); };
    upBtns.appendChild(b);
  }

  /* ---------- صفحه‌ی اصلی: بافت زنده از طرح‌های گالری ---------- */
  const steps = $("steps");
  if (steps && $("heroCanvas")) {
    /* الگوهای مستقل Alpha-inspired؛ برای انیمیشن از عکس‌های گالری نمونه‌برداری نمی‌کنیم.
       الهام کلی از الگوهای پیکسلی هندسی/گل‌دار است؛ طرح‌ها در خود سایت ساخته می‌شوند. */
    const beadColors = (C.palette || []).filter((p) => p && p.hex && p.code);
    const codeCache = new Map();
    function codeFor(hex) {
      if (codeCache.has(hex)) return codeCache.get(hex);
      const rgb = C.hexRgb(hex);
      let best = beadColors[0], score = Infinity;
      for (const p of beadColors) {
        const qrgb = C.hexRgb(p.hex);
        const d = (rgb[0] - qrgb[0]) ** 2 + (rgb[1] - qrgb[1]) ** 2 + (rgb[2] - qrgb[2]) ** 2;
        if (d < score) { score = d; best = p; }
      }
      const code = best ? best.code : null; codeCache.set(hex, code); return code;
    }
    const ink = {
      night: "#21172f", black: "#211b28", white: "#fff2d6",
      blue: "#168bd2", aqua: "#65e6df", gold: "#e8b84f",
      pink: "#ff5f9e", coral: "#ff795e", purple: "#9b62d8",
      green: "#54b77a", mint: "#a8e6b2"
    };
    const designs = [
      { title: "چشم‌نظر نئونی", paint(x, y) {
        let col = ink.night;
        for (const cx of [5, 15, 25, 35]) {
          const r = Math.sqrt(((x - cx) / 3.0) ** 2 + ((y - 4) / 1.85) ** 2);
          if (r < .42) col = ink.black;
          else if (r < .78) col = ink.white;
          else if (r < 1.17) col = ink.blue;
          else if (r < 1.55) col = ink.aqua;
          else if (r < 1.92) col = ink.gold;
        }
        return col;
      }},
      { title: "باغ گل‌های پیکسلی", paint(x, y) {
        let col = ink.night;
        for (const cx of [4, 14, 24, 34]) {
          const dx = Math.abs(x - cx), dy = Math.abs(y - 3);
          if ((dx === 0 && dy <= 1) || (dx === 1 && dy === 0) || (dx === 2 && dy === 1)) col = ink.pink;
          if (dx === 0 && dy === 0) col = ink.gold;
          if (x === cx && y >= 4) col = ink.green;
          if ((x === cx - 1 && y === 5) || (x === cx + 1 && y === 6)) col = ink.mint;
          if ((x === cx + 1 && y === 5) || (x === cx - 1 && y === 6)) col = ink.green;
        }
        return col;
      }},
      { title: "الماس هندسی", paint(x, y) {
        const phase = x % 12, dist = Math.abs(phase - 6) + Math.abs(y - 4) * 2;
        if (dist <= 2) return ink.white;
        if (dist <= 5) return ink.aqua;
        if (dist <= 8) return ink.purple;
        if ((x + y) % 6 === 0) return ink.gold;
        return ink.night;
      }},
      { title: "ماه و ستاره", paint(x, y) {
        let col = ink.night;
        const dx = x - 7, dy = y - 4, r = Math.sqrt(dx * dx + dy * dy * 1.5);
        if (r < 3.05 && Math.sqrt((x - 8.6) ** 2 + (y - 3.4) ** 2 * 1.5) > 2.65) col = ink.gold;
        const stars = [[17,1],[19,6],[27,3],[31,7],[38,2],[39,5]];
        for (const [sx, sy] of stars) if ((x === sx && Math.abs(y - sy) <= 1) || (Math.abs(x - sx) === 1 && y === sy)) col = ink.white;
        if ((x + y * 2) % 17 === 0 && col === ink.night) col = ink.blue;
        return col;
      }}
    ];
    const works = designs;
    function patternFromWork(work) {
      /* Loom ستون‌ها را عمودی برمی‌گرداند؛ ترتیب ردیف‌ها را از همین‌جا جبران می‌کنیم. */
      return Array.from({length: 42}, (_, x) =>
        Array.from({length: 9}, (_, y) => codeFor(work.paint(x, 8 - y))));
    }
    loom.onProgress = (p, n) => { nEl.textContent = `${C.faNum(p)} از ${C.faNum(n)} منجوق`; };
    loom.onDone = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (vis && works.length) run((i + 1) % works.length); }, 2400);
    };
    async function run(k) {
      if (!works.length || !beadColors.length) return;
      i = k; const id = ++runId, work = works[k];
      nmEl.textContent = work.title;
      try {
        const pattern = await patternFromWork(work);
        if (!vis || id !== runId) return;
        loom.load(pattern); loom.play();
      } catch (err) {
        console.warn("loom: gallery image could not be converted", work.title, err);
        if (id === runId) nmEl.textContent = work.title;
      }
    }
    if (works.length) {
      nmEl.textContent = works[0].title;
      if ("IntersectionObserver" in window) new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && !vis) { vis = true; run(i); }
        else if (!e.isIntersecting && vis) { vis = false; runId++; loom.stop(); clearTimeout(timer); }
      }), { threshold: 0.4 }).observe(sec.querySelector(".dl-loom"));
    } else nmEl.textContent = "";
  }

/* ---------- بعد از پرداخت موفق: دستبندت همون‌جا شروع می‌کنه به بافته شدن ---------- */
  document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "form") { try { sessionStorage.setItem("cara-kind", new URLSearchParams(location.search).get("work") ? "work" : "pattern"); } catch {} }
  }, true);
  const res = $("result"), qs = new URLSearchParams(location.search);
  if (res && qs.get("result") === "success") {
    let kind = ""; try { kind = sessionStorage.getItem("cara-kind") || ""; } catch {}
    const p = kind === "pattern" ? C.loadPattern() : null;
    if (p && p.data.flat().some(Boolean)) {
      const card = document.createElement("section"); card.className = "card";
      card.innerHTML = `<h2>دستبندت همین الان شروع می‌شه</h2><div class="dl-loom"><canvas aria-label="بافته شدن دستبند تو"></canvas><div class="dl-cap"><span class="n"></span><span>همین الگویی که سفارش دادی، منجوق‌به‌منجوق</span></div></div>`;
      res.insertAdjacentElement("afterend", card);
      const lm = Loom(card.querySelector("canvas"), { maxH: () => Math.min(380, innerHeight * 0.5), tick });
      const n = card.querySelector(".n"); lm.onProgress = (a, b) => { n.textContent = `${C.faNum(a)} از ${C.faNum(b)} منجوق`; };
      lm.load(p.data); setTimeout(() => lm.play(), 900);
    }
  }

  /* ---------- خود تب مرورگر هم باحاله ---------- */
  const t0 = document.title, away = ["منجوق‌هات منتظرتن 🧵", "نخ رها شد، برگرد! ✨", "یه منجوق جا مونده…"];
  document.addEventListener("visibilitychange", () => { document.title = document.hidden ? away[(Math.random() * away.length) | 0] : t0; });
})();
