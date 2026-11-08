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




## اپلیکیشن موبایل (PWA)

سایت cara به‌صورت Progressive Web App قابل نصب است و نیازی به اپ جداگانه یا انتشار در فروشگاه‌ها ندارد.

- فایل `manifest.webmanifest` نام، رنگ‌ها، آیکون و حالت اجرای مستقل اپ را تعریف می‌کند.
- فایل `sw.js` صفحات بازدیدشده و فایل‌های استاتیک را برای دسترسی آفلاین cache می‌کند؛ درخواست‌های `/api/*` و مسیر مدیریت cache نمی‌شوند.
- فایل `js/pwa.js` سرویس‌ورکر را ثبت می‌کند و راهنمای نصب را در مرورگرهای پشتیبانی‌شده نمایش می‌دهد.
- در Android از گزینه Install app مرورگر استفاده کنید. در iPhone/iPad صفحه را در Safari باز کنید، Share و سپس Add to Home Screen را بزنید.
- برای به‌روزرسانی cache، مقدار `CACHE_NAME` در `sw.js` را افزایش دهید.

توجه: ثبت سفارش، وضعیت لحظه‌ای محصولات و پرداخت زیبال همچنان به اینترنت نیاز دارند؛ حالت آفلاین فقط برای پوسته و فایل‌های ذخیره‌شده است.

## ساخت و بررسی نسخه‌ی سایت

برای ساخت خروجی استاتیک از ریشه‌ی پروژه:

```sh
npm ci
npm run build
npm run check:palette
npm test
```

ترتیب build ثابت است:

1. `build:beads` از عکس‌های `img/beads` فایل `js/beads.js` را می‌سازد.
2. `build:works` با Sharp اجباری، تصاویر کوچک WebP، `js/works.js` و `data/works.json` را از `img/works-cutouts` و metadata می‌سازد.
3. `build:pages` صفحه‌های استاتیک دستبند و رنگ‌ها، لینک‌های داخلی، JSON-LD، `sitemap.xml` و `robots.txt` را می‌سازد.

فایل‌های تولیدشده را دستی ویرایش نکن؛ منبع را در پوشه‌ی تصاویر و metadata اصلاح کن و build را دوباره اجرا کن. از پوشه‌های عکس اصلی قبل از پردازش پشتیبان داشته باش. `npm run check:palette` فقط تطبیق رنگ‌های `js/palette.js` با `VALID` در `index.js` را بررسی می‌کند و چیزی را تغییر نمی‌دهد.

CI روی هر Pull Request ابتدا palette sync و build کامل را اجرا می‌کند و بعد تست‌های Node را می‌گذراند. build به Sharp نیاز دارد و در صورت نبودن آن باید fail شود، نه اینکه تصاویر اصلی را به‌جای نسخه‌ی سبک منتشر کند.

**انتشار:** فایل‌های استاتیک از مسیر GitHub Pages پروژه منتشر می‌شوند. Worker پرداخت/بازی جداست و تغییر فایل‌های `index.js`، `game-worker.js` یا `wrangler.jsonc` به‌تنهایی آن را روی Cloudflare منتشر نمی‌کند؛ پس از تست sandbox و بررسی تنظیمات، دستور `npx wrangler deploy` باید جداگانه اجرا شود. هیچ secretای را در مخزن قرار نده.

### انتشار Worker روی Cloudflare از GitHub Actions

برای فعال‌کردن انتشار دستی، در تنظیمات مخزن این دو مقدار را اضافه کن:

- Actions secret با نام \`CLOUDFLARE_API_TOKEN\` (توکنی با دسترسی لازم برای انتشار Worker و bindingهای همین پروژه)
- Actions variable با نام \`CLOUDFLARE_ACCOUNT_ID\`

سپس در Actions، workflow با نام **Deploy Cloudflare Worker** را از شاخه‌ی \`main\` اجرا کن و در ورودی تأیید دقیقاً \`DEPLOY\` بنویس. workflow ابتدا bundle/config را با \`--dry-run\` اعتبارسنجی می‌کند و فقط در صورت موفقیت deploy واقعی را انجام می‌دهد. هیچ‌وقت token را در چت یا فایل مخزن قرار نده.
