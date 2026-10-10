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
      const c0 = needW >= nw ? 0 : el.posC.value === "top" ? 0 : el.posC.value === "bottom" ? nw - needW : Math.floor((nw - needW) / 2);
      const nd = emptyData(nw, nh);
      if (!el.clear.checked) for (let r = 0; r < Math.min(st.h, nh); r++) for (let c = 0; c < Math.min(st.w, nw); c++) nd[r][c] = st.data[r][c];
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
        const code = img[y][x]; if (!code) continue;
        const r = r0 + (along ? x : y), c = c0 + (along ? y : x);
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
