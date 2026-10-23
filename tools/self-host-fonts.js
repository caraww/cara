#!/usr/bin/env node
/* فونت Vazirmatn رو از Google Fonts می‌گیره، توی fonts/ ذخیره می‌کنه، css/fonts.css می‌سازه
   و لینک Google Fonts رو توی همه‌ی html ها با فایل خودت عوض می‌کنه (توی ایران Google Fonts گاهی کند یا قطعه).
   یک بار روی کامپیوتر خودت (با اینترنت) اجرا کن، از ریشه‌ی پروژه:  node tools/self-host-fonts.js
   بعدش:  node tools/build-pages.js  (صفحه‌های ساخته‌شده هم از فونت محلی استفاده کنن) */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap";
(async () => {
  /* با User-Agent مرورگر مدرن، گوگل woff2 می‌ده */
  const css = await (await fetch(CSS_URL, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } })).text();
  const blocks = css.match(/(\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g) || [];
  if (!blocks.length) throw new Error("جواب گوگل خالی بود");
  fs.mkdirSync(path.join(ROOT, "fonts"), { recursive: true });
  let out = "/* خودکار با tools/self-host-fonts.js ساخته شده */\n", n = 0;
  for (const b of blocks) {
    const url = (b.match(/url\((https:[^)]+)\)/) || [])[1]; if (!url) continue;
    const w = (b.match(/font-weight:\s*(\d+)/) || [])[1], sub = ((b.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1] || "x");
    const file = `vazirmatn-${sub}-${w}.woff2`;
    fs.writeFileSync(path.join(ROOT, "fonts", file), Buffer.from(await (await fetch(url)).arrayBuffer()));
    out += b.replace(/\/\*[^*]*\*\/\s*/, "").replace(url, `/fonts/${file}`) + "\n"; n++;
  }
  fs.mkdirSync(path.join(ROOT, "css"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "css/fonts.css"), out);
  const re = /<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, pre = /<link[^>]*rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g;
  let touched = 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(node_modules|\.git|img|fonts)$/.test(e.name)) walk(p); return; }
    if (!e.name.endsWith(".html")) return;
    const h = fs.readFileSync(p, "utf8"); if (!/fonts\.googleapis\.com/.test(h)) return;
    let first = true;
    const next = h.replace(pre, "").replace(re, () => (first ? ((first = false), '<link rel="stylesheet" href="/css/fonts.css">') : ""));
    fs.writeFileSync(p, next); touched++;
  });
  walk(ROOT);
  console.log(`✓ ${n} فایل فونت، css/fonts.css و ${touched} صفحه به‌روز شد`);
})().catch((e) => { console.error("خطا:", e.message); process.exit(1); });
