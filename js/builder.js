/* builder.js — فقط صفحه‌ی سازنده (builder.html)
   ترتیب لود: palette.js ← builder.js ← decor.js
   داخلش (به همین ترتیب اجرا می‌شن؛ هر بخش به قبلی تکیه داره):
     ۱) الگوهای نمونه + رسم دستبند حلقه‌ای/نواری (CARA.samples, drawRing, drawStrip)
     ۲) استودیوی اصلی: بوم، ابزارها، پالت، خلاصه، ذخیره (CARA.studio)
     ۳) ابزارهای حرفه‌ای: متن به الگو، تبدیل‌ها، فایل، نسخه‌ها
     ۴) موبایل: پنل رنگ پایین‌آمدنی + حالت تمام‌صفحه */

/* ==================================================================
   ۱) الگوهای نمونه و رسم دستبند (قبلاً patterns.js)
   ================================================================== */
try {
/* نمونه الگوها + رسم دستبند حلقه‌ای. برای اضافه کردن الگوی خودت آخر فایل را ببین. */
(() => {
  const C = window.CARA;
  const K = { K: "DB0010", W: "DB0200", R: "DB0727", O: "DB1133", Y: "DB0721", G: "DB0724", B: "DB0726", T: "DB0725", P: "DB2359", D: "DB1832", C: "DB0732", M: "DB1134" };
  const rep = (motif, n, gap = []) => Array.from({ length: n }).flatMap(() => [...motif, ...gap]);
  const fromArt = (rows) => rows.map((s) => [...s].map((ch) => K[ch]));
  const gen = (w, h, fn) => Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => K[fn(r, c)]));

  const EYE = ["BBBBBBBBBBB", "BBBBWWWBBBB", "BBWWTTTWWBB", "BWTTTKTTTWB", "BWTTKKKTTWB", "BWTTTKTTTWB", "BBWWTTTWWBB", "BBBBWWWBBBB", "BBBBBBBBBBB"];
  const DIA = ["MMMMDMMMM", "MMMDCDMMM", "MMDCCCDMM", "MDCCRCCDM", "DCCRRRCCD", "MDCCRCCDM", "MMDCCCDMM", "MMMDCDMMM", "MMMMDMMMM"];
  const HEART = ["WWWWWWWWWWW", "WWRRWWWRRWW", "WRRRRWRRRRW", "WRRRRRRRRRW", "WRRRRRRRRRW", "WWRRRRRRRWW", "WWWRRRRRWWW", "WWWWRRRWWWW", "WWWWWRWWWWW"];
  const STAR = ["KKKKYKKKK", "KKKKYKKKK", "KKYKYKYKK", "KKKYYYKKK", "YYYYOYYYY", "KKKYYYKKK", "KKYKYKYKK", "KKKKYKKKK", "KKKKYKKKK"];
  const sunset = ["D", "O", "R", "M", "P", "B"];
  const rainbow = ["R", "O", "Y", "G", "T", "B", "P"];

  /* photo: اگه از دستبند بافته‌شده‌ات عکس داری، مسیرش رو بنویس (مثلاً "img/gallery/eye.jpg") */
  const S = [
    { id: "eye", title: "چشم‌نظر", tags: ["سنتی", "آبی"], note: "آبی و فیروزه‌ای؛ چشم بد دور.", data: fromArt(rep(EYE, 5, ["BBBBBBBBBBB", "BBBBBBBBBBB"])) },
    { id: "diamond", title: "لوزی‌های طلایی", tags: ["سنتی", "هندسی"], note: "عنابی با لوزی طلایی؛ یه حس ترمه و قالی می‌ده.", data: fromArt(rep(DIA, 6)) },
    { id: "sunset", title: "غروب", tags: ["رنگارنگ"], note: "از طلایی تا آبی، مثل آسمون یه غروب تابستونی.", data: gen(11, 48, (r) => sunset[Math.floor(r / 4) % 6]) },
    { id: "checker", title: "شطرنجی", tags: ["مینیمال", "هندسی"], note: "مشکی و سفید. ساده و همیشه‌شیک.", data: gen(8, 40, (r, c) => (((r >> 1) + (c >> 1)) % 2 ? "K" : "W")) },
    { id: "chevron", title: "زیگزاگ فیروزه‌ای", tags: ["هندسی", "مینیمال"], note: "فیروزه‌ای روی کرم؛ سبک و تابستونی.", data: gen(11, 44, (r, c) => ((r + Math.abs(c - 5)) % 8 < 4 ? "T" : "C")) },
    { id: "heart", title: "قلب", tags: ["عاشقانه"], note: "قرمز روی سفید. برای کادو خیلی می‌شینه.", data: fromArt(rep(HEART, 5)) },
    { id: "star", title: "ستاره‌ی شب", tags: ["هندسی", "عاشقانه"], note: "زرد روی مشکی، مثل ستاره توی شب.", data: fromArt(rep(STAR, 5)) },
    { id: "rainbow", title: "رنگین‌کمان", tags: ["رنگارنگ"], note: "مورب و شاد، هفت‌رنگ.", data: gen(10, 42, (r, c) => rainbow[((r + c) >> 1) % 7]) },
  ];
  S.forEach((s) => { const n = {}; s.data.forEach((row) => row.forEach((c) => (n[c] = (n[c] || 0) + 1))); s.st = { n, colors: Object.keys(n).length, total: s.data.length * s.data[0].length };
    s.level = s.st.colors <= 2 ? "راحت" : s.st.colors <= 4 ? "متوسط" : "وقت‌گیر";
    s.hay = [s.title, s.note, ...s.tags, ...Object.keys(n).map((c) => C.byCode(c).name)].join(" "); });
  C.samples = S;

  /* دستبند حلقه‌ای: هر ردیف الگو یک زاویه دور مچ، هر ستون یک لایه از داخل به بیرون */
  C.drawRing = (cv, data, size) => {
    const h = data.length, w = data[0].length, d = Math.min(2, devicePixelRatio || 1), R = size / 2 - 10, cx = size / 2, cy = size / 2;
    const T = Math.min(R * 0.34, (2 * Math.PI * R) / (h / w + Math.PI)), r0 = R - T, a = (2 * Math.PI) / h, rot = -Math.PI / 2;
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, size, size);
    const ann = () => { g.beginPath(); g.arc(cx, cy, R, 0, 7); g.arc(cx, cy, r0, 0, 7, true); };
    g.save(); g.shadowColor = "rgba(27,18,38,.3)"; g.shadowBlur = 14; g.shadowOffsetY = 7; g.fillStyle = "#999"; ann(); g.fill(); g.restore();
    g.lineWidth = 0.7; g.strokeStyle = "rgba(0,0,0,.28)";
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      g.beginPath(); g.arc(cx, cy, r0 + (T * (c + 1)) / w, rot + r * a, rot + (r + 1) * a + 0.004);
      g.arc(cx, cy, r0 + (T * c) / w, rot + (r + 1) * a + 0.004, rot + r * a, true); g.closePath();
      g.fillStyle = C.byCode(data[r][c]).hex; g.fill(); g.stroke();
    }
    const rg = g.createRadialGradient(cx, cy, r0, cx, cy, R);
    rg.addColorStop(0, "rgba(0,0,0,.35)"); rg.addColorStop(0.3, "rgba(0,0,0,0)"); rg.addColorStop(0.65, "rgba(255,255,255,.22)"); rg.addColorStop(1, "rgba(0,0,0,.3)");
    g.fillStyle = rg; ann(); g.fill();
    const lg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    lg.addColorStop(0, "rgba(255,255,255,.4)"); lg.addColorStop(0.5, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(0,0,0,.3)");
    g.fillStyle = lg; ann(); g.fill();
  };

  /* دستبند بازشده به شکل نوار */
  C.drawStrip = (cv, data, W) => {
    const h = data.length, w = data[0].length, d = Math.min(2, devicePixelRatio || 1), s = Math.min(12, (W - 8) / h), H = w * s + 8;
    cv.width = W * d; cv.height = H * d; cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const x = 4 + r * s, y = 4 + c * s, hex = C.byCode(data[r][c]).hex; if (s >= 5) C.drawBead(g, x, y, s, s, hex); else { g.fillStyle = hex; g.fillRect(x, y, s + 0.5, s + 0.5); } }
  };

  /* الگوی خودت: با حروف بالا بنویس (هر حرف = یک رنگ از جدول K) و اینجا اضافه کن، مثل:
     S.push({ id: "mine", title: "اسم الگو", tags: ["هندسی"], note: "توضیح کوتاه", photo: "img/gallery/mine.jpg", data: fromArt([...]) }) */
})();
} catch (e) { console.error('builder:patterns', e); }

