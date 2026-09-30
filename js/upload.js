(() => {
  const C = CARA, L = C.L, $ = (id) => document.getElementById(id);
  const out = $("out"), msg = $("msg"), drop = $("drop");
  let img = null, t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function show(im, revoke) {
    img = im; if (revoke) URL.revokeObjectURL(revoke); convert();
    out.classList.remove("reveal"); void out.offsetWidth; out.classList.add("reveal");
  }
  function load(file) {
    if (!file || !file.type.startsWith("image/")) { msg.textContent = "این فایل عکس نیست."; return; }
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => show(im, url);
    im.onerror = () => { msg.textContent = "این عکس باز نشد، یه فایل دیگه امتحان کن."; };
    im.src = url;
  }
  /* از گالری: upload.html?src=beadworks/eye.jpg (فقط عکس‌های هم‌دامنه، وگرنه بوم خراب می‌شه) */
  (function fromGallery() {
    const s = new URLSearchParams(location.search).get("src");
    if (!s) return;
    let u; try { u = new URL(s, location.href); } catch { return; }
    if (u.origin !== location.origin) return;
    msg.textContent = "دارم عکس رو باز می‌کنم…";
    const im = new Image();
    im.onload = () => show(im);
    im.onerror = () => { msg.textContent = "عکس گالری باز نشد؛ می‌تونی خودت یه عکس انتخاب کنی."; };
    im.src = u.href;
  })();
  $("file").onchange = (e) => load(e.target.files[0]);
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => load(e.dataTransfer.files[0]));
  ["dragover", "drop"].forEach((ev) => addEventListener(ev, (e) => e.preventDefault()));
  ["w", "h", "fit", "dither"].forEach((id) => $(id).addEventListener("input", () => { clearTimeout(t); t = setTimeout(convert, 200); }));

  function convert() {
    if (!img) return;
    const w = clamp(Number($("w").value) || L.DEF_W, 1, L.MAX_W), h = clamp(Number($("h").value) || L.DEF_H, 1, L.MAX_H);
    $("warn").hidden = w <= L.WARN_W;
    /* عکس را با نسبت واقعی خانه‌ها برش می‌دهیم تا کشیده نشود */
    const target = (w * L.BEAD_ASPECT) / h, iw = img.naturalWidth, ih = img.naturalHeight;
    const src = document.createElement("canvas"); src.width = w; src.height = h;
    const g = src.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = "high";
    if ($("fit").value === "cover") {
      let sw = iw, sh = ih;
      if (iw / ih > target) sw = ih * target; else sh = iw / target;
      g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    } else {
      const k = Math.min((w * L.BEAD_ASPECT) / iw, h / ih), dw = (iw * k) / L.BEAD_ASPECT, dh = ih * k;
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    const px = g.getImageData(0, 0, w, h).data, buf = Float32Array.from(px), data = [];
    const dither = $("dither").checked;
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, r = clamp(buf[i], 0, 255), gg = clamp(buf[i + 1], 0, 255), b = clamp(buf[i + 2], 0, 255);
        const n = C.nearest(r, gg, b); row.push(n.code);
        if (dither) {
          const er = [r - n.rgb[0], gg - n.rgb[1], b - n.rgb[2]];
          [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]].forEach(([dx, dy, f]) => {
            const nx = x + dx, ny = y + dy; if (nx < 0 || nx >= w || ny >= h) return;
            const j = (ny * w + nx) * 4; for (let k = 0; k < 3; k++) buf[j + k] += er[k] * f;
          });
        }
      }
      data.push(row);
    }
    const cw = clamp(Math.floor(720 / w), 10, 26), ch = Math.round(cw / L.BEAD_ASPECT), d = devicePixelRatio || 1;
    out.width = w * cw * d; out.height = h * ch * d; out.style.width = w * cw + "px"; out.style.height = h * ch + "px";
    const o = out.getContext("2d"); o.setTransform(d, 0, 0, d, 0, 0);
    o.fillStyle = "#EFECF4"; o.fillRect(0, 0, w * cw, h * ch); C.drawPattern(o, data, cw, ch);
    out.hidden = false; msg.hidden = true;
    C.savePattern(w, h, data); /* ذخیره خودکار برای سازنده و سفارش */
  }
})();
