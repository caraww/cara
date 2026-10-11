# cara — ساختار پروژه

سایت روی GitHub Pages (فایل‌های استاتیک) و فقط `/api/*` روی Cloudflare Worker.

```
cara-site/
├─ *.html            صفحه‌ها (index, builder, upload, gallery, checkout, game, admin)
├─ css/              ← css/README.md
├─ js/               اسکریپت‌های مرورگر
├─ img/              (توی این بسته نیست؛ همون پوشه‌ی خودت)
├─ data/works.json   خروجی tools/build-works.js
├─ tools/            ابزارهای خط فرمان (روی کامپیوتر خودت اجرا می‌شن)
├─ index.js, game-worker.js, wrangler.jsonc   Worker (پرداخت زیبال، سفارش‌ها، بازی)
├─ server.js         سرور Node قدیمی (سپال) — زیر ببین
└─ robots.txt, sitemap.xml, .nojekyll, package*.json
```

## هر صفحه چی لود می‌کنه
| صفحه | CSS | JS |
|---|---|---|
| index | home → decor | palette → works → beads → home → decor |
| builder | studio → decor → builder | palette → builder → decor |
| upload | studio → decor → upload | palette → upload → decor |
| gallery | studio → gallery → decor | palette → works → gallery → decor |
| checkout | studio → decor | palette → checkout → decor |
| game | studio → decor | game → decor |
| admin | inline | palette |

## JS
| فایل | کارش |
|---|---|
| palette.js | رنگ‌ها و ابزارهای مشترک؛ server.js و tools/sync-valid.js هم می‌خوننش |
| decor.js | حرکت‌ها و جزئیات خلاق (همه‌ی صفحه‌ها) |
| home / builder / upload / gallery / checkout / game .js | هر کدوم مال صفحه‌ی خودش (بخش‌ها داخل فایل بنر دارن) |
| works.js, beads.js | خودکار؛ دستی ویرایش نکن |

## ابزارها (از ریشه‌ی پروژه اجرا کن)
| دستور | کار |
|---|---|
| `node tools/soften-edges.js` | نرم کردن لبه‌ی PNG های برش‌خورده |
| `node tools/build-works.js` | ساخت js/works.js + data/works.json + عکس‌های سبک؛ نسخه‌ی works.js رو توی index/gallery.html عوض می‌کنه |
| `node tools/build-beads.js` | ساخت js/beads.js از img/beads |
| `node tools/sync-valid.js index.js` | هماهنگ کردن لیست رنگ‌های Worker با palette.js (`--check` فقط بررسی) |
| `tools/zibal-relay.js` | رله‌ی Node برای آی‌پی ثابت زیبال (روی VPS، نه این پروژه) |

بعد از هر تغییر توی palette.js: `node tools/sync-valid.js index.js` و بعد `npx wrangler deploy`.

## چیزهایی که باید خودت تصمیم بگیری
- **server.js** با درگاه سپال کار می‌کنه، ولی Worker (`index.js`) با زیبال؛ طبق wrangler.jsonc سایت فعلی روی Worker می‌چرخه. اگه server.js دیگه استفاده نمی‌شه پاکش کن (همراه `orders/` و `package.json > scripts.start`).
- **tools/zibal-relay.js**: `ZIBAL_BASE` توی wrangler به یه رله‌ی `.php` اشاره می‌کنه، پس این نسخه‌ی Node احتمالاً استفاده نمی‌شه.
- **package.json**: `@imgly/background-removal-node` توی هیچ فایلی استفاده نشده؛ `sharp` فقط برای tools لازمه.
- `WRANGLER-SNIPPET.txt` حذف شد: تنظیمش (Durable Object بازی) از قبل توی wrangler.jsonc و index.js هست.
