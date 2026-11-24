#!/usr/bin/env node
/* فونت تیتر سایت (Baloo Bhaijaan 2، وزن ۸۰۰) رو از Google Fonts می‌گیره و بعد از اعتبارسنجی کامل،
   به‌صورت محلی ذخیره می‌کنه و HTMLها رو به‌روز می‌کنه.
   فونت متن (Vazirmatn) روی Google Fonts نیست؛ فایل متغیرش دستی از انتشار رسمی
   rastikerdar/vazirmatn در fonts/vazirmatn-var.woff2 گذاشته شده و این ابزار بهش دست نمی‌زنه.
   فقط زیرمجموعه‌های arabic و latin ذخیره می‌شن؛ بقیه در متن‌های سایت استفاده نمی‌شن. */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SUBSETS = new Set(["arabic", "latin"]);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

/* فونت متن (Vazir) دستی نگه داشته می‌شه؛ این بلوک همیشه اول fonts.css نوشته می‌شه
   تا اجرای ابزار، فونت متن رو پاک نکنه. */
const TEXT_FACE = `@font-face {
  font-family: 'Vazir';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(/fonts/vazirmatn-var.woff2?v=subset1) format('woff2-variations'),
       url(/fonts/vazirmatn-var.woff2?v=subset1) format('woff2');
}
`;

/* slug → پیشوند نام فایل؛ weight → بازه‌ای که در @font-face نوشته می‌شه */
const FAMILIES = [
  {
    slug: "baloo",
    weight: "800",
    url: "https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@800&display=swap",
  },
];

async function fetchFamily(family, fetchImpl) {
  const response = await fetchImpl(family.url, { headers: { "User-Agent": UA } });
  if (!response || !response.ok) throw new Error("دریافت CSS فونت ناموفق بود (HTTP " + (response ? response.status : "unknown") + ")");
  const css = await response.text();
  const blocks = css.match(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g) || [];
  if (!blocks.length) throw new Error("پاسخ Google Fonts فاقد @font-face معتبر بود");

  const out = [];
  for (const block of blocks) {
    const url = (block.match(/url\((https:[^)]+)\)/) || [])[1];
    const subset = ((block.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1] || "x");
    if (!url) throw new Error("بلوک فونت ناقص است؛ هیچ فایلی نوشته نشد");
    if (!SUBSETS.has(subset)) continue;
    const file = family.slug + "-" + subset + ".woff2";
    const fontResponse = await fetchImpl(url);
    if (!fontResponse || !fontResponse.ok) throw new Error("دریافت فایل فونت ناموفق بود (HTTP " + (fontResponse ? fontResponse.status : "unknown") + ")");
    const bytes = Buffer.from(await fontResponse.arrayBuffer());
    if (bytes.length < 100 || bytes.toString("ascii", 0, 4) !== "wOF2") throw new Error("فایل دریافتی فونت WOFF2 معتبر نیست؛ هیچ صفحه‌ای تغییر نکرد");
    const css = block
      .replace(/\/\*[^*]*\*\/\s*/, "")
      .replace(/font-weight:\s*[\d ]+;/, "font-weight: " + family.weight + ";")
      .replace(url, "/fonts/" + file);
    out.push({ file, bytes, css });
  }
  return out;
}

async function selfHostFonts({ root = ROOT, fetchImpl = fetch } = {}) {
  const downloads = [];
  for (const family of FAMILIES) downloads.push(...(await fetchFamily(family, fetchImpl)));
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
    const header = "/* خودکار با tools/self-host-fonts.js ساخته شده — مجوزها در fonts/OFL-*.txt */\n";
    const cssOut = header + TEXT_FACE + downloads.map((item) => item.css).join("\n") + "\n";
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
module.exports = { selfHostFonts, FAMILIES };
