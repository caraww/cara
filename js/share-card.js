/* Branded 1200×630 share card for a bead pattern.
   Renders entirely in the browser and can share a real image file through the Web Share API. */
(function () {
  "use strict";
  const C = window.CARA;
  if (!C) return;

  const W = 1200;
  const H = 630;
  const SITE = "caraw.ir";
  const FONT = "Vazirmatn, Tahoma, sans-serif";

  function roundRect(g, x, y, w, h, r) {
    if (g.roundRect) {
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      return;
    }
    const k = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + k, y);
    g.arcTo(x + w, y, x + w, y + h, k);
    g.arcTo(x + w, y + h, x, y + h, k);
    g.arcTo(x, y + h, x, y, k);
    g.arcTo(x, y, x + w, y, k);
    g.closePath();
  }

  function fitText(g, text, maxWidth, start, min) {
    let size = start;
    while (size > min) {
      g.font = `900 ${size}px ${FONT}`;
      if (g.measureText(text).width <= maxWidth) return size;
      size -= 4;
    }
    return min;
  }

  function drawPatternBand(g, data, x, y, maxW, maxH) {
    const rows = data.length;
    const cols = data[0].length;
    const cell = Math.max(4, Math.min(maxW / rows, maxH / cols));
    const bandW = rows * cell;
    const bandH = cols * cell;
    const ox = x + (maxW - bandW) / 2;
    const oy = y + (maxH - bandH) / 2;

    g.save();
    roundRect(g, ox - 16, oy - 16, bandW + 32, bandH + 32, 26);
    g.fillStyle = "rgba(255,255,255,.10)";
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.22)";
    g.lineWidth = 2;
    g.stroke();
    g.clip();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const code = data[r][c];
        if (!code) continue;
        const item = C.byCode(code);
        if (!item) continue;
        const bx = ox + r * cell;
        const by = oy + c * cell;
        if (cell >= 6 && C.drawBead) C.drawBead(g, bx, by, cell, cell, item.hex);
        else {
          g.fillStyle = item.hex;
          g.fillRect(bx, by, cell + 0.5, cell + 0.5);
        }
      }
    }
    const shine = g.createLinearGradient(0, oy, 0, oy + bandH);
    shine.addColorStop(0, "rgba(255,255,255,.28)");
    shine.addColorStop(0.35, "rgba(255,255,255,0)");
    shine.addColorStop(0.7, "rgba(0,0,0,0)");
    shine.addColorStop(1, "rgba(0,0,0,.35)");
    g.fillStyle = shine;
    g.fillRect(ox, oy, bandW, bandH);
    g.restore();
    return { cell, bandW, bandH, ox, oy };
  }

  function render(canvas, options = {}) {
    const data = options.data;
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) return null;
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d");
    g.textBaseline = "middle";

    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#211630");
    bg.addColorStop(0.55, "#4a2440");
    bg.addColorStop(1, "#8a4a52");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    g.globalAlpha = 0.16;
    for (let i = 0; i < 26; i++) {
      const item = C.palette[i % C.palette.length];
      const x = (i * 173 + 61) % W;
      const y = (i * 97 + 41) % H;
      g.fillStyle = item.hex;
      g.beginPath();
      g.arc(x, y, 10 + (i % 5) * 6, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    g.direction = "rtl";
    g.textAlign = "right";
    g.fillStyle = "#f6e9d6";
    const title = String(options.title || "دستبند منجوقی من");
    const titleSize = fitText(g, title, W - 120, 64, 34);
    g.font = `900 ${titleSize}px ${FONT}`;
    g.fillText(title, W - 60, 86);

    g.font = `500 28px ${FONT}`;
    g.fillStyle = "rgba(246,233,214,.78)";
    g.fillText(String(options.subtitle || "طراحی‌شده با استودیوی کارا"), W - 62, 136);

    drawPatternBand(g, data, 60, 170, W - 120, 290);

    const counts = new Map();
    let total = 0;
    data.forEach((row) => row.forEach((code) => {
      if (!code) return;
      total++;
      counts.set(code, (counts.get(code) || 0) + 1);
    }));
    const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const shown = colors.slice(0, 6);
    let x = W - 60;
    g.textAlign = "right";
    g.font = `700 26px ${FONT}`;
    g.fillStyle = "#f6e9d6";
    g.fillText(`${total.toLocaleString("fa-IR")} منجوق · ${colors.length.toLocaleString("fa-IR")} رنگ`, W - 60, 516);
    g.font = `500 22px ${FONT}`;
    g.fillStyle = "rgba(246,233,214,.82)";
    g.fillText("cara · دست‌باف با منجوق دلیکای میوکی", W - 60, 562);

    shown.forEach(([code, count]) => {
      const item = C.byCode(code);
      if (!item) return;
      g.fillStyle = item.hex;
      g.beginPath();
      g.arc(x - 12, 512, 13, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.55)";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = "rgba(246,233,214,.9)";
      g.font = `700 20px ${FONT}`;
      g.textAlign = "center";
      g.fillText(String(count), x - 12, 545);
      x -= 74;
    });

    g.textAlign = "left";
    g.direction = "ltr";
    g.font = `700 24px ${FONT}`;
    g.fillStyle = "#e9c98b";
    g.fillText(SITE, 60, 592);
    return canvas;
  }

  function toBlob(canvas) {
    return new Promise((resolve) => {
      if (canvas.toBlob) canvas.toBlob(resolve, "image/png");
      else resolve(null);
    });
  }

  function fileName() {
    return "cara-pattern-" + new Date().toISOString().slice(0, 10) + ".png";
  }

  function download(canvas) {
    const a = document.createElement("a");
    a.download = fileName();
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  async function share(options = {}) {
    const canvas = options.canvas || render(document.createElement("canvas"), options);
    if (!canvas) return { ok: false, reason: "empty" };
    const blob = await toBlob(canvas);
    if (!blob) return { ok: false, reason: "blob" };
    const file = new File([blob], fileName(), { type: "image/png" });
    const payload = {
      title: options.shareTitle || "دستبند منجوقی من | cara",
      text: options.shareText || "این طرح رو با کارا ساختم.",
      files: [file],
    };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(payload);
        return { ok: true, method: "share" };
      } catch (error) {
        if (error && error.name === "AbortError") return { ok: true, method: "abort" };
      }
    }
    download(canvas);
    return { ok: true, method: "download" };
  }

  C.shareCard = Object.freeze({ render, share, download, toBlob, W, H });
})();