/* ==================================================================
   ۲) استودیوی اصلی (قبلاً builder.js)
   ================================================================== */
try {
(() => {
  const C = CARA, L = C.L, $ = (id) => document.getElementById(id);
  const canvas = $("grid"), ctx = canvas.getContext("2d"), wrap = $("gridWrap"), wIn = $("w"), hIn = $("h");
  const M = 30, T = 22;
  const SHAPES = new Set(["line", "rect", "ellipse"]);
  const TOOL_NAME = { brush: "قلم", eraser: "پاک‌کن", fill: "سطل", pan: "جابه‌جایی", pick: "قطره‌چکان", line: "خط", rect: "مستطیل", ellipse: "بیضی", select: "انتخاب" };
  const empty = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let w = L.DEF_W, h = L.DEF_H, data = empty(w, h), sel = C.palette[0].code, tool = "brush";
  let panning = null, space = false, mirror = false, erasing = false, painting = false, last = null, history = [], redo = [], cw = 24, ch = 20, saveT, sumQ = false;
  let zoom = 1, fillShapes = false, drag = null, snap = null, track = null, selRect = null, selDrag = null, clip = null, hover = null, recent = [];

  /* الگوی اشتراکی در fragment لینک قرار دارد؛ داده‌ای به سرور فرستاده نمی‌شود. */
  const shared = window.CARA_PATTERN_SHARE
    ? window.CARA_PATTERN_SHARE.parseHash(location.hash, C.palette, L)
    : null;
  if (shared) history.replaceState(null, "", location.pathname + location.search);
  const saved = C.loadPattern();
  if (shared) { data = shared.data; w = shared.width; h = shared.height; }
  else if (saved) { data = saved.data; w = saved.width; h = saved.height; }
  wIn.value = w; hIn.value = h;
  try { recent = (JSON.parse(localStorage.getItem("cara-recent")) || []).filter((c) => C.byCode(c)).slice(0, 8); } catch {}

  /* پالت */
  const pal = $("palette");
  C.palette.forEach((p) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.style.setProperty("--c", p.hex); b.title = `${p.code} — ${p.name}`;
    b.setAttribute("aria-label", b.title); b.setAttribute("aria-pressed", p.code === sel); b.dataset.code = p.code;
    b.onclick = () => selectColor(p.code);
    pal.appendChild(b);
  });
  function selectColor(code) {
    if (!C.byCode(code)) return;
    sel = code;
    if (tool === "eraser" || tool === "pan" || tool === "pick") setTool("brush");
    recent = [code, ...recent.filter((c) => c !== code)].slice(0, 8);
    try { localStorage.setItem("cara-recent", JSON.stringify(recent)); } catch {}
    showSel();
  }
  function showSel() {
    const p = C.byCode(sel);
    pal.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", b.dataset.code === sel));
    $("curDot").style.setProperty("--c", p.hex); $("curName").textContent = p.name; $("curCode").textContent = p.code;
    const rc = $("recent");
    if (rc) rc.innerHTML = recent.map((c) => { const q = C.byCode(c); return `<button type="button" class="sp-rc" data-code="${c}" style="--c:${q.hex}" title="${c} — ${q.name}" aria-label="${c} ${q.name}" aria-pressed="${c === sel}"></button>`; }).join("");
    document.dispatchEvent(new CustomEvent("studio:color"));
  }
  if ($("recent")) $("recent").addEventListener("click", (e) => { const b = e.target.closest("[data-code]"); if (b) selectColor(b.dataset.code); });

  /* ابزارها */
  function setTool(t) {
    tool = t; $("toolName").textContent = TOOL_NAME[t] || t;
    document.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === t));
    canvas.style.touchAction = "none";
    canvas.style.cursor = t === "pan" ? "grab" : t === "select" ? "cell" : "crosshair";
  }
  document.querySelectorAll("[data-tool]").forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  $("mirror").onclick = (e) => { mirror = !mirror; e.currentTarget.setAttribute("aria-pressed", mirror); };
  if ($("shapeFill")) $("shapeFill").onclick = (e) => { fillShapes = !fillShapes; e.currentTarget.setAttribute("aria-pressed", fillShapes); };

  /* رسم */
  function drawCell(g, r, c, cw, ch, ox, oy) {
    const x = ox + c * cw, y = oy + r * ch, code = data[r][c];
    g.fillStyle = "#EFECF4"; g.fillRect(x + 1, y + 1, cw - 1, ch - 1);
    if (code) C.drawBead(g, x + 1, y + 1, cw - 1, ch - 1, C.byCode(code).hex);
  }
  function paintGrid(g, cw, ch, ox, oy) {
    g.fillStyle = "#D3CCDD"; g.fillRect(ox, oy, w * cw + 1, h * ch + 1);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) drawCell(g, r, c, cw, ch, ox, oy);
    /* خط راهنما هر ۵ خونه (پررنگ‌تر هر ۱۰) تا شمردن راحت باشه */
    for (let c = 5; c < w; c += 5) { g.fillStyle = c % 10 ? "#A99BC0" : "#7E6A9C"; g.fillRect(ox + c * cw, oy, 1, h * ch + 1); }
    for (let r = 5; r < h; r += 5) { g.fillStyle = r % 10 ? "#A99BC0" : "#7E6A9C"; g.fillRect(ox, oy + r * ch, w * cw + 1, 1); }
    g.fillStyle = "#6C6478"; g.font = `${clamp(ch * 0.6, 9, 12)}px Vazirmatn,Tahoma,sans-serif`;
    g.textBaseline = "middle";
    g.textAlign = "right";
    for (let r = 0; r < h; r++) if (r === 0 || (r + 1) % 5 === 0) g.fillText(r + 1, ox - 6, oy + r * ch + ch / 2);
    g.textAlign = "center";
    for (let c = 0; c < w; c++) if (c === 0 || (c + 1) % 5 === 0) g.fillText(c + 1, ox + c * cw + cw / 2, oy - 10);
  }
  function layout() {
    const base = clamp(Math.floor((wrap.clientWidth - 28 - M) / w), 12, 30);
    cw = clamp(Math.round(base * zoom), 6, 60); ch = Math.round(cw / L.BEAD_ASPECT);
    const d = devicePixelRatio || 1, W = M + w * cw + 4, H = T + h * ch + 4;
    canvas.width = W * d; canvas.height = H * d; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0); paintGrid(ctx, cw, ch, M, T); updateSelBox();
  }
  function setZoom(z) {
    zoom = clamp(Math.round(z * 100) / 100, 0.5, 2.5);
    if ($("zoom")) $("zoom").value = Math.round(zoom * 100);
    if ($("zoomOut")) $("zoomOut").textContent = C.faNum(Math.round(zoom * 100)) + "٪";
    layout();
  }
  if ($("zoom")) $("zoom").oninput = (e) => setZoom(e.target.value / 100);
  wrap.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1)); }, { passive: false });

  /* ویرایش */
  const cellFrom = (e, clampIt) => {
    const b = canvas.getBoundingClientRect();
    let c = Math.floor((e.clientX - b.left - M) / cw), r = Math.floor((e.clientY - b.top - T) / ch);
    if (clampIt) return [clamp(r, 0, h - 1), clamp(c, 0, w - 1)];
    return r >= 0 && r < h && c >= 0 && c < w ? [r, c] : null;
  };
  function put(r, c, v) {
    if (r < 0 || c < 0 || r >= h || c >= w) return;
    if (track) track.add((r << 6) | c);
    data[r][c] = v; drawCell(ctx, r, c, cw, ch, M, T);
  }
  function setCell(r, c, v) {
    put(r, c, v);
    if (mirror && w - 1 - c !== c) put(r, w - 1 - c, v);
  }
  const val = () => (tool === "eraser" || erasing ? null : sel);
  function rasterLine(a, b, plot) {
    let [r, c] = a; const dr = Math.abs(b[0] - r), dc = Math.abs(b[1] - c), sr = r < b[0] ? 1 : -1, sc = c < b[1] ? 1 : -1;
    let err = dc - dr;
    for (;;) {
      plot(r, c);
      if (r === b[0] && c === b[1]) break;
      const e2 = 2 * err;
      if (e2 > -dr) { err -= dr; c += sc; }
      if (e2 < dc) { err += dc; r += sr; }
    }
  }
  function rasterRect(a, b, filled, plot) {
    const r0 = Math.min(a[0], b[0]), r1 = Math.max(a[0], b[0]), c0 = Math.min(a[1], b[1]), c1 = Math.max(a[1], b[1]);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (filled || r === r0 || r === r1 || c === c0 || c === c1) plot(r, c);
  }
  function rasterEllipse(a, b, filled, plot) {
    const r0 = Math.min(a[0], b[0]), r1 = Math.max(a[0], b[0]), c0 = Math.min(a[1], b[1]), c1 = Math.max(a[1], b[1]);
    const cr = (r0 + r1) / 2, cc = (c0 + c1) / 2, ra = (r1 - r0) / 2 + 0.5, rb = (c1 - c0) / 2 + 0.5;
    const inside = (r, c) => ((r - cr) / ra) ** 2 + ((c - cc) / rb) ** 2 <= 1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!inside(r, c)) continue;
      if (filled || !(inside(r - 1, c) && inside(r + 1, c) && inside(r, c - 1) && inside(r, c + 1))) plot(r, c);
    }
  }
  const line = (a, b) => rasterLine(a, b, (r, c) => setCell(r, c, val()));
  function constrain(a, b) { /* Shift: خط ۰/۴۵/۹۰ درجه، مستطیل و بیضی مربع و دایره */
    let dr = b[0] - a[0], dc = b[1] - a[1];
    if (tool === "line") {
      const ar = Math.abs(dr), ac = Math.abs(dc);
      if (ar > 2 * ac) dc = 0; else if (ac > 2 * ar) dr = 0; else { const d = Math.max(ar, ac); dr = Math.sign(dr) * d; dc = Math.sign(dc) * d; }
    } else { const d = Math.max(Math.abs(dr), Math.abs(dc)); dr = (Math.sign(dr) || 1) * d; dc = (Math.sign(dc) || 1) * d; }
    return [a[0] + dr, a[1] + dc];
  }
  function drawShape(shift) {
    const a = drag.a, b = shift ? constrain(drag.a, drag.b) : drag.b, v = val(), plot = (r, c) => setCell(r, c, v);
    if (tool === "line") rasterLine(a, b, plot); else if (tool === "rect") rasterRect(a, b, fillShapes, plot); else rasterEllipse(a, b, fillShapes, plot);
  }
  function redrawShape(shift) {
    track.forEach((k) => { const r = k >> 6, c = k & 63; data[r][c] = snap[r][c]; drawCell(ctx, r, c, cw, ch, M, T); });
    track = new Set(); drawShape(shift);
  }
  function fill([r0, c0]) {
    const target = data[r0][c0], v = val(); if (target === v) return;
    const st = [[r0, c0]];
    while (st.length) {
      const [r, c] = st.pop();
      if (r < 0 || c < 0 || r >= h || c >= w || data[r][c] !== target) continue;
      setCell(r, c, v); st.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
  }

  /* انتخاب، کپی و چسباندن */
  const selBox = document.createElement("i"); selBox.className = "sp-sel"; selBox.hidden = true; wrap.appendChild(selBox);
  function updateSelBox() {
    if (!selRect) { selBox.hidden = true; return; }
    const r0 = Math.min(selRect.r0, selRect.r1), r1 = Math.max(selRect.r0, selRect.r1), c0 = Math.min(selRect.c0, selRect.c1), c1 = Math.max(selRect.c0, selRect.c1);
    selBox.hidden = false;
    selBox.style.cssText = `left:${canvas.offsetLeft + M + c0 * cw}px;top:${canvas.offsetTop + T + r0 * ch}px;width:${(c1 - c0 + 1) * cw}px;height:${(r1 - r0 + 1) * ch}px`;
  }
  const selBounds = () => selRect && ({ r0: Math.min(selRect.r0, selRect.r1), r1: Math.max(selRect.r0, selRect.r1), c0: Math.min(selRect.c0, selRect.c1), c1: Math.max(selRect.c0, selRect.c1) });
  function copySel(cut) {
    const s = selBounds(); if (!s) return false;
    clip = data.slice(s.r0, s.r1 + 1).map((row) => row.slice(s.c0, s.c1 + 1));
    if (cut) clearSel();
    document.dispatchEvent(new CustomEvent("studio:clip"));
    return true;
  }
  function clearSel() {
    const s = selBounds(); if (!s) return;
    pushHistory();
    for (let r = s.r0; r <= s.r1; r++) for (let c = s.c0; c <= s.c1; c++) { data[r][c] = null; drawCell(ctx, r, c, cw, ch, M, T); }
    changed();
  }
  function pasteAt(r0, c0) {
    if (!clip) return;
    pushHistory();
    clip.forEach((row, r) => row.forEach((v, c) => { /* خونه‌های خالی کلیپ‌بورد چیزی رو پاک نمی‌کنن */
      const rr = r0 + r, cc = c0 + c; if (v && rr < h && cc < w) { data[rr][cc] = v; drawCell(ctx, rr, cc, cw, ch, M, T); }
    }));
    selRect = { r0, c0, r1: Math.min(h - 1, r0 + clip.length - 1), c1: Math.min(w - 1, c0 + clip[0].length - 1) };
    updateSelBox(); changed();
  }

  const snapshot = () => JSON.stringify({ w, h, data });
  const pushHistory = () => { redo.length = 0; history.push(snapshot()); if (history.length > 80) history.shift(); };
  canvas.addEventListener("pointerdown", (e) => {
    if (tool === "pan" || e.button === 1 || space) { /* جابه‌جایی: کشیدن با موس/لمس، دکمه‌ی وسط یا نگه داشتن Space */
      e.preventDefault(); panning = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop };
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; return;
    }
    const cell = cellFrom(e); if (!cell) { if (tool === "select") { selRect = null; updateSelBox(); } return; }
    if (tool === "pick" || e.altKey) { /* قطره‌چکان: رنگ خونه‌ی زیر نشانگر (Alt+کلیک یا کلید I) */
      const code = data[cell[0]][cell[1]];
      if (code) selectColor(code);
      return;
    }
    if (tool === "select") {
      selDrag = cell; selRect = { r0: cell[0], c0: cell[1], r1: cell[0], c1: cell[1] }; updateSelBox(); canvas.setPointerCapture(e.pointerId); return;
    }
    erasing = e.button === 2; pushHistory(); canvas.setPointerCapture(e.pointerId);
    if (tool === "fill") { fill(cell); changed(); return; }
    if (SHAPES.has(tool)) { snap = data.map((r) => r.slice()); drag = { a: cell, b: cell }; track = new Set(); drawShape(e.shiftKey); return; }
    painting = true; last = cell; setCell(cell[0], cell[1], val()); queueSummary();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (panning) { wrap.scrollLeft = panning.l - (e.clientX - panning.x); wrap.scrollTop = panning.t - (e.clientY - panning.y); return; }
    if (selDrag) { const cell = cellFrom(e, true); selRect.r1 = cell[0]; selRect.c1 = cell[1]; updateSelBox(); return; }
    if (drag) { const cell = cellFrom(e, true); if (cell[0] !== drag.b[0] || cell[1] !== drag.b[1] || drag.sh !== e.shiftKey) { drag.b = cell; drag.sh = e.shiftKey; redrawShape(e.shiftKey); queueSummary(); } return; }
    if (!painting) return; const cell = cellFrom(e);
    if (cell && (cell[0] !== last[0] || cell[1] !== last[1])) { line(last, cell); last = cell; queueSummary(); }
  });
  const stop = () => {
    if (panning) { panning = null; setTool(tool); }
    if (selDrag) selDrag = null;
    if (drag) { drag = null; track = null; snap = null; changed(); }
    if (painting) { painting = false; changed(); }
  };
  canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function applyState(s) {
    w = s.w; h = s.h; data = s.data; wIn.value = w; hIn.value = h;
    if (selRect && (selRect.r0 >= h || selRect.c0 >= w || selRect.r1 >= h || selRect.c1 >= w)) selRect = null;
    layout(); changed();
  }
  $("undo").onclick = () => { const p = history.pop(); if (p) { redo.push(snapshot()); applyState(JSON.parse(p)); } };
  const doRedo = () => { const p = redo.pop(); if (p) { history.push(snapshot()); applyState(JSON.parse(p)); } };
  if ($("redo")) $("redo").onclick = doRedo;
  $("clear").onclick = () => { if (data.some((r) => r.some(Boolean)) && !confirm("همه‌ی طرح پاک بشه؟ (با «برگشت» می‌تونی برش گردونی)")) return; pushHistory(); data = empty(w, h); layout(); changed(); };
  function resize() {
    pushHistory();
    const nw = clamp(Number(wIn.value) || L.DEF_W, 1, L.MAX_W), nh = clamp(Number(hIn.value) || L.DEF_H, 1, L.MAX_H), nd = empty(nw, nh);
    for (let r = 0; r < Math.min(h, nh); r++) for (let c = 0; c < Math.min(w, nw); c++) nd[r][c] = data[r][c];
    applyState({ w: nw, h: nh, data: nd });
  }
  wIn.onchange = hIn.onchange = resize;

  /* خلاصه و ذخیره */
  function summary() {
    const counts = {}; let total = 0;
    data.forEach((row) => row.forEach((c) => { if (c) { total++; counts[c] = (counts[c] || 0) + 1; } }));
    $("total").textContent = C.faNum(total); $("dimText").textContent = `${C.faNum(w)} × ${C.faNum(h)}`;
    $("warn").hidden = w <= L.WARN_W;
    $("colors").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([code, n]) => {
      const p = C.byCode(code); return `<div class="color-row" data-code="${code}" role="button" tabindex="0" title="انتخاب این رنگ"><i class="dot" style="--c:${p.hex}"></i><small>${p.code} · ${p.name}</small><b>${C.faNum(n)}</b></div>`;
    }).join("");
    drawWrist();
    return { counts, total };
  }
  $("colors").addEventListener("click", (e) => { const r = e.target.closest("[data-code]"); if (r) selectColor(r.dataset.code); });
  $("colors").addEventListener("keydown", (e) => { const r = e.target.closest("[data-code]"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectColor(r.dataset.code); } });
  function queueSummary() { if (!sumQ) { sumQ = true; requestAnimationFrame(() => { sumQ = false; summary(); }); } }
  function changed() {
    summary(); $("saved").textContent = "";
    clearTimeout(saveT); saveT = setTimeout(() => { C.savePattern(w, h, data); $("saved").textContent = "ذخیره شد ✓"; }, 350);
    document.dispatchEvent(new CustomEvent("studio:change"));
  }
  addEventListener("pagehide", () => C.savePattern(w, h, data));
  $("next").addEventListener("click", (e) => {
    if (!summary().total) { e.preventDefault(); $("saved").textContent = "اول چندتا منجوق بچین."; return; }
    C.savePattern(w, h, data);
  });

  /* ساخت لینک قابل‌اشتراک از خود الگو؛ طرح در hash است و به سرور ارسال نمی‌شود. */
  const shareButton = $("shareLink");
  if (shareButton) shareButton.onclick = async () => {
    const hash = window.CARA_PATTERN_SHARE
      ? window.CARA_PATTERN_SHARE.makeHash(data, C.palette)
      : "";
    if (!hash) return;
    const url = location.origin + location.pathname + location.search + hash;
    try {
      if (navigator.share) await navigator.share({ title: "الگوی دستبند کارا", url });
      else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        const label = shareButton.getAttribute("aria-label");
        shareButton.setAttribute("aria-label", "لینک کپی شد");
        shareButton.dataset.tip = "لینک کپی شد";
        setTimeout(() => { shareButton.setAttribute("aria-label", label || "اشتراک‌گذاری الگو"); shareButton.dataset.tip = "اشتراک‌گذاری الگو"; }, 1800);
      } else {
        const field = document.createElement("textarea");
        field.value = url; field.setAttribute("readonly", ""); field.style.position = "fixed"; field.style.opacity = "0";
        document.body.appendChild(field); field.select();
        const copied = document.execCommand("copy"); field.remove();
        if (!copied) window.prompt("این لینک را کپی کن:", url);
      }
    } catch (e) {
      if (e && e.name !== "AbortError") window.prompt("لینک الگو:", url);
    }
  };

  /* خروجی چارت */
  $("export").onclick = () => {
    const { counts } = summary(), rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const cw2 = 26, ch2 = Math.round(cw2 / L.BEAD_ASPECT), gw = M + w * cw2 + 4, LW = 300;
    const W = gw + 24 + LW, H = Math.max(T + h * ch2 + 20, 60 + rows.length * 30);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    paintGrid(g, cw2, ch2, M, T);
    g.font = "14px Vazirmatn,Tahoma,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle";
    rows.forEach(([code, n], i) => {
      const p = C.byCode(code), y = 30 + i * 30;
      C.drawBead(g, gw + 24, y - 10, 26, 20, p.hex); g.fillStyle = "#1B1226"; g.fillText(`${p.code}  ${p.name}  ×${n}`, gw + 60, y);
    });
    const a = document.createElement("a"); a.download = "cara-pattern.png"; a.href = c.toDataURL("image/png"); a.click();
  };

  /* کیبورد */
  const KEYS = { b: "brush", e: "eraser", g: "fill", i: "pick", l: "line", r: "rect", o: "ellipse", s: "select" };
  addEventListener("keydown", (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.code === "Space" && !/BUTTON|A/.test(document.activeElement.tagName)) { e.preventDefault(); if (!space) { space = true; canvas.style.cursor = "grab"; } return; }
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === "z" && !e.shiftKey) { e.preventDefault(); $("undo").click(); }
    else if (mod && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); doRedo(); }
    else if (mod && k === "c") { if (copySel(false)) e.preventDefault(); }
    else if (mod && k === "x") { if (copySel(true)) e.preventDefault(); }
    else if (mod && k === "v") { if (clip) { e.preventDefault(); const s = selBounds(), t = hover || (s ? [s.r0, s.c0] : [0, 0]); pasteAt(t[0], t[1]); } }
    else if (mod && k === "a") { e.preventDefault(); setTool("select"); selRect = { r0: 0, c0: 0, r1: h - 1, c1: w - 1 }; updateSelBox(); }
    else if ((k === "delete" || k === "backspace") && selRect) { e.preventDefault(); clearSel(); }
    else if (k === "escape") { selRect = null; updateSelBox(); }
    else if (!mod && KEYS[k]) setTool(KEYS[k]);
  });
  addEventListener("keyup", (e) => { if (e.code === "Space" && space) { space = false; setTool(tool); } });
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  /* پیش‌نمایش دستبند: الگو ۹۰ درجه (در جهت ساعت) چرخیده و مثل استوانه سایه‌زده روی مچ */
  /* جهت پیش‌نمایش مچ: FLIP_ROWS = ردیف اول سمت راست (به‌جای چپ)، FLIP_COLS = ستون اول پایین (به‌جای بالا). هر کدوم true/false = یه آینه‌ی ساده. */
  const FLIP_ROWS = false, FLIP_COLS = true;
  function drawWrist() {
    const cv = $("wrist"), Wd = Math.max(140, cv.parentElement.clientWidth - 20), d = devicePixelRatio || 1;
    const s = Math.max(1, Math.min(8, (Wd - 60) / h, 110 / w)), len = h * s, wid = w * s, Ht = Math.round(wid + 40), x0 = (Wd - len) / 2, y0 = 20;
    cv.width = Wd * d; cv.height = Ht * d; cv.style.width = Wd + "px"; cv.style.height = Ht + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, Wd, Ht);
    g.strokeStyle = "#B8975A"; g.lineWidth = 2; g.beginPath(); g.moveTo(4, Ht / 2); g.lineTo(x0, Ht / 2); g.moveTo(Wd - 4, Ht / 2); g.lineTo(x0 + len, Ht / 2); g.stroke();
    g.save(); g.beginPath(); g.roundRect(x0, y0, len, wid, Math.min(10, wid / 2)); g.clip();
    g.fillStyle = "#EFECF4"; g.fillRect(x0, y0, len, wid);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const code = data[r][c]; if (!code) continue;
      const x = x0 + (FLIP_ROWS ? h - 1 - r : r) * s, y = y0 + (FLIP_COLS ? w - 1 - c : c) * s, hex = C.byCode(code).hex;
      if (s >= 5) C.drawBead(g, x, y, s, s, hex); else { g.fillStyle = hex; g.fillRect(x, y, s + 0.6, s + 0.6); }
    }
    const sh = g.createLinearGradient(0, y0, 0, y0 + wid);
    sh.addColorStop(0, "rgba(255,255,255,.45)"); sh.addColorStop(0.3, "rgba(255,255,255,0)"); sh.addColorStop(0.65, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.42)");
    g.fillStyle = sh; g.fillRect(x0, y0, len, wid); g.restore();
    g.fillStyle = "#B8975A"; [x0 - 5, x0 + len + 5].forEach((x) => { g.beginPath(); g.arc(x, Ht / 2, 5, 0, 7); g.fill(); });
  }
  addEventListener("resize", drawWrist);

  /* مهره‌ی شبح زیر نشانگر + مختصات خانه */
  const ghost = $("ghost");
  canvas.addEventListener("pointermove", (e) => {
    const cell = tool === "pan" || panning || space ? null : cellFrom(e);
    hover = cell;
    if (!cell || tool === "select") { ghost.hidden = true; $("pos").textContent = cell ? `ردیف ${C.faNum(cell[0] + 1)} · ستون ${C.faNum(cell[1] + 1)}` : "—"; return; }
    ghost.hidden = false;
    ghost.style.cssText = `left:${canvas.offsetLeft + M + cell[1] * cw}px;top:${canvas.offsetTop + T + cell[0] * ch}px;width:${cw}px;height:${ch}px`;
    ghost.style.setProperty("--c", tool === "eraser" ? "transparent" : C.byCode(sel).hex);
    $("pos").textContent = `ردیف ${C.faNum(cell[0] + 1)} · ستون ${C.faNum(cell[1] + 1)}`;
  });
  canvas.addEventListener("pointerleave", () => { ghost.hidden = true; hover = null; });

  /* API برای studio-pro.js (متن به الگو، تبدیل‌ها، فایل‌ها) */
  C.studio = {
    get w() { return w; }, get h() { return h; }, get data() { return data; }, get sel() { return sel; },
    get hasClip() { return !!clip; },
    select: selectColor,
    /* fn یک state جدید {w,h,data} برمی‌گردونه (یا data رو درجا عوض می‌کنه)؛ undo هم کار می‌کنه */
    edit(fn) { pushHistory(); const st = { w, h, data: data.map((r) => r.slice()) }; applyState(fn(st) || st); },
    load(s) { pushHistory(); applyState(s); },
  };

  showSel(); setTool("brush"); layout(); summary(); setZoom(1);
  document.dispatchEvent(new CustomEvent("studio:change"));
})();
} catch (e) { console.error('builder:main', e); }

