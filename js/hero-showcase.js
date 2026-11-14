/* hero-showcase.js — هیروی صفحه‌ی اصلی (فقط index.html)
   کاروسل سه‌بعدی عکس کارها، کلیک/کشیدن/کیبورد، کج‌شدن با ماوس و ذره‌های درخشان.
   جفت CSS: css/hero-showcase.css. مارک‌آپ استاتیکه؛ بدون JS هم هیرو کامل دیده می‌شه. */
(() => {
  "use strict";
  const root = document.querySelector(".hx");
  if (!root) return;
  const stage = root.querySelector(".hx__stage");
  const visual = root.querySelector(".hx__visual");
  const cards = Array.from(root.querySelectorAll(".hx-card"));
  const dots = Array.from(root.querySelectorAll(".hx__dot"));
  const count = root.querySelector(".hx__count");
  const prevBtn = root.querySelector(".hx__arrow--prev");
  const nextBtn = root.querySelector(".hx__arrow--next");
  const pauseBtn = root.querySelector(".hx__pause");
  const canvas = root.querySelector(".hx__sparks");
  const n = cards.length;
  if (!stage || !n) return;

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const fa = (v) => Number(v).toLocaleString("fa-IR");
  let cur = 0, timer = 0, onScreen = true, held = false, userPaused = false, dragged = false;

  /* ---------- جای کارت‌ها ---------- */
  function render() {
    cards.forEach((card, i) => {
      let o = (((i - cur) % n) + n) % n;
      if (o > n / 2) o -= n;
      card.dataset.pos = Math.abs(o) > 2 ? "far" : String(o);
      card.setAttribute("aria-hidden", o === 0 ? "false" : "true");
      const link = card.querySelector("a");
      if (link) link.tabIndex = o === 0 ? 0 : -1;
    });
    dots.forEach((d, i) => {
      if (i === cur) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
    if (count) count.textContent = fa(cur + 1) + " از " + fa(n);
  }

  /* ---------- پخش خودکار ---------- */
  const canPlay = () => !calm && !userPaused && onScreen && !document.hidden && !held;
  function restart() {
    clearInterval(timer);
    timer = 0;
    if (canPlay()) timer = setInterval(() => { cur = (cur + 1) % n; render(); }, 4800);
  }
  const go = (d) => { cur = (cur + d + n) % n; render(); restart(); };
  const goTo = (i) => { cur = i; render(); restart(); };

  if (prevBtn) prevBtn.addEventListener("click", () => go(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => go(1));
  dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
  if (pauseBtn) {
    if (calm) pauseBtn.hidden = true;
    pauseBtn.addEventListener("click", () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "ادامه‌ی نمایش خودکار" : "توقف نمایش خودکار");
      pauseBtn.textContent = userPaused ? "▶" : "❚❚";
      restart();
    });
  }
  if (visual) {
    visual.addEventListener("mouseenter", () => { if (!coarse) { held = true; restart(); } });
    visual.addEventListener("mouseleave", () => { held = false; restart(); });
    visual.addEventListener("focusin", () => { held = true; restart(); });
    visual.addEventListener("focusout", () => { held = false; restart(); });
  }

  /* کلیک روی کارت کناری = آوردنش وسط؛ کلیک روی کارت وسط = رفتن به گالری */
  stage.addEventListener("click", (e) => {
    const card = e.target.closest(".hx-card");
    if (!card) return;
    if (dragged) { e.preventDefault(); dragged = false; return; }
    if (card.dataset.pos !== "0") { e.preventDefault(); goTo(cards.indexOf(card)); }
  });

  /* کشیدن با انگشت/ماوس */
  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener("pointerdown", (e) => { tracking = true; dragged = false; sx = e.clientX; sy = e.clientY; });
  addEventListener("pointerup", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      dragged = true;
      go(dx < 0 ? 1 : -1);
      setTimeout(() => { dragged = false; }, 0);
    }
  });
  addEventListener("pointercancel", () => { tracking = false; });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(-1); }
  });
  /* عکسی که لود نشد، جای خالی/آیکن شکسته نشون نده */
  stage.addEventListener("error", (e) => { if (e.target && e.target.tagName === "IMG") e.target.style.visibility = "hidden"; }, true);

  /* ---------- کج‌شدن ملایم با ماوس ---------- */
  if (!calm && !coarse) {
    let raf = 0, tx = 0, ty = 0;
    const apply = () => {
      raf = 0;
      stage.style.setProperty("--ry", (tx * 10).toFixed(2) + "deg");
      stage.style.setProperty("--rx", (-ty * 7).toFixed(2) + "deg");
    };
    root.addEventListener("pointermove", (e) => {
      const r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    root.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (raf) cancelAnimationFrame(raf); apply(); });
  }

  /* ---------- ذره‌های درخشان (منجوق‌های شناور) ---------- */
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  let raf2 = 0, last = 0, w = 1, h = 1, parts = [];
  const COLORS = ["#cfae6c", "#e8d5a1", "#9b8fc1", "#d98aa6", "#8fb8d9", "#f3eef9"];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const spawn = (anywhere) => ({
    x: rnd(0, w), y: anywhere ? rnd(0, h) : h + rnd(4, 40), r: rnd(1.6, 4.6),
    vy: rnd(8, 26), vx: rnd(-6, 6), ph: rnd(0, 6.28), sp: rnd(0.6, 1.8),
    c: COLORS[(Math.random() * COLORS.length) | 0],
  });
  const sparksOn = () => !!ctx && onScreen && !document.hidden && !calm;

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph + t * p.sp));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = Math.min(1, a + 0.2);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.32, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    raf2 = 0;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    for (const p of parts) {
      p.y -= p.vy * dt;
      p.x += p.vx * dt + Math.sin(t * p.sp + p.ph) * 0.12;
      if (p.y < -10) Object.assign(p, spawn(false));
    }
    draw(t);
    if (sparksOn()) raf2 = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf2 && sparksOn()) { last = 0; raf2 = requestAnimationFrame(frame); } };
  function size() {
    const r = root.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.round(Math.min(46, Math.max(16, (w * h) / 26000)));
    while (parts.length < want) parts.push(spawn(true));
    parts.length = want;
    draw(performance.now() / 1000);
  }
  if (ctx) {
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(root);
    else addEventListener("resize", size);
  }

  /* ---------- وقتی هیرو دیده نمی‌شه، همه‌چیز می‌ایسته ---------- */
  const sync = () => { restart(); kick(); };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting;
      root.classList.toggle("is-off", !onScreen);
      sync();
    }, { threshold: 0 }).observe(root);
  }
  document.addEventListener("visibilitychange", sync);
  addEventListener("pagehide", () => { clearInterval(timer); if (raf2) cancelAnimationFrame(raf2); }, { once: true });

  render();
  sync();
})();
