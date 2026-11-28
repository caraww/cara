# راه‌اندازی GTM و اندازه‌گیری فروش

این سند می‌گوید الان چه چیزی در کد کار می‌کند، چه کاری فقط یک بار باید در پنل
Google Tag Manager انجام شود، و بعد از آن گزارش فروش را از کجا ببینی.

## وضعیت کد (تمام شده)

- کانتینر: `GTM-P54M67FG` — روی همه‌ی صفحه‌های عمومی لود می‌شود.
- پراپرتی GA4 داخل کانتینر: `G-DNFXJ5KC44`.
- اسنیپت استاندارد است: `dataLayer` + `gtm.start` همان اول `head`، و اسکریپت
  سنگین کانتینر ۲٫۵ ثانیه بعد از اولین رنگ‌آمیزی صفحه اضافه می‌شود تا سرعت
  سایت افت نکند. یک منبع واحد: `lib/analytics-snippet.js`؛ خروجی روی صفحه‌ها با
  `node tools/sync-analytics.js`.
- صفحه‌هایی که GTM ندارند و نباید داشته باشند: `admin.html`، `admin/index.html`،
  `admin-reviews.html`، `challenge-admin.html`، `customers.html` و `track.html`
  (آدرس `track.html` توکن خصوصی پیگیری سفارش را در query دارد).

### رویدادهایی که سایت می‌فرستد

رویدادها با نام استاندارد GA4 در `dataLayer` قرار می‌گیرند
(`window.CARA.ecom` در `js/analytics.js`):

| رویداد | کجا | پارامترها |
| --- | --- | --- |
| `view_item` | صفحه‌ی هر دستبند، و باز شدن لایت‌باکس گالری | `currency: "IRT"`, `value`, `items[]` |
| `view_item_list` | گالری، بعد از رسیدن قیمت‌ها | `item_list_id`, `item_list_name`, `items[]` |
| `search` | جست‌وجوی گالری (بعد از ۰٫۹ ثانیه توقف تایپ) | `search_term` |
| `add_to_cart` | افزودن از کارت گالری یا سبد | `currency`, `value`, `items[]` |
| `remove_from_cart` | حذف از سبد | `currency`, `value`, `items[]` |
| `begin_checkout` | زدن دکمه‌ی پرداخت (سبدی، طرح سفارشی، سفارش مستقیم) | `currency`, `value`, `items[]`, `payment_type` |
| `purchase` | بازگشت موفق از درگاه، بعد از تأیید سرور | `transaction_id`, `currency`, `value`, `items[]` |

رویدادهای قبلی (`cara_cart_add`، `cara_checkout_start`، …) هم دست‌نخورده
می‌مانند و برای Clarity و تحلیل رفتار میزبان هستند.

**حریم خصوصی:** هیچ اسم، شماره، آدرس یا ایمیلی به `dataLayer` نمی‌رود. فقط
شناسه‌ی کالا، عنوان، تعداد و مبلغ. شماره‌ی سفارش (UUID) بعد از خواندن از آدرس
حذف می‌شود (`history.replaceState`) تا در گزارش‌های صفحه ثبت نشود.
تست `test/private-pages-no-analytics.test.js` این قاعده را قفل می‌کند.

## کاری که فقط در پنل GTM انجام می‌شود (یک بار، حدود ۳ دقیقه)

بدون این سه مورد، رویدادها در `dataLayer` می‌مانند و به GA4 نمی‌رسند.

1. **Variables → New → Data Layer Variable**
   - Name: `Event`
   - Data Layer Variable Name: `event`
   - Save

2. **Triggers → New → Custom Event**
   - Event name: `.+`
   - تیک **Use regex matching** را بزن
   - This trigger fires on: All Custom Events
   - Save

3. **Tags → New → Tag Configuration → Google Analytics: GA4 Event**
   - Measurement ID: `G-DNFXJ5KC44`
   - Event Name: `{{Event}}`
   - اگر فیلد **Send Ecommerce data** بود: `Data Layer`
   - Triggering: همان تریگر مرحله‌ی ۲
   - Save

4. **Submit → Publish** با پیام `ecommerce events`

بعد از این، هر رویداد جدیدی که به کد اضافه شود خودکار به GA4 می‌رود؛ دیگر
لازم نیست تگ بسازی.

## تأیید اینکه کار می‌کند

- GTM → **Preview**: آدرس `https://caraw.ir/gallery.html` را باز کن، روی یک
  کارت کلیک کن؛ باید `view_item` را در پنل Preview ببینی.
- GA4 → **Admin → DebugView**: با همان تب، رویدادها را زنده ببین.
- GA4 → **Reports → Realtime**: ۳۰ دقیقه بعد از انتشار، `view_item` و
  `begin_checkout` باید بیایند.
- یادآوری: خرید تستی نکن، وگرنه یک `purchase` تقلبی در گزارش می‌ماند. برای
  تست، در GTM یک متغیر `{{Debug Mode}}` بگذار و شرط تگ را روی آن بگذار (اختیاری).

## خواندن نتیجه

GA4 → **Explore → Funnel exploration**:

1. `view_item`
2. `add_to_cart`
3. `begin_checkout`
4. `purchase`

Breakdown: `device` و `session source/medium`.

تفسیر ساده:

- بازدید هست ولی `view_item` کم است: مشکل صفحه‌ی اصلی و ورودی ترافیک.
- `view_item` زیاد و `add_to_cart` کم: مشکل اعتماد، قیمت یا وضوح دکمه.
- `add_to_cart` زیاد و `begin_checkout` کم: مشکل هزینه‌ی ارسال یا اصطکاک سبد.
- `begin_checkout` زیاد و `purchase` کم: مشکل درگاه یا فرم (شماره، آدرس، خطای پرداخت).

## نکته‌ها

- مبلغ‌ها به **تومان** و با `currency: "IRT"` فرستاده می‌شوند. GA4 واحد پول
  رسمی سه‌حرفی می‌خواهد؛ `IRT` بین‌المللی رسمی نیست ولی برای تومان رایج است.
  اگر خواستی ریال بفرستی، در `js/analytics.js` یک جای واحد تغییر می‌کند.
- اگر برگشت از درگاه در تب جدید باز شود، مبلغ سفارش در `sessionStorage` نیست و
  `purchase` با `value: 0` می‌رود. تعداد خرید درست می‌ماند، درآمد کم‌شمرده
  می‌شود. راه‌حل کامل: برگرداندن مبلغ از `/api/order-status` (تغییر Worker).
- کاربرانی که مسدودکننده‌ی تبلیغات دارند یا از فیلترشکن استفاده می‌کنند ممکن است
  ثبت نشوند؛ اعداد GA4 همیشه کمی کمتر از واقعیت است.
