(() => {
  const C = CARA, L = C.L, $ = (id) => document.getElementById(id);
  const canvas = $("grid"), ctx = canvas.getContext("2d"), wrap = $("gridWrap"), wIn = $("w"), hIn = $("h");
  const M = 30, T = 22;
  const empty = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let w = L.DEF_W, h = L.DEF_H, data = empty(w, h), sel = C.palette[0].code, tool = "brush";
  let panning = null, space = false, mirror = false, erasing = false, painting = false, last = null, history = [], redo = [], cw = 24, ch = 20, saveT, sumQ = false;

  const saved = C.loadPattern();
  if (saved) { data = saved.data; w = saved.width; h = saved.height; }
  wIn.value = w; hIn.value = h;

  /* پالت */
  const pal = $("palette");
  C.palette.forEach((p) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.style.setProperty("--c", p.hex); b.title = `${p.code} — ${p.name}`;
    b.setAttribute("aria-label", b.title); b.setAttribute("aria-pressed", p.code === sel); b.dataset.code = p.code;
    b.onclick = () => { sel = p.code; if (tool === "eraser" || tool === "pan" || tool === "pick") setTool("brush"); showSel(); };
    pal.appendChild(b);
  });
  function showSel() {
    const p = C.byCode(sel);
    pal.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", b.dataset.code === sel));
    $("curDot").style.setProperty("--c", p.hex); $("curName").textContent = p.name; $("curCode").textContent = p.code;
  }

  /* ابزارها */
  function setTool(t) {
    tool = t; $("toolName").textContent = { brush: "قلم", eraser: "پاک‌کن", fill: "سطل", pan: "جابه‌جایی", pick: "قطره‌چکان" }[t];
    document.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === t));
    canvas.style.touchAction = "none";
    canvas.style.cursor = t === "pan" ? "grab" : "crosshair";
  }
  document.querySelectorAll("[data-tool]").forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  $("mirror").onclick = (e) => { mirror = !mirror; e.currentTarget.setAttribute("aria-pressed", mirror); };

  /* رسم */
  function drawCell(g, r, c, cw, ch, ox, oy) {
    const x = ox + c * cw, y = oy + r * ch, code = data[r][c];
    g.fillStyle = "#EFECF4"; g.fillRect(x + 1, y + 1, cw - 1, ch - 1);
    if (code) C.drawBead(g, x + 1, y + 1, cw - 1, ch - 1, C.byCode(code).hex);
  }
  function paintGrid(g, cw, ch, ox, oy) {
    g.fillStyle = "#D3CCDD"; g.fillRect(ox, oy, w * cw + 1, h * ch + 1);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) drawCell(g, r, c, cw, ch, ox, oy);
    g.fillStyle = "#6C6478"; g.font = `${clamp(ch * 0.6, 9, 12)}px Vazirmatn,Tahoma,sans-serif`;
    g.textBaseline = "middle";
    g.textAlign = "right";
    for (let r = 0; r < h; r++) if (r === 0 || (r + 1) % 5 === 0) g.fillText(r + 1, ox - 6, oy + r * ch + ch / 2);
    g.textAlign = "center";
    for (let c = 0; c < w; c++) if (c === 0 || (c + 1) % 5 === 0) g.fillText(c + 1, ox + c * cw + cw / 2, oy - 10);
  }
  function layout() {
    cw = clamp(Math.floor((wrap.clientWidth - 28 - M) / w), 12, 30); ch = Math.round(cw / L.BEAD_ASPECT);
    const d = devicePixelRatio || 1, W = M + w * cw + 4, H = T + h * ch + 4;
    canvas.width = W * d; canvas.height = H * d; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0); paintGrid(ctx, cw, ch, M, T);
  }

  /* ویرایش */
  const cellFrom = (e) => {
    const b = canvas.getBoundingClientRect(), c = Math.floor((e.clientX - b.left - M) / cw), r = Math.floor((e.clientY - b.top - T) / ch);
    return r >= 0 && r < h && c >= 0 && c < w ? [r, c] : null;
  };
  function setCell(r, c, v) {
    data[r][c] = v; drawCell(ctx, r, c, cw, ch, M, T);
    if (mirror && w - 1 - c !== c) { data[r][w - 1 - c] = v; drawCell(ctx, r, w - 1 - c, cw, ch, M, T); }
  }
  const val = () => (tool === "eraser" || erasing ? null : sel);
  function line(a, b) {
    let [r, c] = a; const dr = Math.abs(b[0] - r), dc = Math.abs(b[1] - c), sr = r < b[0] ? 1 : -1, sc = c < b[1] ? 1 : -1;
    let err = dc - dr;
    for (;;) {
      setCell(r, c, val());
      if (r === b[0] && c === b[1]) break;
      const e2 = 2 * err;
      if (e2 > -dr) { err -= dr; c += sc; }
      if (e2 < dc) { err += dc; r += sr; }
    }
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
  const pushHistory = () => { redo.length = 0; history.push(JSON.stringify({ w, h, data })); if (history.length > 50) history.shift(); };
  canvas.addEventListener("pointerdown", (e) => {
    if (tool === "pan" || e.button === 1 || space) { /* جابه‌جایی: کشیدن با موس/لمس، دکمه‌ی وسط یا نگه داشتن Space */
      e.preventDefault(); panning = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop };
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; return;
    }
    const cell = cellFrom(e); if (!cell) return;
    if (tool === "pick" || e.altKey) { /* قطره‌چکان: رنگ خونه‌ی زیر نشانگر رو برمی‌داره (Alt+کلیک یا کلید I) */
      const code = data[cell[0]][cell[1]];
      if (code) { sel = code; showSel(); if (tool === "pick" || tool === "eraser") setTool("brush"); }
      return;
    }
    erasing = e.button === 2; pushHistory(); canvas.setPointerCapture(e.pointerId);
    if (tool === "fill") { fill(cell); changed(); return; }
    painting = true; last = cell; setCell(cell[0], cell[1], val()); queueSummary();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (panning) { wrap.scrollLeft = panning.l - (e.clientX - panning.x); wrap.scrollTop = panning.t - (e.clientY - panning.y); return; }
    if (!painting) return; const cell = cellFrom(e);
    if (cell && (cell[0] !== last[0] || cell[1] !== last[1])) { line(last, cell); last = cell; queueSummary(); }
  });
  const stop = () => { if (panning) { panning = null; setTool(tool); } if (painting) { painting = false; changed(); } };
  canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function applyState(s) {
    w = s.w; h = s.h; data = s.data; wIn.value = w; hIn.value = h; layout(); changed();
  }
  $("undo").onclick = () => { const p = history.pop(); if (p) { redo.push(JSON.stringify({ w, h, data })); applyState(JSON.parse(p)); } };
  const doRedo = () => { const p = redo.pop(); if (p) { history.push(JSON.stringify({ w, h, data })); applyState(JSON.parse(p)); } };
  $("clear").onclick = () => { pushHistory(); data = empty(w, h); layout(); changed(); };
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
      const p = C.byCode(code); return `<div class="color-row"><i class="dot" style="--c:${p.hex}"></i><small>${p.code} · ${p.name}</small><b>${C.faNum(n)}</b></div>`;
    }).join("");
    drawWrist();
    return { counts, total };
  }
  function queueSummary() { if (!sumQ) { sumQ = true; requestAnimationFrame(() => { sumQ = false; summary(); }); } }
  function changed() {
    summary(); $("saved").textContent = "";
    clearTimeout(saveT); saveT = setTimeout(() => { C.savePattern(w, h, data); $("saved").textContent = "ذخیره شد ✓"; }, 350);
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
  addEventListener("keydown", (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.code === "Space" && !/BUTTON|A/.test(document.activeElement.tagName)) { e.preventDefault(); if (!space) { space = true; canvas.style.cursor = "grab"; } return; }
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z" && !e.shiftKey) { e.preventDefault(); $("undo").click(); }
    else if ((e.ctrlKey || e.metaKey) && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); doRedo(); }
    else if (k === "i" && !e.ctrlKey && !e.metaKey) setTool("pick");
    else if (k === "b") setTool("brush"); else if (k === "e") setTool("eraser"); else if (k === "g") setTool("fill");
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
    if (!cell) { ghost.hidden = true; $("pos").textContent = "—"; return; }
    ghost.hidden = false;
    ghost.style.cssText = `left:${canvas.offsetLeft + M + cell[1] * cw}px;top:${canvas.offsetTop + T + cell[0] * ch}px;width:${cw}px;height:${ch}px`;
    ghost.style.setProperty("--c", tool === "eraser" ? "transparent" : C.byCode(sel).hex);
    $("pos").textContent = `ردیف ${C.faNum(cell[0] + 1)} · ستون ${C.faNum(cell[1] + 1)}`;
  });
  canvas.addEventListener("pointerleave", () => { ghost.hidden = true; });

  showSel(); setTool("brush"); layout(); summary();
})();
