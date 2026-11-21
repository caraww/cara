#!/usr/bin/env node
/* فونت Estedad (OFL-1.1) رو از Google Fonts می‌گیره و فقط بعد از اعتبارسنجی کامل، خروجی محلی و HTMLها رو به‌روز می‌کنه.
   فقط زیرمجموعه‌های arabic و latin ذخیره می‌شن؛ latin-ext و vietnamese در متن‌های سایت استفاده نمی‌شن. */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Estedad:wght@400;500;600;700;800;900&display=swap";
const SUBSETS = new Set(["arabic", "latin"]);

async function selfHostFonts({ root = ROOT, fetchImpl = fetch } = {}) {
  const cssResponse = await fetchImpl(CSS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
  });
  if (!cssResponse || !cssResponse.ok) throw new Error("دریافت CSS فونت ناموفق بود (HTTP " + (cssResponse ? cssResponse.status : "unknown") + ")");
  const css = await cssResponse.text();
  const blocks = css.match(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g) || [];
  if (!blocks.length) throw new Error("پاسخ Google Fonts فاقد @font-face معتبر بود");

  const downloads = [], seen = new Map();
  for (const block of blocks) {
    const url = (block.match(/url\((https:[^)]+)\)/) || [])[1];
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
    const subset = ((block.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1] || "x");
    if (!url || !weight) throw new Error("بلوک فونت ناقص است؛ هیچ فایلی نوشته نشد");
    if (!SUBSETS.has(subset)) continue;
    const response = await fetchImpl(url);
    if (!response || !response.ok) throw new Error("دریافت فایل فونت ناموفق بود (HTTP " + (response ? response.status : "unknown") + ")");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.toString("ascii", 0, 4) !== "wOF2") throw new Error("فایل دریافتی فونت WOFF2 معتبر نیست؛ هیچ صفحه‌ای تغییر نکرد");
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (seen.has(hash)) continue;
    seen.set(hash, true);
    const file = "estedad-" + subset + ".woff2";
    /* Google Fonts نسخه‌ی متغیر Estedad را برای همه‌ی وزن‌ها یکسان می‌دهد؛ پس یک فایل با بازه‌ی وزن کافی است. */
    const css = block
      .replace(/\/\*[^*]*\*\/\s*/, "")
      .replace(/font-weight:\s*\d+;/, "font-weight: 400 900;")
      .replace(url, "/fonts/" + file);
    downloads.push({ file, bytes, css });
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
