#!/usr/bin/env node
/* Vazirmatn را دانلود می‌کند، پاسخ‌ها را اعتبارسنجی می‌کند و بعد از کامل شدن همه‌ی دانلودها فایل‌ها را می‌نویسد. */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const MAX_FONT_BYTES = 2 * 1024 * 1024;
const MAX_CSS_BYTES = 1024 * 1024;

async function checkedFetch(url, options = {}, kind = "font", fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  if (!response || !response.ok) {
    const status = response && Number.isFinite(response.status) ? response.status : "unknown";
    throw new Error(`درخواست ${kind} ناموفق بود (HTTP ${status}): ${url}`);
  }
  const contentType = String(response.headers && response.headers.get("content-type") || "").toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error(`پاسخ ${kind} خالی بود: ${url}`);

  if (kind === "css") {
    if (!contentType.includes("text/css")) throw new Error(`نوع محتوای CSS نامعتبر است: ${contentType || "نامشخص"}`);
    if (buffer.length > MAX_CSS_BYTES) throw new Error("فایل CSS فونت بیش از حد بزرگ است");
    const text = buffer.toString("utf8");
    if (!text.includes("@font-face")) throw new Error("پاسخ CSS شامل @font-face نیست");
  } else {
    if (!/(font\/|woff2|octet-stream)/.test(contentType)) {
      throw new Error(`نوع محتوای فونت نامعتبر است: ${contentType || "نامشخص"}`);
    }
    if (buffer.length > MAX_FONT_BYTES) throw new Error("فایل فونت بیش از حد بزرگ است");
    if (buffer.subarray(0, 4).toString("ascii") !== "wOF2") throw new Error("امضای فایل WOFF2 معتبر نیست");
  }
  return { buffer, contentType };
}

async function buildFonts({ root = ROOT, cssUrl = CSS_URL, fetchImpl = fetch } = {}) {
  const cssResult = await checkedFetch(
    cssUrl,
    { headers: { "User-Agent": USER_AGENT } },
    "css",
    fetchImpl,
  );
  const css = cssResult.buffer.toString("utf8");
  const blocks = css.match(/(\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g) || [];
  if (!blocks.length) throw new Error("هیچ بلوک @font-face پیدا نشد");

  const assets = [];
  const names = new Set();
  for (const block of blocks) {
    const url = (block.match(/url\((https:[^)]+)\)/) || [])[1];
    if (!url) continue;
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
    const subset = ((block.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1] || "x");
    if (!weight) throw new Error("یکی از بلوک‌های فونت وزن مشخص ندارد");
    const file = `vazirmatn-${subset}-${weight}.woff2`;
    if (names.has(file)) throw new Error(`نام فایل فونت تکراری است: ${file}`);
    names.add(file);
    const downloaded = await checkedFetch(url, {}, "font", fetchImpl);
    assets.push({
      file,
      buffer: downloaded.buffer,
      css: block.replace(/\/\*[^*]*\*\/\s*/, "").replace(url, `/fonts/${file}`),
    });
  }
  if (!assets.length) throw new Error("هیچ فایل فونتی از CSS استخراج نشد");

  const outputCss = "/* خودکار با tools/self-host-fonts.js ساخته شده */\n" +
    assets.map((asset) => asset.css).join("\n") + "\n";
  const fontDir = path.join(root, "fonts");
  const cssDir = path.join(root, "css");
  const staging = fs.mkdtempSync(path.join(root, ".fonts-build-"));
  try {
    fs.mkdirSync(path.join(staging, "fonts"), { recursive: true });
    for (const asset of assets) fs.writeFileSync(path.join(staging, "fonts", asset.file), asset.buffer);
    fs.writeFileSync(path.join(staging, "fonts.css"), outputCss);

    fs.mkdirSync(fontDir, { recursive: true });
    fs.mkdirSync(cssDir, { recursive: true });
    for (const asset of assets) {
      fs.copyFileSync(path.join(staging, "fonts", asset.file), path.join(fontDir, asset.file));
    }
    fs.copyFileSync(path.join(staging, "fonts.css"), path.join(cssDir, "fonts.css"));
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  const googleLink = /<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g;
  const preconnect = /<link[^>]*rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g;
  let touched = 0;
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(node_modules|\.git|img|fonts|\.fonts-build-)/.test(entry.name)) walk(filePath);
      return;
    }
    if (!entry.name.endsWith(".html")) return;
    const html = fs.readFileSync(filePath, "utf8");
    if (!/fonts\.googleapis\.com/.test(html)) return;
    let first = true;
    const next = html.replace(preconnect, "").replace(googleLink, () =>
      first ? ((first = false), '<link rel="stylesheet" href="/css/fonts.css">') : "");
    fs.writeFileSync(filePath, next);
    touched++;
  });
  walk(root);
  return { fontCount: assets.length, touched };
}

if (require.main === module) {
  buildFonts().then(({ fontCount, touched }) => {
    console.log(`✓ ${fontCount} فایل فونت، css/fonts.css و ${touched} صفحه به‌روز شد`);
  }).catch((error) => {
    console.error("خطا:", error.message);
    process.exit(1);
  });
}

module.exports = { checkedFetch, buildFonts };
