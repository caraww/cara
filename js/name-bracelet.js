(() => {
  "use strict";
  const C = window.CARA;
  if (!C) return;
  const L = C.L;
  const $ = (id) => document.getElementById(id);
  const fa = C.faNum;
  const msg = (value) => {
    $("msg").textContent = value || "";
    $("msg").hidden = !value;
  };
  const fgSelect = $("fg"), bgSelect = $("bg");
  for (const bead of C.palette) {
    for (const select of [fgSelect, bgSelect]) {
      const option = document.createElement("option");
      option.value = bead.code;
      option.textContent = bead.name + " · " + bead.code;
      select.append(option);
    }
  }
  fgSelect.value = "DB1832";
  bgSelect.value = "DB0010";

  let cfg = null, grid = null, rows = 0, timer = 0;

  /* اسم را به ماسک پیکسلی تبدیل می‌کنیم؛ ابعاد ورودی محدود است تا حافظه بی‌جهت مصرف نشود. */
  function textMask(name, targetHeight) {
    const fontSize = 160;
    const big = document.createElement("canvas");
    const context = big.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.font = \`900 \${fontSize}px Vazirmatn, Tahoma, sans-serif\`;
    const measured = Math.ceil(context.measureText(name).width) + 60;
    if (!measured || measured > 6000) return null;
    big.width = measured;
    big.height = fontSize * 2;
    context.font = \`900 \${fontSize}px Vazirmatn, Tahoma, sans-serif\`;
    context.textBaseline = "alphabetic";
    context.fillStyle = "#000";
    context.fillText(name, 30, fontSize * 1.4);
    const pixels = context.getImageData(0, 0, big.width, big.height).data;
    let x0 = big.width, x1 = -1, y0 = big.height, y1 = -1;
    for (let y = 0; y < big.height; y++) {
      for (let x = 0; x < big.width; x++) {
        if (pixels[(y * big.width + x) * 4 + 3] > 20) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x);
          y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    if (x1 < 0) return null;
    const sourceWidth = x1 - x0 + 1, sourceHeight = y1 - y0 + 1;
    const targetWidth = Math.max(1, Math.round(sourceWidth * targetHeight / sourceHeight));
    const small = document.createElement("canvas");
    small.width = targetWidth; small.height = targetHeight;
    const smallContext = small.getContext("2d", { willReadFrequently: true });
    if (!smallContext) return null;
    smallContext.imageSmoothingQuality = "high";
    smallContext.drawImage(big, x0, y0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
    const alpha = smallContext.getImageData(0, 0, targetWidth, targetHeight).data;
    const mask = [];
    for (let y = 0; y < targetHeight; y++) {
      const row = [];
      for (let x = 0; x < targetWidth; x++) row.push(alpha[(y * targetWidth + x) * 4 + 3] > 110);
      mask.push(row);
    }
    return { pixels: mask, width: targetWidth };
  }

  function addInfo(label, value) {
    const span = document.createElement("span");
    span.append(document.createTextNode(label + ": "));
    const strong = document.createElement("b");
    strong.textContent = value;
    span.append(strong);
    $("info").append(span);
  }

  function updatePrice(total) {
    const el = $("pr");
    if (!el) return;
    el.replaceChildren(document.createTextNode("قیمت: "));
    const strong = document.createElement("b");
    strong.textContent = cfg && cfg.pricePerBead
      ? fa(Math.round(cfg.baseFee + total * cfg.pricePerBead)) + " تومان"
      : "بعد از بررسی اعلام می‌شه";
    el.append(strong);
  }

  async function build() {
    const name = $("name").value.trim();
    const across = Number($("across").value);
    $("acrossOut").textContent = fa(across);
    msg("");
    if (!name) {
      grid = null; rows = 0;
      $("info").replaceChildren();
      $("cv").width = $("cv").height = 0;
      return;
    }
    try {
      if (document.fonts && document.fonts.load) await document.fonts.load("900 40px Vazirmatn", name);
      const mask = textMask(name, across - 2);
      if (!mask) { grid = null; return msg("این اسم رو نتونستم بکشم؛ حروف ساده‌تری امتحان کن."); }
      rows = mask.width + 4;
      if (rows > L.MAX_H) { grid = null; return msg("اسم خیلی بلنده؛ کوتاه‌ترش کن یا پهنای دستبند رو کمتر کن."); }
      if (across > L.MAX_W) { grid = null; return msg("پهنا زیاده."); }
      const fg = fgSelect.value, bg = bgSelect.value;
      if (fg === bg) msg("رنگ اسم و زمینه یکیه؛ اسم دیده نمی‌شه.");
      const visible = Array.from({ length: across }, (_, y) =>
        Array.from({ length: rows }, (_, x) => {
          const i = x - 2, j = y - 1;
          return i >= 0 && i < mask.width && j >= 0 && j < mask.pixels.length && mask.pixels[j][i] ? fg : bg;
        })
      );
      const mirror = $("mirror").checked;
      grid = Array.from({ length: rows }, (_, row) =>
        Array.from({ length: across }, (_, col) => visible[mirror ? col : across - 1 - col][row])
      );
      const cell = Math.max(4, Math.min(16, Math.floor(860 / rows)));
      const canvas = $("cv"), context = canvas.getContext("2d");
      if (!context) { grid = null; return msg("پیش‌نمایش روی این مرورگر در دسترس نیست."); }
      canvas.width = rows * cell;
      canvas.height = across * cell;
      visible.forEach((line, y) => line.forEach((code, x) => {
        const bead = C.byCode(code);
        if (bead) C.drawBead(context, x * cell + 1, y * cell + 1, cell - 2, cell - 2, bead.hex);
      }));
      $("info").replaceChildren();
      addInfo("اندازه", fa(across) + "×" + fa(rows));
      addInfo("تعداد منجوق", fa(rows * across));
      const price = document.createElement("span");
      price.id = "pr";
      $("info").append(price);
      updatePrice(rows * across);
    } catch (error) {
      grid = null;
      msg("ساخت پیش‌نمایش با خطا روبه‌رو شد؛ دوباره امتحان کن.");
    }
  }

  fetch("/api/config", { headers: { Accept: "application/json" } })
    .then((response) => { if (!response.ok) throw new Error("config"); return response.json(); })
    .then((config) => { cfg = config; if (grid) updatePrice(rows * Number($("across").value)); })
    .catch(() => { cfg = null; });

  function save(destination) {
    if (!grid) return msg("اول یه اسم بنویس.");
    if (!C.savePattern(grid[0].length, grid.length, grid)) {
      return msg("الگو ذخیره نشد؛ فضای ذخیره‌سازی مرورگر رو بررسی کن و دوباره تلاش کن.");
    }
    window.location.href = destination;
  }
  $("go").addEventListener("click", () => save("/checkout.html"));
  $("edit").addEventListener("click", () => save("/builder.html"));
  const scheduleBuild = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(build, 200);
  };
  for (const id of ["name", "across", "fg", "bg", "mirror"]) {
    $(id).addEventListener("input", scheduleBuild);
    $(id).addEventListener("change", scheduleBuild);
  }
  build();
})();
