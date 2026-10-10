(() => {
  const top = document.querySelector(".top");
  const onScroll = () => top.classList.toggle("solid", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const chips = document.getElementById("chips");
  /* عکس واقعی منجوق‌ها: برای هر رنگ سعی می‌کنه img/beads/<کد رنگ>.jpg رو لود کنه (مثلاً DB0680.jpg).
     اگه jpg نبود png/webp رو امتحان می‌کنه؛ اگه هیچ عکسی نبود همون منجوق کشیده‌شده می‌مونه.
     دیگه لازم نیست کدها رو دستی این‌جا بنویسی؛ فقط اسم فایل باید دقیقاً کد رنگ باشه (حروف بزرگ). */
  const EXTS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
  const shade = (hex, k) => { const t = k < 0 ? 0 : 255; return `rgb(${CARA.hexRgb(hex).map((v) => Math.round(v + (t - v) * Math.abs(k))).join(",")})`; };
  const beadSVG = (hex, i) => `<svg viewBox="0 0 100 78" aria-hidden="true"><defs>
    <linearGradient id="b${i}" x1="0" x2="1"><stop offset="0" stop-color="${shade(hex, -0.38)}"/><stop offset=".3" stop-color="${shade(hex, 0.22)}"/><stop offset=".6" stop-color="${hex}"/><stop offset="1" stop-color="${shade(hex, -0.45)}"/></linearGradient>
    <radialGradient id="t${i}" cx=".4" cy=".35"><stop offset="0" stop-color="${shade(hex, 0.5)}"/><stop offset="1" stop-color="${shade(hex, -0.05)}"/></radialGradient></defs>
    <path d="M12 30v26c0 10 17 16 38 16s38-6 38-16V30z" fill="url(#b${i})"/><ellipse cx="50" cy="30" rx="38" ry="17" fill="url(#t${i})"/>
    <ellipse cx="50" cy="30" rx="17" ry="8" fill="${shade(hex, -0.7)}"/><ellipse cx="50" cy="28.5" rx="17" ry="6.2" fill="${shade(hex, -0.88)}" opacity=".75"/>
    <path d="M22 45c1 5 5 8 10 10" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  /* js/beads.js (با tools/build-beads.js ساخته می‌شه) می‌گه کدوم عکس‌ها واقعاً هستن؛ بدون اون همون امتحان پسوندها انجام می‌شه */
  const BF = CARA.beadFiles;
  const bead = (p, i) => !BF ? `<img src="img/beads/${p.code}.${EXTS[0]}" data-e="0" alt="${p.name}" loading="lazy">` : BF[p.code] ? `<img src="img/beads/${BF[p.code]}" data-e="${EXTS.length}" alt="${p.name}" loading="lazy">` : beadSVG(p.hex, i);
  CARA.palette.forEach((p, i) => chips.insertAdjacentHTML("beforeend", `<li data-i="${i}" tabindex="0" role="button" aria-label="کپی کد ${p.code}"><div class="bead">${bead(p, i)}</div><b>${p.code}</b><span>${p.name}</span></li>`));
  /* خطای لود عکس بابل نمی‌شه، پس توی فاز capture می‌گیریمش: ساختار بعدی یا برگشت به منجوق کشیده‌شده */
  chips.addEventListener("error", (e) => {
    const im = e.target; if (im.tagName !== "IMG") return;
    const n = Number(im.dataset.e) + 1, li = im.closest("li"), p = CARA.palette[Number(li.dataset.i)];
    if (n < EXTS.length) { im.dataset.e = n; im.src = `img/beads/${p.code}.${EXTS[n]}`; }
    else li.querySelector(".bead").innerHTML = beadSVG(p.hex, Number(li.dataset.i));
  }, true);

  /* چند عکس تصادفی از کارهای خودم (js/works.js با tools/build-works.js ساخته می‌شه) */
  const mg = document.getElementById("miniGal"), works = CARA.works || [];
  const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  if (mg) {
    if (!works.length) { const s = document.getElementById("samples"); if (s) s.hidden = true; }
    else {
      const pick = [...works].sort(() => Math.random() - 0.5).slice(0, 4);
      mg.innerHTML = pick.map((s) => `<a href="gallery.html#${encodeURIComponent(s.id)}"><img src="${esc(s.thumb)}" alt="${esc(s.title)}"${s.w ? ` width="${s.w}" height="${s.h}"` : ""} loading="lazy" decoding="async"><b>${esc(s.title)}</b>${s.note || (s.tags && s.tags[0]) ? `<span>${esc(s.note || s.tags[0])}</span>` : ""}</a>`).join("");
      mg.addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.closest("a").hidden = true; }, true);
    }
  }

  /* هیرو: زمین مهره؛ با اسکرول، مهره‌ها از وسط به دو طرف کنار می‌روند */
  const cv = document.getElementById("heroCanvas"), g = cv.getContext("2d"), hero = cv.parentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* پالت آرام و تک‌رنگ: طیف بنفش‌های خاکستری و فقط یک مهره‌ی طلایی در مرکز هر لوزی */
  const SET = ["#C5B6D9", "#9C86BB", "#7A5F9E", "#5F4780", "#4B3663", "#3A2B4D"], GOLD = "#B8975A";
  const R2 = 150 * 150, CW = 34, CH = 27, BASE = 0.6, BW = CW - 2, BH = CH - 2;
  let mx = -1, my = -1, W, H, cols, rows, ticking = false, cleared = false, sprites = [], jx, jy, ci;
  const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  /* هر رنگ یک بار روی بوم کوچک کشیده می‌شود و در هر فریم فقط drawImage می‌شود (چند برابر سریع‌تر از roundRect) */
  const sprite = (hex, d) => { const c = document.createElement("canvas"); c.width = Math.ceil(BW * d); c.height = Math.ceil(BH * d); const s = c.getContext("2d"); s.scale(d, d); CARA.drawBead(s, 0, 0, BW, BH, hex); return c; };
  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    cols = Math.ceil(W / CW) + 1; rows = Math.ceil(H / CH) + 1;
    sprites = [...SET, GOLD].map((h) => sprite(h, d));
    const n = cols * rows; jx = new Float32Array(n); jy = new Float32Array(n); ci = new Uint8Array(n);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x, dd = Math.abs((x % 14) - 7) + Math.abs((y % 14) - 7);
      jx[i] = 0.35 + rnd(x, y) * 0.4; jy[i] = (rnd(y, x) - 0.5) * 160; ci[i] = dd === 0 ? 6 : Math.min(5, Math.floor(dd / 2.4));
    }
    cleared = false; draw();
  }
  function draw() {
    const p = reduce ? 0 : Math.min(1, scrollY / (H * 0.85));
    if (p >= 1) { if (!cleared) { g.clearRect(0, 0, W, H); cleared = true; } return; }
    cleared = false; g.clearRect(0, 0, W, H);
    for (let y = 0; y < rows; y++) {
      const q = Math.min(1, Math.max(0, p * 1.6 - (y / rows) * 0.6)), e = q * q * (3 - 2 * q), a = (1 - e) * BASE;
      if (a < 0.02) continue;
      g.globalAlpha = a;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x, dir = (x + 0.5) * CW < W / 2 ? -1 : 1, px = x * CW + dir * e * W * jx[i] + 1;
        if (px > W || px + BW < 0) continue;
        const py = y * CH + e * jy[i] + 1;
        if (mx > 0) { /* هاله‌ی مهره‌ها دور نشانگر: نزدیک‌ترها طلایی می‌شوند */
          const dx = px + BW / 2 - mx, dy = py + BH / 2 - my, dd = dx * dx + dy * dy;
          if (dd < R2) { const k = 1 - dd / R2; g.globalAlpha = Math.min(1, a + k * 0.75); g.drawImage(sprites[k > 0.6 ? 6 : Math.max(0, ci[i] - 2)], px, py, BW, BH); g.globalAlpha = a; continue; }
        }
        g.drawImage(sprites[ci[i]], px, py, BW, BH);
      }
    }
    g.globalAlpha = 1;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { draw(); ticking = false; }); } }, { passive: true });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(size, 120); }); size();

  /* نخ مهره‌ای بالای صفحه = میزان اسکرول */
  const bar = document.getElementById("threadBar");
  const prog = () => { const m = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty("--p", (m > 0 ? (scrollY / m) * 100 : 0) + "%"); };
  addEventListener("scroll", prog, { passive: true }); prog();

  /* ورود نرم بخش‌ها هنگام اسکرول */
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    document.querySelectorAll(".sec h2, .lead, .path, .mini-gal a, .steps li, .chips li").forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--d", (i % 6) * 0.06 + "s"); io.observe(el); });
  }

  /* نشانگر روی هیرو */
  let pq = false;
  hero.addEventListener("pointermove", (e) => { if (reduce) return; const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (!pq) { pq = true; requestAnimationFrame(() => { draw(); pq = false; }); } });
  hero.addEventListener("pointerleave", () => { mx = -1; draw(); });

  /* کلیک روی هر رنگ = کپی کد */
  const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast);
  let tt;
  chips.addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    const code = li.querySelector("b").textContent;
    Promise.resolve(navigator.clipboard && navigator.clipboard.writeText(code)).catch(() => {}).finally(() => {
      toast.textContent = `کد ${code} کپی شد`; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("on"), 1600);
    });
  });
  /* با کیبورد هم می‌شه کد رنگ رو کپی کرد */
  chips.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.tagName === "LI") { e.preventDefault(); e.target.click(); } });
})();