/* ==================================================================
   ۳) ابزارهای حرفه‌ای (قبلاً studio-pro.js)
   ================================================================== */
try {
/* ابزارهای حرفه‌ای استودیو: متن به الگو، تبدیل‌ها، فایل و نسخه‌ها (با نوار تب‌های جمع‌وجور).
   بعد از builder.js لود می‌شه و از CARA.studio استفاده می‌کنه. */
(() => {
  const C = window.CARA, S = C && C.studio, L = C && C.L, $ = (id) => document.getElementById(id);
  if (!S || !$("textCard")) return;
  const fa = C.faNum, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const emptyData = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));

  let toastEl, tt;
  function say(t) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "sp-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("on"), 2800);
  }

  /* ================= فونت پیکسلی ۵×۷ (برای متن‌های ریز، خیلی تمیزتر از قلم معمولی) ================= */
  const PX = {};
  "A:01110.10001.10001.11111.10001.10001.10001|B:11110.10001.10001.11110.10001.10001.11110|C:01110.10001.10000.10000.10000.10001.01110|D:11110.10001.10001.10001.10001.10001.11110|E:11111.10000.10000.11110.10000.10000.11111|F:11111.10000.10000.11110.10000.10000.10000|G:01110.10001.10000.10111.10001.10001.01111|H:10001.10001.10001.11111.10001.10001.10001|I:01110.00100.00100.00100.00100.00100.01110|J:00111.00010.00010.00010.00010.10010.01100|K:10001.10010.10100.11000.10100.10010.10001|L:10000.10000.10000.10000.10000.10000.11111|M:10001.11011.10101.10101.10001.10001.10001|N:10001.11001.10101.10011.10001.10001.10001|O:01110.10001.10001.10001.10001.10001.01110|P:11110.10001.10001.11110.10000.10000.10000|Q:01110.10001.10001.10001.10101.10010.01101|R:11110.10001.10001.11110.10100.10010.10001|S:01111.10000.10000.01110.00001.00001.11110|T:11111.00100.00100.00100.00100.00100.00100|U:10001.10001.10001.10001.10001.10001.01110|V:10001.10001.10001.10001.10001.01010.00100|W:10001.10001.10001.10101.10101.11011.10001|X:10001.10001.01010.00100.01010.10001.10001|Y:10001.10001.01010.00100.00100.00100.00100|Z:11111.00001.00010.00100.01000.10000.11111|0:01110.10001.10011.10101.11001.10001.01110|1:00100.01100.00100.00100.00100.00100.01110|2:01110.10001.00001.00010.00100.01000.11111|3:11110.00001.00001.01110.00001.00001.11110|4:00010.00110.01010.10010.11111.00010.00010|5:11111.10000.11110.00001.00001.10001.01110|6:00110.01000.10000.11110.10001.10001.01110|7:11111.00001.00010.00100.01000.01000.01000|8:01110.10001.10001.01110.10001.10001.01110|9:01110.10001.10001.01111.00001.00010.01100|.:00000.00000.00000.00000.00000.01100.01100|,:00000.00000.00000.00000.01100.00100.01000|!:00100.00100.00100.00100.00100.00000.00100|?:01110.10001.00001.00010.00100.00000.00100|-:00000.00000.00000.11111.00000.00000.00000|+:00000.00100.00100.11111.00100.00100.00000|::00000.01100.01100.00000.01100.01100.00000|':00100.00100.01000.00000.00000.00000.00000|♥:01010.11111.11111.11111.01110.00100.00000|*:00000.10101.01110.11111.01110.10101.00000|/:00001.00001.00010.00100.01000.10000.10000|&:01100.10010.10100.01000.10101.10010.01101| :000.000.000.000.000.000.000"
    .split("|").forEach((e) => { const i = e.indexOf(":", 1) === 1 ? 1 : e.indexOf(":"); const k = e.slice(0, i === 1 && e[1] === ":" ? 1 : i), rows = e.slice(i + 1).split("."); PX[k] = rows; });
  PX["❤"] = PX["♥"]; PX["﹒"] = PX["."];

  /* ================= ساخت بیت‌مپ متن ================= */
  const FONTS = {
    vazir: 'Vazirmatn, Tahoma, sans-serif', tahoma: 'Tahoma, "Segoe UI", sans-serif', georgia: 'Georgia, "Times New Roman", serif',
    mono: '"Courier New", Courier, monospace', script: '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive',
  };
  function pixelBitmap(lines, H) {
    const k = Math.max(1, Math.round(H / 7)), bad = new Set();
    const lineRows = lines.map((line) => {
      const rows = Array(7).fill("");
      let n = 0;
      for (const ch of [...line.toUpperCase()]) {
        const g = PX[ch];
        if (!g) { bad.add(ch); continue; }
        for (let j = 0; j < 7; j++) rows[j] += (n ? "0" : "") + g[j];
        n++;
      }
      return rows;
    }).filter((r) => r[0].length);
    if (!lineRows.length) return { bm: null, bad };
    const W = Math.max(...lineRows.map((r) => r[0].length)), out = [];
    lineRows.forEach((rows, li) => {
      if (li) for (let g = 0; g < 2; g++) out.push("0".repeat(W));
      const pad = Math.floor((W - rows[0].length) / 2);
      rows.forEach((r) => out.push("0".repeat(pad) + r + "0".repeat(W - r.length - pad)));
    });
    const bm = [];
    out.forEach((row) => { const r = []; for (const ch of row) for (let i = 0; i < k; i++) r.push(ch === "1"); for (let i = 0; i < k; i++) bm.push(r.slice()); });
    return { bm, bad };
  }
  async function canvasBitmap(lines, o) {
    const BIG = 120, fam = FONTS[o.font] || FONTS.vazir, font = `${o.weight} ${BIG}px ${fam}`;
    try { await document.fonts.load(font, lines.join("")); } catch {}
    const m = document.createElement("canvas").getContext("2d"); m.font = font;
    const widths = lines.map((l) => m.measureText(l).width);
    const W = Math.ceil(Math.max(...widths)) + BIG, lh = BIG * 1.7, Hh = Math.ceil(lines.length * lh + BIG);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.font = font; g.textBaseline = "alphabetic"; g.fillStyle = "#000"; g.textAlign = "left";
    lines.forEach((l, i) => { g.direction = /[\u0590-\u08FF]/.test(l) ? "rtl" : "ltr"; g.fillText(l, (W - widths[i]) / 2, BIG * 1.1 + i * lh); });
    const px = g.getImageData(0, 0, W, Hh).data;
    let x0 = W, x1 = -1, y0 = Hh, y1 = -1;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, I = new Float32Array((bw + 1) * (bh + 1));
    for (let y = 0; y < bh; y++) { let row = 0; for (let x = 0; x < bw; x++) { row += px[((y + y0) * W + x + x0) * 4 + 3] / 255; I[(y + 1) * (bw + 1) + x + 1] = I[y * (bw + 1) + x + 1] + row; } }
    const th = o.H, tw = clamp(Math.round((bw * th) / bh), 1, 1200), bm = [];
    for (let y = 0; y < th; y++) {
      const ya = Math.floor((y * bh) / th), yb = Math.max(ya + 1, Math.floor(((y + 1) * bh) / th)), r = [];
      for (let x = 0; x < tw; x++) {
        const xa = Math.floor((x * bw) / tw), xb = Math.max(xa + 1, Math.floor(((x + 1) * bw) / tw));
        const sum = I[yb * (bw + 1) + xb] - I[ya * (bw + 1) + xb] - I[yb * (bw + 1) + xa] + I[ya * (bw + 1) + xa];
        r.push(sum / ((xb - xa) * (yb - ya)) >= o.thr / 100);
      }
      bm.push(r);
    }
    return bm;
  }
  async function makeBitmap(o) {
    const lines = o.text.replace(/\r/g, "").split("\n").map((s) => s.trimEnd()).filter((s) => s.trim().length);
    if (!lines.length) return { bm: null, bad: new Set() };
    if (o.font === "pixel") return pixelBitmap(lines, o.H);
    return { bm: await canvasBitmap(lines, o), bad: new Set() };
  }

  /* ================= پنل متن ================= */
  const el = { txt: $("txt"), font: $("txtFont"), weight: $("txtWeight"), H: $("txtH"), T: $("txtT"), dir: $("txtDir"), rep: $("txtRep"), gap: $("txtGap"), pad: $("txtPad"), posL: $("txtPosL"), row: $("txtRow"), posC: $("txtPosC"), bgOn: $("txtBgOn"), clear: $("txtClear"), prev: $("txtPrev"), info: $("txtInfo"), note: $("txtNote"), apply: $("txtApply") };
  let fg = "DB0010", bg = "FGB0370", img = null, seq = 0;

  function strip(id, get, set) {
    const box = $(id); box.innerHTML = "";
    C.palette.forEach((p) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "sp-sw"; b.style.setProperty("--c", p.hex);
      b.title = `${p.code} — ${p.name}`; b.setAttribute("aria-label", b.title); b.dataset.code = p.code;
      b.onclick = () => { set(p.code); mark(); refresh(); };
      box.appendChild(b);
    });
    const mark = () => box.querySelectorAll(".sp-sw").forEach((b) => b.setAttribute("aria-pressed", b.dataset.code === get()));
    mark(); return mark;
  }
  const markFg = strip("txtFg", () => fg, (c) => (fg = c));
  const markBg = strip("txtBgPal", () => bg, (c) => { bg = c; el.bgOn.checked = true; });
  $("txtFgPen").onclick = () => { fg = S.sel; markFg(); refresh(); };

  const bgPane = $("txtBgPane");
  const params = () => ({
    text: el.txt.value, font: el.font.value, weight: el.weight.value, H: clamp(Number(el.H.value) || 11, 3, L.MAX_W), thr: Number(el.T.value) || 45,
    dir: el.dir.value, rep: clamp(Number(el.rep.value) || 1, 1, 20), gap: clamp(Number(el.gap.value) || 0, 0, 60), pad: clamp(Number(el.pad.value) || 0, 0, 10),
    bgOn: el.bgOn.checked, fg, bg,
  });
  function compose(bm, o) {
    const th = bm.length, tw = bm[0].length, IW = tw * o.rep + o.gap * (o.rep - 1) + o.pad * 2, IH = th + o.pad * 2;
    const im = Array.from({ length: IH }, () => Array(IW).fill(o.bgOn ? o.bg : null));
    for (let k = 0; k < o.rep; k++) { const ox = o.pad + k * (tw + o.gap); for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (bm[y][x]) im[o.pad + y][ox + x] = o.fg; }
    return im;
  }
  function drawPreview(im) {
    const cv = el.prev, box = cv.parentElement, IW = im[0].length, IH = im.length;
    const s = clamp(Math.floor((box.clientWidth - 24) / IW), 4, 14), d = devicePixelRatio || 1, W = IW * s, H = IH * s;
    cv.width = W * d; cv.height = H * d; cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = "#EFECF4"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const c = im[y][x]; if (c) C.drawBead(g, x * s, y * s, s, s, C.byCode(c).hex); }
  }
  let deb;
  function refresh() { clearTimeout(deb); deb = setTimeout(update, 120); }
  async function update() {
    const my = ++seq, o = params();
    el.weight.disabled = o.font === "pixel"; el.T.disabled = o.font === "pixel";
    $("txtHOut").textContent = fa(o.H); $("txtTOut").textContent = fa(o.thr);
    bgPane.hidden = !o.bgOn;
    el.row.parentElement.hidden = el.posL.value !== "custom";
    let res; try { res = await makeBitmap(o); } catch (e) { res = { bm: null, bad: new Set() }; }
    if (my !== seq) return;
    el.note.textContent = ""; el.note.hidden = true;
    if (res.bad && res.bad.size) { el.note.hidden = false; el.note.textContent = `این نویسه‌ها توی قلم پیکسلی نیستن و رد شدن: ${[...res.bad].join(" ")} — برای فارسی قلم «وزیرمتن» رو انتخاب کن.`; }
    if (!res.bm || !res.bm.length || !res.bm[0].length) { img = null; el.apply.disabled = true; el.info.textContent = o.text.trim() ? "چیزی برای ساختن پیدا نشد." : "متنت رو بنویس تا اینجا ببینیش."; el.prev.width = el.prev.height = 0; el.prev.style.width = el.prev.style.height = "0"; return; }
    img = compose(res.bm, o);
    const IW = img[0].length, IH = img.length, beads = img.flat().filter(Boolean).length, along = o.dir === "along";
    const len = along ? IW : IH, wid = along ? IH : IW;
    drawPreview(img); el.apply.disabled = false;
    let msg = `طول ${fa(len)} × عرض ${fa(wid)} خونه · ${fa(beads)} منجوق`;
    if (wid > L.MAX_W) msg += ` — عرضش از حد مجاز (${fa(L.MAX_W)}) بیشتره؛ ارتفاع حروف رو کمتر کن.`;
    else if (len > L.MAX_H) msg += ` — طولش از حد مجاز (${fa(L.MAX_H)}) بیشتره؛ کوچیک‌ترش کن یا تکرار رو کم کن.`;
    el.info.textContent = msg;
  }
  [el.txt, el.font, el.weight, el.H, el.T, el.dir, el.rep, el.gap, el.pad, el.posL, el.row, el.posC, el.bgOn].forEach((x) => { x.addEventListener("input", refresh); x.addEventListener("change", refresh); });

  el.apply.onclick = () => {
    if (!img) return;
    const o = params(), along = o.dir === "along", IH = img.length, IW = img[0].length;
    const needL = along ? IW : IH, needW = along ? IH : IW, notes = [];
    S.edit((st) => {
      let nw = st.w, nh = st.h;
      if (needW > L.MAX_W) notes.push("عرض متن از حد مجاز بیشتر بود و بریده شد");
      if (needW > nw) { nw = Math.min(L.MAX_W, needW); notes.push(`عرض دستبند شد ${fa(nw)}`); }
      if (needL > nh) nh = Math.min(L.MAX_H, needL);
      let r0 = el.posL.value === "start" ? 0 : el.posL.value === "end" ? nh - needL : el.posL.value === "custom" ? clamp((Number(el.row.value) || 1) - 1, 0, L.MAX_H - 1) : Math.floor((nh - needL) / 2);
      if (el.posL.value === "custom") nh = Math.min(L.MAX_H, Math.max(nh, r0 + needL));
      r0 = Math.max(0, r0);
      if (r0 + needL > L.MAX_H) notes.push("آخر متن بیرون از طول مجاز موند و بریده شد");
      const pcv = el.posC.value, c0 = needW >= nw ? 0 : pcv === (along ? "bottom" : "top") ? 0 : pcv === (along ? "top" : "bottom") ? nw - needW : Math.floor((nw - needW) / 2); /* توی پیش‌نمایش مچ ستون اول پایینه */
      const nd = emptyData(nw, nh);
      if (!el.clear.checked) for (let r = 0; r < Math.min(st.h, nh); r++) for (let c = 0; c < Math.min(st.w, nw); c++) nd[r][c] = st.data[r][c];
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
        const code = img[y][x]; if (!code) continue;
        const r = r0 + (along ? x : y), c = c0 + (along ? IH - 1 - y : x); /* «در طول مچ»: چرخش واقعی (نه ترانهاده)، تا نوشته آینه نشه */
        if (r >= 0 && r < nh && c >= 0 && c < nw) nd[r][c] = code;
      }
      return { w: nw, h: nh, data: nd };
    });
    say(notes.length ? `متن گذاشته شد؛ ${notes.join("، ")}.` : "متن روی الگو نشست. اگه خوشت نیومد «برگشت» رو بزن.");
  };

  /* ================= تبدیل‌ها ================= */
  const bbox = (d) => { let r0 = 1e9, r1 = -1, c0 = 1e9, c1 = -1; d.forEach((row, r) => row.forEach((v, c) => { if (v) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); } })); return r1 < 0 ? null : { r0, r1, c0, c1 }; };
  const shift = (st, dr, dc, wrap) => { const nd = emptyData(st.w, st.h); st.data.forEach((row, r) => row.forEach((v, c) => { if (!v) return; let rr = r + dr, cc = c + dc; if (wrap) { rr = (rr + st.h) % st.h; cc = (cc + st.w) % st.w; } if (rr >= 0 && cc >= 0 && rr < st.h && cc < st.w) nd[rr][cc] = v; })); return { w: st.w, h: st.h, data: nd }; };
  $("tfFlipW").onclick = () => S.edit((st) => { st.data.forEach((r) => r.reverse()); });
  $("tfFlipL").onclick = () => S.edit((st) => { st.data.reverse(); });
  $("tfUp").onclick = () => S.edit((st) => shift(st, -1, 0, true));
  $("tfDown").onclick = () => S.edit((st) => shift(st, 1, 0, true));
  $("tfLeft").onclick = () => S.edit((st) => shift(st, 0, -1, true));
  $("tfRight").onclick = () => S.edit((st) => shift(st, 0, 1, true));
  $("tfCenter").onclick = () => {
    if (!bbox(S.data)) return say("هنوز چیزی نکشیدی که وسط‌چین بشه.");
    S.edit((st) => { const b = bbox(st.data); return shift(st, Math.floor((st.h - (b.r1 - b.r0 + 1)) / 2) - b.r0, Math.floor((st.w - (b.c1 - b.c0 + 1)) / 2) - b.c0, false); });
  };
  $("tfTrim").onclick = () => {
    const b = bbox(S.data); if (!b) return say("الگو خالیه.");
    if (b.r1 + 1 >= S.h) return say("ردیف خالی آخر نداری.");
    S.edit((st) => ({ w: st.w, h: b.r1 + 1, data: st.data.slice(0, b.r1 + 1) }));
  };
  $("tfRepeat").onclick = () => {
    const b = bbox(S.data); if (!b) return say("اول یه نقش بکش تا تکرارش کنم.");
    const m = clamp(Number($("tfMotif").value) || b.r1 + 1, 1, S.h), total = clamp(Number($("tfTotal").value) || S.h, m, L.MAX_H);
    S.edit((st) => { const nd = emptyData(st.w, total); for (let r = 0; r < total; r++) nd[r] = (r < m ? st.data[r] : st.data[r % m]).slice(); return { w: st.w, h: total, data: nd }; });
    say(`ردیف ۱ تا ${fa(m)} تکرار شد تا طول ${fa(total)}.`);
  };
  const options = (extra) => (extra || "") + C.palette.map((p) => `<option value="${p.code}">${p.code} · ${p.name}</option>`).join("");
  $("tfTo").innerHTML = options('<option value="">(خالی / پاک)</option>'); $("tfFillSel").innerHTML = options();
  function usedColors() { const n = {}; S.data.forEach((r) => r.forEach((c) => { if (c) n[c] = (n[c] || 0) + 1; })); return n; }
  function fillUsed() {
    const sel = $("tfFrom"), keep = sel.value, n = usedColors();
    sel.innerHTML = Object.keys(n).sort((a, b) => n[b] - n[a]).map((c) => `<option value="${c}">${c} · ${C.byCode(c).name} (${fa(n[c])})</option>`).join("") || '<option value="">—</option>';
    if (keep && n[keep]) sel.value = keep;
  }
  $("tfReplace").onclick = () => {
    const from = $("tfFrom").value, to = $("tfTo").value || null; if (!from) return say("رنگی برای جایگزینی نیست.");
    if (from === to) return;
    S.edit((st) => { st.data.forEach((row) => row.forEach((c, i) => { if (c === from) row[i] = to; })); });
  };
  $("tfFill").onclick = () => { const to = $("tfFillSel").value; S.edit((st) => { st.data.forEach((row) => row.forEach((c, i) => { if (!c) row[i] = to; })); }); };

  /* ================= فایل و نسخه‌ها ================= */
  const download = (name, text, type) => { const a = document.createElement("a"); a.download = name; a.href = URL.createObjectURL(new Blob([text], { type })); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $("fsSave").onclick = () => download("cara-pattern.json", JSON.stringify({ app: "cara", v: 1, width: S.w, height: S.h, data: S.data, savedAt: new Date().toISOString() }), "application/json");
  function parseState(j) {
    const rows = j && j.data; if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])) throw 0;
    const w = clamp(rows[0].length, 1, L.MAX_W), data = rows.slice(0, L.MAX_H).map((r) => Array.from({ length: w }, (_, i) => (r && C.byCode(r[i]) ? r[i] : null)));
    return { w, h: data.length, data };
  }
  $("fsFile").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { S.load(parseState(JSON.parse(await f.text()))); say("فایل باز شد."); } catch { say("این فایل الگوی معتبر کارا نیست."); }
  };
  $("fsCsv").onclick = () => {
    const n = usedColors(), rows = Object.entries(n).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return say("الگو خالیه.");
    download("cara-beads.csv", "\ufeffکد,نام رنگ,تعداد\n" + rows.map(([c, k]) => `${c},"${C.byCode(c).name}",${k}`).join("\n") + `\nجمع,,${rows.reduce((a, r) => a + r[1], 0)}\n`, "text/csv;charset=utf-8");
  };
  const SK = "cara-slots";
  const slots = () => { try { const a = JSON.parse(localStorage.getItem(SK)); return Array.isArray(a) ? a : []; } catch { return []; } };
  const saveSlots = (a) => { try { localStorage.setItem(SK, JSON.stringify(a)); return true; } catch { say("جای ذخیره‌ی مرورگر پر شد؛ یه نسخه‌ی قدیمی رو پاک کن."); return false; } };
  function renderSlots() {
    const a = slots(), box = $("slotList");
    box.innerHTML = a.length ? a.map((s, i) => `<li><b></b><small>${fa(s.w)}×${fa(s.h)} · ${new Date(s.at).toLocaleDateString("fa-IR")}</small><button type="button" class="tool" data-a="load" data-i="${i}">باز کن</button><button type="button" class="tool" data-a="del" data-i="${i}" aria-label="حذف">✕</button></li>`).join("") : '<li class="muted">هنوز نسخه‌ای ذخیره نکردی.</li>';
    box.querySelectorAll("li b").forEach((b, i) => (b.textContent = a[i].name));
  }
  $("slotSave").onclick = () => {
    if (!bbox(S.data)) return say("الگو خالیه.");
    const name = $("slotName").value.trim().slice(0, 40) || `طرح ${fa(slots().length + 1)}`, a = slots().filter((s) => s.name !== name);
    a.unshift({ name, at: Date.now(), w: S.w, h: S.h, data: S.data });
    if (a.length > 12) { a.length = 12; say("حداکثر ۱۲ نسخه نگه می‌دارم؛ قدیمی‌ترین پاک شد."); }
    if (saveSlots(a)) { $("slotName").value = ""; renderSlots(); say(`«${name}» ذخیره شد.`); }
  };
  $("slotList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return; const a = slots(), s = a[Number(b.dataset.i)]; if (!s) return;
    if (b.dataset.a === "load") { try { S.load(parseState(s)); say(`«${s.name}» باز شد.`); } catch { say("این نسخه خراب بود."); } }
    else if (confirm(`نسخه‌ی «${s.name}» حذف بشه؟`)) { a.splice(Number(b.dataset.i), 1); saveSlots(a); renderSlots(); }
  });

  document.addEventListener("studio:change", fillUsed);
  fillUsed(); renderSlots(); markFg(); markBg(); update();

  /* ================= نوار تب‌ها: هر بار فقط یه پنل باز می‌شه ================= */
  const tabs = [...document.querySelectorAll(".sp-tab")];
  function openPanel(id) {
    tabs.forEach((t) => { const on = t.dataset.panel === id; t.setAttribute("aria-expanded", on); $(t.dataset.panel).hidden = !on; });
    if (id === "textCard") update();
    if (id) $(id).scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  tabs.forEach((t) => (t.onclick = () => openPanel(t.getAttribute("aria-expanded") === "true" ? "" : t.dataset.panel)));
  document.querySelectorAll("[data-close]").forEach((x) => (x.onclick = () => openPanel("")));

  /* ================= نوار سفارش پایین صفحه (موبایل) ================= */
  const mbTotal = $("mbTotal"), mbNext = $("mbNext"), realTotal = $("total");
  if (mbTotal && mbNext && realTotal) {
    /* قیمت تقریبی از /api/config (همون فرمول سرور: BASE_FEE + تعداد × PRICE_PER_BEAD؛ کد تخفیف توی پرداخت اعمال می‌شه) */
    let cfg = null; const sub = $("mbSub"), subDef = sub ? sub.textContent : "", pRow = $("priceRow"), pTxt = $("priceText");
    const sync = () => {
      mbTotal.textContent = realTotal.textContent;
      const n = S.data.reduce((a, r) => a + r.filter(Boolean).length, 0);
      if (cfg && n) {
        const t = Math.round(cfg.baseFee + n * cfg.pricePerBead).toLocaleString("fa-IR") + " تومان";
        if (sub) sub.textContent = "حدود " + t; if (pTxt) pTxt.textContent = "حدود " + t; if (pRow) pRow.hidden = false;
      } else { if (sub) sub.textContent = subDef; if (pRow) pRow.hidden = true; }
    };
    fetch("/api/config").then((r) => r.json()).then((c) => { if (c && Number(c.pricePerBead) > 0) { cfg = { baseFee: Number(c.baseFee) || 0, pricePerBead: Number(c.pricePerBead) }; sync(); } }).catch(() => {});
    document.addEventListener("studio:change", sync);
    new MutationObserver(sync).observe(realTotal, { childList: true, characterData: true, subtree: true }); sync();
    let mt;
    mbNext.onclick = () => {
      const empty = !S.data.some((r) => r.some(Boolean));
      if (empty) { mbNext.textContent = "اول چندتا منجوق بچین"; clearTimeout(mt); mt = setTimeout(() => (mbNext.textContent = "ادامه سفارش"), 2200); return; }
      $("next").click();
    };
  }
})();
} catch (e) { console.error('builder:pro', e); }

