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

  const saved = C.loadPattern();
  if (saved) { data = saved.data; w = saved.width; h = saved.height; }
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

  /* پیش‌نمایش دستبند: الگو ۹۰ درجه چرخیده و مثل استوانه سایه‌زده روی مچ */
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
      const x = x0 + r * s, y = y0 + c * s, hex = C.byCode(code).hex;
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
