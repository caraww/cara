#!/usr/bin/env node
/* فونت Vazirmatn رو از Google Fonts می‌گیره و فقط بعد از اعتبارسنجی کامل، خروجی محلی و HTMLها رو به‌روز می‌کنه. */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap";

async function selfHostFonts({ root = ROOT, fetchImpl = fetch } = {}) {
  const cssResponse = await fetchImpl(CSS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
  });
  if (!cssResponse || !cssResponse.ok) throw new Error("دریافت CSS فونت ناموفق بود (HTTP " + (cssResponse ? cssResponse.status : "unknown") + ")");
  const css = await cssResponse.text();
  const blocks = css.match(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g) || [];
  if (!blocks.length) throw new Error("پاسخ Google Fonts فاقد @font-face معتبر بود");

  const downloads = [];
  for (const block of blocks) {
    const url = (block.match(/url\((https:[^)]+)\)/) || [])[1];
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
    const subset = ((block.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1] || "x");
    if (!url || !weight) throw new Error("بلوک فونت ناقص است؛ هیچ فایلی نوشته نشد");
    const response = await fetchImpl(url);
    if (!response || !response.ok) throw new Error("دریافت فایل فونت ناموفق بود (HTTP " + (response ? response.status : "unknown") + ")");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.toString("ascii", 0, 4) !== "wOF2") throw new Error("فایل دریافتی فونت WOFF2 معتبر نیست؛ هیچ صفحه‌ای تغییر نکرد");
    const file = "vazirmatn-" + subset + "-" + weight + ".woff2";
    downloads.push({ file, bytes, css: block.replace(/\/\*[^*]*\*\/\s*/, "").replace(url, "/fonts/" + file) });
  }
  if (!downloads.length) throw new Error("هیچ فایل فونتی برای ذخیره پیدا نشد");

  const fontsDir = path.join(root, "fonts"), cssDir = path.join(root, "css");
  fs.mkdirSync(fontsDir, { recursive: true });
  fs.mkdirSync(cssDir, { recursive: true });
  const staged = [];
  try {
    for (const item of downloads) {
      const temp = path.join(fontsDir, "." + item.file + ".tmp-" + process.pid);
      fs.writeFileSync(temp, item.bytes, { flag: "wx" });
      staged.push([temp, path.join(fontsDir, item.file)]);
    }
    const cssTemp = path.join(cssDir, ".fonts.css.tmp-" + process.pid);
    const cssOut = "/* خودکار با tools/self-host-fonts.js ساخته شده */\n" + downloads.map((item) => item.css).join("\n") + "\n";
    fs.writeFileSync(cssTemp, cssOut, { flag: "wx" });
    staged.push([cssTemp, path.join(cssDir, "fonts.css")]);
    for (const [temp, target] of staged) fs.renameSync(temp, target);
  } catch (error) {
    for (const [temp] of staged) { try { fs.rmSync(temp, { force: true }); } catch {} }
    throw error;
  }

  const re = /<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g;
  const pre = /<link[^>]*rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g;
  let touched = 0;
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!/^(node_modules|\.git|img|fonts)$/.test(entry.name)) walk(filePath); return; }
    if (!entry.name.endsWith(".html")) return;
    const html = fs.readFileSync(filePath, "utf8");
    if (!/fonts\.googleapis\.com/.test(html)) return;
    let first = true;
    const next = html.replace(pre, "").replace(re, () => first ? ((first = false), '<link rel="stylesheet" href="/css/fonts.css">') : "");
    fs.writeFileSync(filePath, next);
    touched++;
  });
  walk(root);
  return { fontFiles: downloads.length, pages: touched };
}

if (require.main === module) {
  selfHostFonts()
    .then(({ fontFiles, pages }) => console.log("✓ " + fontFiles + " فایل فونت اعتبارسنجی و ذخیره شد؛ " + pages + " صفحه به‌روز شد"))
    .catch((error) => { console.error("خطا:", error.message); process.exit(1); });
}
module.exports = { selfHostFonts };
