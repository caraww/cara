#!/usr/bin/env node
/* از ریشه‌ی پروژه اجرا کن:  node tools/apply-nav-update.js        (اعمال)
                              node tools/apply-nav-update.js --dry  (فقط گزارش)
   کارش، روی همه‌ی html های ریشه + colors/ + bracelet/:
   ۱) لینک css/mobile-nav.css رو برمی‌داره و css/site-nav.css رو آخر <head> می‌ذاره
   ۲) توی colors/*.html بلاک <style> قدیمی رو حذف می‌کنه و css/color-page.css رو اضافه می‌کنه
   ۳) توی index.html هم css/hero-wow.css و js/hero-wow.js رو اضافه می‌کنه */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");
const V = "v=20261113";
const dirs = ["", "colors", "bracelet"];
let n = 0;
for (const d of dirs) {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    if (f === "admin.html") continue; // ادمین هدر خودش رو داره
    const p = path.join(dir, f);
    let h = fs.readFileSync(p, "utf8");
    if (!/<header[^>]*class="[^"]*\btop\b/.test(h)) continue; // صفحه‌ای که هدر cara نداره
    const o = h;
    h = h.replace(/<link[^>]*mobile-nav\.css[^>]*>\s*/g, "");
    // کش مرورگر: نسخه‌ی studio.css رو عوض می‌کنیم تا فایل جدید لود بشه
    h = h.replace(/(css\/studio\.css)(\?v=[^"']*)?/g, "$1?v=20261113-nav");
    h = h.replace(/<link[^>]*site-nav\.css[^>]*>\s*/g, "");
    let extra = "";
    if (d === "colors" && f !== "index.html") {
      h = h.replace(/<style>[\s\S]*?<\/style>/, "");
      if (!h.includes("color-page.css")) extra += `<link rel="stylesheet" href="/css/color-page.css?${V}">`;
    }
    if (d === "" && f === "index.html" && !h.includes("hero-wow.css")) extra += `<link rel="stylesheet" href="css/hero-wow.css?${V}">`;
    extra += `<link rel="stylesheet" href="/css/site-nav.css?${V}">`;
    h = h.replace("</head>", extra + "\n</head>");
    if (d === "" && f === "index.html" && !h.includes("hero-wow.js")) h = h.replace("</body>", `<script src="js/hero-wow.js?${V}" defer></script>\n</body>`);
    if (h !== o) { n++; if (!dry) fs.writeFileSync(p, h); }
  }
}
console.log((dry ? "[dry] " : "") + n + " فایل تغییر کرد.");
