#!/usr/bin/env node
/* هدر یکسان برای همه‌ی صفحه‌ها.
   از ریشه‌ی پروژه اجرا کن:  node tools/sync-header.js          (اعمال)
                              node tools/sync-header.js --dry    (فقط گزارش)
   کارش، روی همه‌ی html های ریشه + colors/ + bracelet/:
   ۱) هدر قدیمی (header.top یا header.cn-header) رو با یک هدر استاندارد عوض می‌کنه
   ۲) لینک صفحه‌ی فعلی رو aria-current="page" می‌کنه
   ۳) اگه js/mobile-nav.js توی صفحه نبود، اضافه‌ش می‌کنه (دکمه‌ی همبرگری موبایل)
   ظاهر هدر فقط از css/site-nav.css میاد. ادمین/مشتریان/آفلاین دست نمی‌خورن.
   هر وقت منو عوض شد، فقط آرایه‌ی LINKS رو همین‌جا عوض کن و دوباره اجرا کن. */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");
const SKIP = new Set(["admin.html", "customers.html", "offline.html"]);

/* ترتیب = ترتیب نمایش (در RTL از راست به چپ). cta = دکمه‌ی طلایی اصلی */
const LINKS = [
  { href: "/gallery.html", text: "گالری" },
  { href: "/upload.html", text: "عکس به الگو" },
  { href: "/name-bracelet.html", text: "اسم روی دستبند" },
  { href: "/game.html", text: "بازی" },
  { href: "/cart.html", text: "سبد خرید" },
  { href: "/account.html", text: "حساب کاربری" },
  { href: "/builder.html", text: "طراحی دستبند", cta: true },
];

function header(current) {
  const links = LINKS.map((l) => {
    const cls = l.cta ? ' class="cta"' : "";
    const cur = l.href === current ? ' aria-current="page"' : "";
    return `    <a${cls} href="${l.href}"${cur}>${l.text}</a>`;
  }).join("\n");
  return [
    '<header class="top solid">',
    '  <a href="/" class="logo" aria-label="cara — صفحه‌ی اصلی"><img src="/img/cara-logo.png?v=2" alt="cara" style="height:44px;width:auto;display:block"></a>',
    '  <nav aria-label="منوی اصلی">',
    links,
    "  </nav>",
    "</header>",
  ].join("\n");
}

const HEADER_RE = /<header\b[^>]*class="[^"]*\b(?:top|cn-header)\b[^"]*"[^>]*>[\s\S]*?<\/header>/;
let changed = 0;
for (const d of ["", "colors", "bracelet"]) {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    if (d === "" && SKIP.has(f)) continue;
    const p = path.join(dir, f);
    const src = fs.readFileSync(p, "utf8");
    if (!HEADER_RE.test(src)) continue;
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const current = d === "" && f !== "index.html" ? "/" + f : "";
    let out = src.replace(HEADER_RE, () => header(current).replace(/\n/g, eol));
    if (!/js\/mobile-nav\.js/.test(out))
      out = out.replace("</body>", `  <script src="/js/mobile-nav.js?v=20261113" defer></script>${eol}</body>`);
    if (out !== src) { changed++; if (!dry) fs.writeFileSync(p, out); }
  }
}
console.log((dry ? "[dry] " : "") + changed + " فایل تغییر کرد.");
