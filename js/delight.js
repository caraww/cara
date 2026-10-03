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
    const putC = (ctx, cx, cy, hex) => {
      const x = cx - s / 2, y = cy - s / 2;
      if (s >= 5) C.drawBead(ctx, x + 0.5, y + 0.5, s - 1, s - 1, hex); else { ctx.fillStyle = hex; ctx.fillRect(x, y, s + 0.4, s + 0.4); }
    };
    const cx = (r) => x0 + r * s + s / 2, cy = (c) => y0 + c * s + s / 2;
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
      const L = x0 - 14, R = x0 + h * s + 14, top = y0 - 12, hh = w * s + 24;
      for (const px of [L - 10, R + 2]) {
        const gr = g.createLinearGradient(px, 0, px + 8, 0); gr.addColorStop(0, "#e0c383"); gr.addColorStop(1, "#8e6f33");
        g.fillStyle = gr; g.beginPath(); g.roundRect(px, top, 8, hh, 4); g.fill();
      }
      g.strokeStyle = "rgba(220,186,116,.55)"; g.lineWidth = 1.2; g.beginPath();
      for (let c = 0; c < w; c++) { const y = cy(c); g.moveTo(L - 2, y); g.lineTo(R + 4, y); }
      g.stroke();
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
      /* نخی که از منجوق‌های همین ردیف رد شده */
      g.strokeStyle = "rgba(255,238,196,.92)"; g.lineWidth = Math.max(1, s * 0.09); g.lineCap = "round";
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(nx, ny); g.stroke();
      /* قرقره بالا سمت راست + نخ شل که به سوزن می‌رسه */
      const sx = W - 46, sy = 40, ex = nx + 14, ey = ny - 32;
      g.strokeStyle = "rgba(255,238,196,.8)"; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo((ex + sx) / 2, Math.max(ey, sy) + 26 + Math.sin(now / 320) * 3, sx - 14, sy + 6); g.stroke();
      g.save(); g.translate(sx, sy); g.scale(1.9, 1.9);
      g.fillStyle = "#cfae6c"; g.beginPath(); g.roundRect(-10, -13, 20, 26, 5); g.fill();
      g.fillStyle = "#efe0b8"; g.beginPath(); g.roundRect(-8, -9, 16, 18, 3); g.fill();
      g.strokeStyle = "rgba(0,0,0,.14)"; g.lineWidth = 0.7; g.beginPath(); for (let k = -5; k <= 5; k += 5) { g.moveTo(-8, k); g.lineTo(8, k); } g.stroke();
      g.restore();
      /* هاله و خود سوزن */
      const gl = g.createRadialGradient(nx, ny, 0, nx, ny, 20); gl.addColorStop(0, "rgba(255,236,190,.5)"); gl.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(nx, ny, 20, 0, 7); g.fill();
      const ng = g.createLinearGradient(nx, ny, ex, ey); ng.addColorStop(0, "#fff7dc"); ng.addColorStop(1, "#d9b974");
      g.strokeStyle = ng; g.lineWidth = 2.4; g.beginPath(); g.moveTo(nx, ny); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = "#1d1527"; g.lineWidth = 1; g.beginPath(); g.ellipse(ex - 0.5, ey + 2, 1, 2.6, 0.3, 0, 7); g.stroke();
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
        const a = Math.sin(u * Math.PI), z = (5 + 6 * a) * Math.max(0.6, Math.min(1.6, s / 10)), X = x0 + p.r * s, Y = y0 + p.c * s;
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

  /* ---------- صفحه‌ی اصلی: نمایش زنده‌ی بافتن، وقتی بهش رسیدی خودکار شروع می‌شه ---------- */
  const steps = $("steps");
  if (steps && $("heroCanvas")) {
    const K = { K: "DB0010", W: "DB0200", R: "DB0727", O: "DB1133", Y: "DB0721", B: "DB0726", T: "DB0725", D: "DB1832", C: "DB0732", M: "DB1134" };
    const art = (rows) => rows.map((s) => [...s].map((ch) => K[ch]));
    const rep = (m, n, gap = []) => Array.from({ length: n }).flatMap(() => [...m, ...gap]);
    const EYE = ["BBBBBBBBBBB", "BBBBWWWBBBB", "BBWWTTTWWBB", "BWTTTKTTTWB", "BWTTKKKTTWB", "BWTTTKTTTWB", "BBWWTTTWWBB", "BBBBWWWBBBB", "BBBBBBBBBBB"];
    const DIA = ["MMMMDMMMM", "MMMDCDMMM", "MMDCCCDMM", "MDCCRCCDM", "DCCRRRCCD", "MDCCRCCDM", "MMDCCCDMM", "MMMDCDMMM", "MMMMDMMMM"];
    const HEART = ["WWWWWWWWWWW", "WWRRWWWRRWW", "WRRRRWRRRRW", "WRRRRRRRRRW", "WRRRRRRRRRW", "WWRRRRRRRWW", "WWWRRRRRWWW", "WWWWRRRWWWW", "WWWWWRWWWWW"];
    const STAR = ["KKKKYKKKK", "KKKKYKKKK", "KKYKYKYKK", "KKKYYYKKK", "YYYYOYYYY", "KKKYYYKKK", "KKYKYKYKK", "KKKKYKKKK", "KKKKYKKKK"];
    const DEMOS = [
      { name: "چشم‌نظر", data: art(rep(EYE, 3, ["BBBBBBBBBBB"])) },
      { name: "لوزی‌های طلایی", data: art(rep(DIA, 3)) },
      { name: "قلب", data: art(rep(HEART, 3)) },
      { name: "ستاره‌ی شب", data: art(rep(STAR, 3)) },
    ];
    const sec = document.createElement("section"); sec.className = "sec"; sec.id = "loom";
    sec.innerHTML = `<h2>ببین چطور می‌بافم</h2>
      <p class="lead">سوزن ردیف‌به‌ردیف می‌ره و برمی‌گرده، منجوق‌ها یکی‌یکی روی نخ می‌شینن. هر الگویی که توی استودیو می‌کشی، همین‌جوری برات بافته می‌شه.</p>
      <div class="dl-loom"><canvas aria-label="نمایش بافته شدن یک دستبند"></canvas><div class="dl-cap"><span class="n"></span><span class="nm"></span></div></div>
      <div class="btns"><a class="btn plum" href="builder.html">الگوی خودت رو بساز</a></div>`;
    steps.insertAdjacentElement("beforebegin", sec);
    const nEl = sec.querySelector(".n"), nmEl = sec.querySelector(".nm");
    const loom = Loom(sec.querySelector("canvas"), { maxH: () => Math.min(440, innerHeight * 0.6), tick: null });
    let i = 0, vis = false, timer = 0;
    loom.onProgress = (p, n) => { nEl.textContent = `${C.faNum(p)} از ${C.faNum(n)} منجوق`; };
    loom.onDone = () => { clearTimeout(timer); timer = setTimeout(() => { if (vis) run((i + 1) % DEMOS.length); }, 3000); };
    function run(k) { i = k; nmEl.innerHTML = `الگو: <b>${DEMOS[k].name}</b>`; loom.load(DEMOS[k].data); loom.play(); }
    loom.load(DEMOS[0].data); loom.skip(); nmEl.innerHTML = `الگو: <b>${DEMOS[0].name}</b>`; clearTimeout(timer);
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !vis) { vis = true; run(i); } else if (!e.isIntersecting && vis) { vis = false; loom.stop(); clearTimeout(timer); }
    }), { threshold: 0.4 }).observe(sec.querySelector(".dl-loom"));
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