/* ==================================================================
   ۴) موبایل (قبلاً mobile-palette.js)
   ================================================================== */
try {
/* پالت موبایل: دکمه‌ی «رنگ‌ها» توی نوار پایین، پنل پایین‌آمدنی. بعد از studio-pro.js لود شه. */
(function () {
  var mq = window.matchMedia("(max-width: 760px)");
  var aside = document.querySelector(".builder > aside:first-child");
  var bar = document.getElementById("mbBar");
  var pal = document.getElementById("palette");
  if (!aside || !bar || !pal) return;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mb-color";
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<i></i><span>رنگ‌ها</span>';
  bar.insertBefore(btn, bar.firstChild);
  var scrim = document.createElement("div");
  scrim.className = "mb-scrim";
  document.body.appendChild(scrim);

  /* سرتیتر پنل: بستن + «باز بمونه» */
  var h2 = aside.querySelector("h2");
  var hd = document.createElement("div");
  hd.className = "mb-hd";
  if (h2) { aside.insertBefore(hd, h2); hd.appendChild(h2); } else { aside.insertBefore(hd, aside.firstChild); }
  var pin = document.createElement("button");
  pin.type = "button";
  pin.className = "mb-pin";
  pin.textContent = "باز بمونه";
  var KEY = "cara-pal-pin", pinned = false;
  try { pinned = localStorage.getItem(KEY) === "1"; } catch (e) {}
  pin.setAttribute("aria-pressed", pinned ? "true" : "false");
  var cls = document.createElement("button");
  cls.type = "button";
  cls.className = "mb-close";
  cls.setAttribute("aria-label", "بستن");
  cls.innerHTML = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  hd.appendChild(pin);
  hd.appendChild(cls);
  function setOpen(o) {
    aside.classList.toggle("mb-open", o);
    aside.classList.toggle("mb-pinned", o && pinned);
    scrim.classList.toggle("on", o && !pinned);
    btn.setAttribute("aria-expanded", o ? "true" : "false");
  }
  pin.addEventListener("click", function () {
    pinned = !pinned;
    pin.setAttribute("aria-pressed", pinned ? "true" : "false");
    try { localStorage.setItem(KEY, pinned ? "1" : "0"); } catch (e) {}
    setOpen(aside.classList.contains("mb-open"));
  });
  cls.addEventListener("click", function () { setOpen(false); });
  function syncDot() {
    var sw = pal.querySelector('.swatch[aria-pressed="true"]');
    if (sw) btn.firstChild.style.setProperty("--c", getComputedStyle(sw).backgroundColor);
  }
  btn.addEventListener("click", function () { setOpen(!aside.classList.contains("mb-open")); });
  scrim.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  /* انتخاب رنگ (از پالت یا رنگ‌های اخیر) پنل رو می‌بنده تا بشه سریع کشید */
  aside.addEventListener("click", function (e) {
    if (mq.matches && e.target.closest(".swatch, .sp-rc")) setTimeout(function () { syncDot(); if (!pinned) setOpen(false); }, 120);
  });
  new MutationObserver(syncDot).observe(pal, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  mq.addEventListener && mq.addEventListener("change", function () { setOpen(false); });
  syncDot();
})();

/* تمام‌صفحه‌ی موبایل: دکمه توی نوار ابزار. روی آیفون Fullscreen API نیست، پس حالت «تمرکز» با CSS ساخته می‌شه. */
(function () {
  var mq = window.matchMedia("(max-width: 760px)");
  var host = document.querySelector(".tools .grp.bare") || document.querySelector(".tools");
  if (!host) return;
  var ICON_IN = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_OUT = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tool ib fs-btn";
  btn.setAttribute("aria-pressed", "false");
  btn.setAttribute("aria-label", "تمام‌صفحه");
  btn.setAttribute("data-tip", "تمام‌صفحه");
  btn.innerHTML = ICON_IN;
  host.insertBefore(btn, host.firstChild);

  function relayout() { setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 60); }
  function setFs(on, fromPop) {
    if (document.body.classList.contains("fs-mode") === on) return;
    document.body.classList.toggle("fs-mode", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "خروج از تمام‌صفحه" : "تمام‌صفحه");
    btn.innerHTML = on ? ICON_OUT : ICON_IN;
    if (on) {
      window.scrollTo(0, 0);
      history.pushState({ caraFs: 1 }, "");
      /* اندروید/کروم: نوار مرورگر هم می‌ره */
      try { var r = document.documentElement.requestFullscreen; if (r) r.call(document.documentElement).catch(function () {}); } catch (e) {}
    } else {
      if (!fromPop && history.state && history.state.caraFs) history.back();
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    }
    relayout();
  }
  btn.addEventListener("click", function () { setFs(!document.body.classList.contains("fs-mode")); });
  window.addEventListener("popstate", function () { setFs(false, true); });
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement) setFs(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setFs(false); });
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function () { if (!mq.matches) setFs(false); });
})();
} catch (e) { console.error('builder:mobile', e); }
