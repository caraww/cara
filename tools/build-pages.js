#!/usr/bin/env node
/* ساخت صفحه‌های سئو از روی data/works.json و js/palette.js:
     bracelet/<نام>.html   یه صفحه‌ی ثابت برای هر دستبند گالری (Product schema)
     colors/<کد>.html + colors/index.html   یه صفحه برای هر رنگ منجوق
     sitemap.xml , robots.txt
   و لینک‌های داخلی رو بین نشانگرهای SEO-LINKS داخل index.html و gallery.html می‌ذاره (چندبار اجرا کنی تکراری نمی‌شه).
   اجرا (از ریشه‌ی پروژه، بعد از build-works.js):  node tools/build-pages.js */
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://caraw.ir";
const { CARA_PALETTE: PAL } = require(path.join(ROOT, "js/palette.js"));
const works = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/works.json"), "utf8"),
);
require(path.join(ROOT, "lib/works-pricing.js"));
const prices = globalThis.CARA_WORK_PRICING.priceMap(works);
const listPrices = globalThis.CARA_WORK_PRICING.baseMap(works);
const SALE = globalThis.CARA_WORK_PRICING.sale;
/* قیمت روزِ حراج؛ خودِ مبلغ کم می‌شود (بدون خط‌خوردن قیمت قبلی). مبلغ پرداختی در درگاه هم
   از همین lib/works-pricing.js می‌آید، پس عدد صفحه و عدد درگاه یکی است. */
function priceHTML(id, withToman) {
  const now = Number(prices[String(id)]) || 0;
  const before = Number(listPrices[String(id)]) || now;
  if (!now) return "";
  const unit = withToman ? " تومان" : "";
  const onSale = SALE.active() && before > now;
  const list = onSale ? ` data-price-list="${before}"` : "";
  const strike = onSale
    ? `<s class="price-list">${fa(before)}</s><b class="price-now">${fa(now)}${unit}</b>`
    : `${fa(now)}${unit}`;
  return `<span class="price" data-price="${now}"${list}>${strike}</span>`;
}
let beadFiles = {};
try {
  const beadSource = fs.readFileSync(path.join(ROOT, "js/beads.js"), "utf8");
  const match = beadSource.match(/\.beadFiles\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (match) beadFiles = JSON.parse(match[1]);
} catch {}
const today = new Date().toISOString().slice(0, 10);

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const fa = (n) => Number(n).toLocaleString("fa-IR");
const slug = (id) =>
  String(id)
    .trim()
    .replace(/[\s\u200c]+/g, "-")
    .replace(/[\/\\?#%.]+/g, ""); /* باید با gallery.js و home.js یکی باشه */
const abs = (p) => "/" + String(p).replace(/^\/+/, "");
const bare = (p) => String(p).split("?")[0];
const urlOf = (w) => `/bracelet/${encodeURIComponent(slug(w.id))}.html`;
const NUM = /^[\s0-9۰-۹.\-_)]+$/;
const titleOf = (w) => (w.title && !NUM.test(w.title) ? w.title : "");
const clip = (value, max) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const chars = [...text];
  return chars.length <= max ? text : chars.slice(0, max - 1).join("").trimEnd() + "…";
};
/* Keep generated result titles concise while retaining the product keyword and full H1/schema name. */
const seoTitle = (name, sample = false) => {
  const prefix = sample ? "نمونه دستبند منجوقی " : "دستبند منجوقی ";
  const suffix = " | کارا";
  const chars = [...String(name).trim()];
  const room = 60 - [...prefix].length - [...suffix].length;
  const shortName =
    chars.length > room
      ? chars
          .slice(0, room - 1)
          .join("")
          .trimEnd() + "…"
      : chars.join("");
  return prefix + shortName + suffix;
};
const write = (rel, txt) => {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, txt);
};

/* فونت‌ها self-host شده‌اند؛ هیچ صفحه‌ای به Google Fonts وابسته نیست. */
const FONT = '<link rel="stylesheet" href="/css/fonts.css">';
const { HEAD, FOOT } = require(path.join(ROOT, "lib/generated-page-layout.js"))(
  { SITE, FONT, esc },
);
const crumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, p], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: SITE + p,
  })),
});

/* ---------- صفحه‌ی هر دستبند ---------- */
const urls = [
  "/",
  "/builder.html",
  "/upload.html",
  "/gallery.html",
  "/size.html",
  "/challenge.html",
  "/game.html",
  "/name-bracelet.html",
  "/colors/",
];
const list = works.filter((w) => titleOf(w));
for (const w of list) {
  const t = titleOf(w),
    imgs = (w.images && w.images.length ? w.images : [w.src]).map(
      (s) => SITE + abs(bare(s)),
    );
  const price = Number(prices[String(w.id)]) || 0;
  const orderable = !w.noOrder && price > 0;
  const rel = list
    .filter(
      (x) => x !== w && (x.tags || []).some((g) => (w.tags || []).includes(g)),
    )
    .concat(list.filter((x) => x !== w))
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 4);
  const title = seoTitle(t, !orderable);
  const desc = orderable
    ? `${clip(w.note, 88)} | دستبند منجوقی ${t}، دست‌باف با منجوق دلیکای میوکی و آماده‌ی ارسال.`
    : `${clip(w.note, 88)} | نمونه‌ی دستبند منجوقی ${t}؛ طرح دلخواهت را از عکس یا در استودیو بساز.`;
  const product = {
    "@type": "Product",
    name: `دستبند منجوقی ${t}`,
    description: w.note || t,
    image: imgs,
    brand: { "@type": "Brand", name: "cara" },
    url: SITE + urlOf(w),
  };
  if (orderable)
    product.offers = {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: String(price * 10),
      availability: "https://schema.org/MadeToOrder",
      url: SITE + urlOf(w),
      seller: { "@type": "Organization", name: "cara" },
    };
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      product,
      crumbLd([
        ["خانه", "/"],
        ["گالری", "/gallery.html"],
        [t, urlOf(w)],
      ]),
    ],
  };
  const galleryImages = (w.images && w.images.length ? w.images : [w.src]).map((s) => abs(bare(s)));
  const wristImage = galleryImages[1] || "";
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/category/beaded-bracelet.html">دستبند منجوقی</a> › <a href="/gallery.html">گالری</a> › ${esc(t)}</div>
<h1>دستبند منجوقی ${esc(t)}</h1>
<div class="pg-grid"><div class="pg-img"><img id="pgMainImage" src="${esc(abs(w.src))}" alt="دستبند منجوقی ${esc(t)} دست‌باف"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} fetchpriority="high">
${
  wristImage
    ? `<div class="pg-view-toggle" role="group" aria-label="نوع پیش‌نمایش"><button type="button" class="is-on" data-pg-view="flat">تصویر دستبند</button><button type="button" data-pg-view="wrist">پیش‌نمایش روی مچ</button></div><p class="pg-view-note" id="pgViewNote" hidden>تصویر دوم این طرح، حالت روی مچ را نشان می‌دهد. رنگ واقعی روی مانیتورهای مختلف کمی فرق می‌کند.</p>`
    : ""
}
${
  w.images && w.images.length > 1
    ? `<div class="pg-thumbs">${w.images
        .slice(1)
        .map(
          (s) =>
            `<img src="${esc(abs(s))}" alt="دستبند منجوقی ${esc(t)}، عکس دیگر"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} loading="lazy">`,
        )
        .join("")}</div>`
    : ""
}</div>
<div><p>${esc(w.note || "")}</p>
${(w.tags || []).length ? `<div class="tags">${w.tags.map((g) => `<span>${esc(g)}</span>`).join("")}</div>` : ""}
${
  orderable
    ? `<div class="pg-price">${priceHTML(w.id, true)}</div><div class="btns"><a class="btn dark" href="/checkout.html?work=${encodeURIComponent(w.id)}">سفارش این دستبند</a><a class="btn" href="/builder.html">همین طرح با رنگ‌های خودم</a><a class="btn" href="/upload.html?src=${encodeURIComponent(w.source || w.src)}">از روی این عکس الگو بساز</a><button class="btn" type="button" data-share-work data-share-title="دستبند منجوقی ${esc(t)} | کارا">اشتراک‌گذاری</button></div>`
    : `<div class="btns"><a class="btn dark" href="/upload.html">عکس خودت رو به الگو تبدیل کن</a><a class="btn" href="/builder.html">طراحی دستی</a><button class="btn" type="button" data-share-work data-share-title="دستبند منجوقی ${esc(t)} | کارا">اشتراک‌گذاری</button></div>`
}
<section class="trust-strip" aria-label="چرا خرید از کارا مطمئن است">
  <div class="trust-strip__item"><b>دست‌باف</b><span>با منجوق دلیکای میوکی ژاپنی</span></div>
  <div class="trust-strip__item"><b>آماده تا ۱ هفته</b><span>بافت و بسته‌بندی با دست</span></div>
  <div class="trust-strip__item"><b>پرداخت امن</b><span>درگاه بانکی زیبال / دیجی‌پی</span></div>
  <div class="trust-strip__item"><b>پیگیری سفارش</b><span><a href="/track.html">لینک اختصاصی</a></span></div>
</section>
<p style="margin-top:16px;color:var(--muted);font-size:16px">دست‌باف با منجوق دلیکای میوکی ژاپنی. حداکثر تا یک هفته بعد از سفارش آماده و برات پست می‌شه. می‌تونی همین طرح رو توی <a href="/builder.html" style="text-decoration:underline">استودیو</a> عوض کنی یا طرح خودت رو بسازی. اگر دنبال یک شروع کم‌خطرتر هستی، <a href="/starter.html" style="text-decoration:underline">دستبندهای شروع</a> رو ببین.</p>
<div class="pg-help"><a href="/size.html">راهنمای اندازه‌ی مچ</a><a href="https://instagram.com/_.caraw" target="_blank" rel="noopener">پیام در اینستاگرام</a><a href="tel:+989352528201" dir="ltr">تماس تلفنی</a></div></div></div>
<h2>دستبندهای دیگه</h2><div class="rel">${rel.map((x) => `<a href="${urlOf(x)}"><img src="${esc(abs(x.thumb || x.src))}"${x.thumb240 ? ` srcset="${esc(abs(x.thumb240))} 240w, ${esc(abs(x.thumb480))} 480w, ${esc(abs(x.thumb))} 700w" sizes="(max-width:560px) 45vw, 150px"` : ""} alt="دستبند منجوقی ${esc(titleOf(x))}"${x.w ? ` width="${x.w}" height="${x.h}"` : ""} loading="lazy">${esc(titleOf(x))}</a>`).join("")}</div>
<h2 id="reviews">نظر خریداران</h2><div class="reviews" data-reviews data-work="${esc(w.id)}"></div>
${orderable ? `<div class="pg-cta" role="region" aria-label="سفارش سریع"><div class="pg-cta__info"><b>${esc(t)}</b><span class="pg-cta__price">${priceHTML(w.id, true)}</span></div><a class="btn dark" href="/checkout.html?work=${encodeURIComponent(w.id)}">سفارش این دستبند</a></div>` : ""}`;
  write(
    `bracelet/${slug(w.id)}.html`,
    HEAD({ title, desc, path: urlOf(w), image: imgs[0], ld }) + body + FOOT,
  );
  urls.push(urlOf(w));
}
/* ---------- صفحه‌ی شروع کم‌خطر ---------- */
const STARTER_MAX = 1200000;
const starter = list
  .filter((w) => !w.noOrder && Number(prices[String(w.id)]) > 0 && Number(prices[String(w.id)]) <= STARTER_MAX)
  .sort((a, b) => Number(prices[String(a.id)]) - Number(prices[String(b.id)]));
{
  const title = "دستبند منجوقی شروع کم‌خطر | انتخاب ساده و قیمت واقعی | کارا";
  const desc = "اگه اولین خریدته، از دستبندهای ساده‌تر و کم‌هزینه‌تر کارا شروع کن. قیمت‌ها از گالری واقعی میاد و دستبند با منجوق دلیکای میوکی دست‌باف می‌شه.";
  const starterLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description: desc,
        url: SITE + "/starter.html",
        inLanguage: "fa-IR",
      },
      {
        "@type": "ItemList",
        itemListElement: starter.map((w, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: SITE + urlOf(w),
          name: `دستبند منجوقی ${titleOf(w)}`,
        })),
      },
      crumbLd([["خانه", "/"], ["شروع کم‌خطر", "/starter.html"]]),
    ],
  };
  const cards = starter.length
    ? starter.map((w) => {
        const price = Number(prices[String(w.id)]);
        return `<a class="starter-card" href="${urlOf(w)}"><img src="${esc(abs(w.thumb || w.src))}"${w.thumb240 ? ` srcset="${esc(abs(w.thumb240))} 240w, ${esc(abs(w.thumb480))} 480w, ${esc(abs(w.thumb))} 700w" sizes="(max-width:760px) 90vw, 300px"` : ""} alt="دستبند منجوقی ${esc(titleOf(w))}"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} loading="lazy"><b>${esc(titleOf(w))}</b><span>${priceHTML(w.id, true)}</span><small>${esc((w.note || "").slice(0, 80))}</small></a>`;
      }).join("")
    : `<p class="cp__note">فعلاً دستبند آماده‌ای زیر سقف قیمت شروع نداریم. می‌تونی توی استودیو یه طرح ساده بسازی و قیمت رو همون‌جا ببینی.</p>`;
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/gallery.html">گالری</a> › شروع کم‌خطر</div>
<h1>برای اولین دستبندت از کجا شروع کنی؟</h1>
<p class="cp__lead">اگه اولین باره می‌خوای دستبند منجوقی سفارش بدی، از همین‌جا شروع کنیم. چندتا از طرح‌های ساده‌تر و خوش‌قیمت‌تر گالری رو برات جدا کردم تا با خیال راحت‌تر بافت، رنگ و اندازه رو بشناسی؛ قیمت‌ها هم همون قیمت‌های واقعی گالری‌ان.</p>
<div class="starter-grid">${cards}</div>
<h2>یه شروع ساده و دوست‌داشتنی</h2>
<p>برای سفارش اول لازم نیست سراغ طرح‌های شلوغ یا بزرگ بری. یه مدل ساده کمک می‌کنه با ظرافت منجوق‌ها، رنگ واقعی و فرم بافت آشنا بشی. بعدش اگر دلت خواست، می‌تونی سراغ طرح‌های پرجزئیات‌تر یا حتی ایده‌ی کاملاً شخصی خودت بری.</p>
<p>همه‌ی این دستبندها با همون منجوق دلیکای میوکی ژاپنی بافته می‌شن که توی بقیه‌ی گالری استفاده می‌شه. تفاوت توی پیچیدگی طرح و تعداد منجوقه، نه توی جنس مواد. اگه بعد از خرید اول خواستی طرح بزرگ‌تری سفارش بدی، می‌تونی همون رنگ‌های موردعلاقه‌ات رو توی استودیو نگه داری.</p>
<h2>اگه سایز مچم رو ندونم چی؟</h2>
<p>قبل از سفارش، <a href="/size.html">راهنمای اندازه‌ی مچ</a> رو ببین. با متر خیاطی یا نوار کاغذی دور مچ رو اندازه بگیر و عدد رو برای ما بنویس. دستبندهای کارا گره قابل تنظیم دارن، ولی دونستن دور مچ کمک می‌کنه طول مناسب‌تری انتخاب بشه. اگه بین دو اندازه بودی، بزرگ‌تر رو انتخاب کن.</p>
<h2>سفارش با رنگ‌های خودم</h2>
<p>هیچ‌کدوم از این طرح‌ها به دلت ننشست؟ توی <a href="/builder.html">استودیوی طراحی</a> می‌تونی رنگ‌ها رو خودت بچینی و طرح دلخواهت رو بسازی؛ قیمت همون‌جا بر اساس تعداد منجوق و زمان بافت حساب می‌شه. اگر قبل از سفارش سوالی داشتی، توی <a href="https://instagram.com/_.caraw" target="_blank" rel="noopener">اینستاگرام</a> پیام بده یا باهام تماس بگیر.</p>
<div class="cp__note"><p><b>یه نکته‌ی صادقانه:</b> این صفحه فقط طرح‌هایی رو نشون می‌ده که قیمتشون از قبل توی گالری ثبت شده. اگه طرحی قیمت نداشته باشه، اینجا نمایش داده نمی‌شه؛ چون قیمت‌سازی حدسی به نفع هیچ‌کدوم از ما نیست.</p></div>`;
  write(
    "starter.html",
    HEAD({ title, desc, path: "/starter.html", ld: starterLd }) + body + FOOT,
  );
  urls.push("/starter.html");
  console.log(`✓ صفحه‌ی شروع کم‌خطر (${starter.length} طرح)`);
}
/* ---------- صفحه‌ی حراج بلک‌فرایدی ---------- */
{
  const saleWorks = list
    .filter((w) => !w.noOrder && Number(prices[String(w.id)]) > 0)
    .sort((a, b) => {
      const save = (x) => Number(listPrices[String(x.id)]) - Number(prices[String(x.id)]);
      return save(b) - save(a);
    })
    .slice(0, 9);
  const title = "حراج بلک فرایدی کارا | ۳۰٪ تخفیف دستبند منجوقی دست‌باف";
  const desc = "حراج بلک فرایدی کارا تا ۱۳ آذر: ۳۰٪ تخفیف روی دستبندهای منجوقی دست‌باف. طرح‌های تخفیف‌دار، قیمت شفاف و ارسال به سراسر ایران.";
  const saleLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description: desc,
        url: SITE + "/sale.html",
        inLanguage: "fa-IR",
      },
      {
        "@type": "ItemList",
        itemListElement: saleWorks.map((w, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: SITE + urlOf(w),
          name: `دستبند منجوقی ${titleOf(w)}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "تخفیف بلک فرایدی تا چه زمانی است؟",
            acceptedAnswer: { "@type": "Answer", text: "تخفیف ۳۰٪ تا پایان ۱۳ آذر ۱۴۰۵ فعال است و بعد از آن قیمت‌ها به حالت قبل برمی‌گردند." },
          },
          {
            "@type": "Question",
            name: "قیمت‌های صفحه با درگاه پرداخت یکی است؟",
            acceptedAnswer: { "@type": "Answer", text: "بله. قیمت نمایش‌داده‌شده و مبلغ درگاه از یک منبع مشترک محاسبه می‌شوند." },
          },
          {
            "@type": "Question",
            name: "سفارش چند روزه آماده می‌شود؟",
            acceptedAnswer: { "@type": "Answer", text: "بافت و بسته‌بندی با دست انجام می‌شود و حداکثر تا یک هفته آماده است؛ زمان ارسال هم به پست اضافه می‌شود." },
          },
        ],
      },
      crumbLd([["خانه", "/"], ["حراج بلک فرایدی", "/sale.html"]]),
    ],
  };
  const cards = saleWorks.length
    ? saleWorks.map((w) => `<a class="starter-card" href="${urlOf(w)}"><img src="${esc(abs(w.thumb || w.src))}"${w.thumb240 ? ` srcset="${esc(abs(w.thumb240))} 240w, ${esc(abs(w.thumb480))} 480w, ${esc(abs(w.thumb))} 700w" sizes="(max-width:760px) 90vw, 300px"` : ""} alt="دستبند منجوقی ${esc(titleOf(w))}"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} loading="lazy"><b>${esc(titleOf(w))}</b><span>${priceHTML(w.id, true)}</span><small>${esc((w.note || "").slice(0, 80))}</small></a>`).join("")
    : `<p class="cp__note">فعلاً طرح تخفیف‌داری ثبت نشده. از <a href="/gallery.html">گالری</a> دستبندهای موجود را ببین.</p>`;
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/gallery.html">گالری</a> › حراج بلک فرایدی</div>
<h1>حراج بلک فرایدی کارا</h1>
<p class="cp__lead">تا ۱۳ آذر، روی دستبندهای منجوقی دست‌باف گالری <b>۳۰٪ تخفیف</b> داریم. طرح‌های زیر از تخفیف‌دارترین کارهای گالری انتخاب شده‌اند؛ قیمت خط‌خورده و قیمت نهایی هر دو شفاف نمایش داده می‌شود.</p>
<section class="bf" aria-labelledby="saleBfTitle">
  <div class="bf__in">
    <picture class="bf__gif">
      <source media="(prefers-reduced-motion: reduce)" srcset="/img/black-friday.avif?v=4" type="image/avif" />
      <source srcset="/img/black-friday.webp?v=4" type="image/webp" />
      <img src="/img/black-friday.gif?v=4" width="620" height="412" alt="حراج بلک فرایدی کارا: سی درصد تخفیف" loading="eager" fetchpriority="high" decoding="async" />
    </picture>
    <div class="bf__copy">
      <p class="bf__kicker">🔥 فقط تا ۱۳ آذر</p>
      <h2 id="saleBfTitle">۳۰٪ تخفیف روی همه‌ی دستبندهای گالری</h2>
      <p class="bf__lead"><span data-sale-countdown aria-live="polite"><b>۹</b> روز مونده؛</span> بعد از پایان حراج، قیمت‌ها به حالت قبل برمی‌گردند.</p>
      <a class="bf__cta" href="/gallery.html">دیدن همه‌ی دستبندها</a>
    </div>
  </div>
</section>
<h2>پیشنهادهای تخفیف‌دار</h2>
<div class="starter-grid">${cards}</div>
<h2>سوال‌های پرتکرار حراج</h2>
<div class="cp__faq"><details><summary>تخفیف تا چه زمانی است؟</summary><div><p>تخفیف ۳۰٪ تا پایان ۱۳ آذر فعال است و بعد از آن قیمت‌ها به حالت قبل برمی‌گردند.</p></div></details><details><summary>قیمت صفحه با درگاه یکی است؟</summary><div><p>بله. قیمت نمایش‌داده‌شده و مبلغ درگاه از یک منبع مشترک محاسبه می‌شوند.</p></div></details><details><summary>سفارش چند روزه آماده می‌شود؟</summary><div><p>بافت و بسته‌بندی با دست انجام می‌شود و حداکثر تا یک هفته آماده است؛ زمان ارسال هم به پست اضافه می‌شود.</p></div></details></div>
<div class="cp__note"><p><b>هدیه می‌خوای؟</b> از <a href="/quiz.html">کوییز انتخاب دستبند</a> کمک بگیر یا <a href="/starter.html">دستبندهای شروع کم‌خطر</a> رو ببین. برای سفارش شخصی هم <a href="/builder.html">استودیوی طراحی</a> باز است.</p></div>`;
  write("sale.html", HEAD({ title, desc, path: "/sale.html", image: SITE + "/img/black-friday.avif", ld: saleLd }) + body + FOOT);
  urls.push("/sale.html");
  console.log(`✓ صفحه‌ی حراج بلک فرایدی (${saleWorks.length} طرح)`);
}

/* ---------- JSON-LD گالری: همیشه از داده و قیمت‌گذاری مشترک ساخته می‌شود ---------- */
const galleryLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "گالری دستبندهای منجوقی دست‌باف کارا",
  itemListElement: list.map((w, i) => {
    const title = titleOf(w);
    const imagePaths = (w.images && w.images.length ? w.images : [w.src]).map(
      (src) => SITE + abs(bare(src)),
    );
    const product = {
      "@type": "Product",
      name: `دستبند منجوقی ${title}`,
      description: w.note || title,
      image: imagePaths,
      brand: { "@type": "Brand", name: "cara" },
      url: SITE + urlOf(w),
    };
    const price = Number(prices[String(w.id)]) || 0;
    if (!w.noOrder && price > 0) {
      product.offers = {
        "@type": "Offer",
        priceCurrency: "IRR",
        price: String(price * 10),
        availability: "https://schema.org/MadeToOrder",
        url: SITE + urlOf(w),
      };
    }
    return { "@type": "ListItem", position: i + 1, item: product };
  }),
};
{
  const file = path.join(ROOT, "gallery.html");
  let html = fs.readFileSync(file, "utf8");
  const markerRe =
    /<!-- GALLERY-JSON-LD:START -->[\s\S]*?<!-- GALLERY-JSON-LD:END -->/;
  if (!markerRe.test(html))
    throw new Error("gallery.html is missing GALLERY-JSON-LD markers");
  const block = `<!-- GALLERY-JSON-LD:START -->
    <script type="application/ld+json">\n${JSON.stringify(galleryLd, null, 2)}\n    </script>
    <!-- GALLERY-JSON-LD:END -->`;
  html = html.replace(markerRe, block);
  fs.writeFileSync(file, html);
  console.log("✓ JSON-LD گالری از منبع داده ساخته شد");
}

console.log(`✓ ${list.length} صفحه‌ی دستبند`);

/* ---------- صفحه‌ی رنگ‌ها ---------- */
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const [r, g, b] = rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const dist = (a, b) => {
  const x = rgb(a.hex),
    y = rgb(b.hex);
  return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
};
const tone = (h) => {
  const l = lum(h),
    [r, g, b] = rgb(h),
    sat = Math.max(r, g, b) - Math.min(r, g, b);
  return (
    (l > 0.72 ? "روشن" : l < 0.3 ? "تیره" : "میانه") +
    (sat < 28 ? " و خنثی" : r > b + 30 ? " و گرم" : b > r + 30 ? " و سرد" : "")
  );
};
const cUrl = (p) => `/colors/${p.code}.html`;
const swatchCard = (p) =>
  `<a href="${cUrl(p)}"><i style="background:${p.hex}"></i>${esc(p.name)}<br><small dir="ltr">${p.code}</small></a>`;
for (const p of PAL) {
  const near = PAL.filter((x) => x !== p)
    .sort((a, b) => dist(a, p) - dist(b, p))
    .slice(0, 6);
  const title = `منجوق دلیکا ${p.code} ${p.name} | رنگ و عکس | کارا`;
  const desc = `منجوق دلیکا میوکی کد ${p.code} با رنگ ${p.name} (${p.hex}). عکس واقعی، رنگ‌های نزدیک و طراحی آنلاین دستبند منجوقی با این رنگ.`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        url: SITE + cUrl(p),
        inLanguage: "fa-IR",
      },
      crumbLd([
        ["خانه", "/"],
        ["رنگ منجوق‌ها", "/colors/"],
        [p.name, cUrl(p)],
      ]),
    ],
  };
  const photo = beadFiles[p.code]
    ? `<img src="/img/beads/${esc(beadFiles[p.code])}" alt="منجوق دلیکا ${p.code} ${esc(p.name)}" width="440" height="440" loading="eager" style="max-width:100%;height:auto;border-radius:20px;margin-top:10px">`
    : "";
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/colors/">رنگ منجوق‌ها</a> › ${esc(p.name)}</div>
<h1>منجوق دلیکا میوکی <span dir="ltr">${p.code}</span> · ${esc(p.name)}</h1>
<div class="pg-grid"><div><a class="pg-sw" href="/builder.html?color=${encodeURIComponent(p.code)}" style="background:${p.hex}" aria-label="امتحان کردن رنگ ${esc(p.name)} در استودیو"></a>${photo}</div>
<div><p>این رنگ توی ${fa(PAL.length)} رنگ منجوق‌های دلیکای میوکی cara، با کد <b dir="ltr">${p.code}</b> و اسم «${esc(p.name)}» ثبت شده. رنگ ظاهری‌اش ${tone(p.hex)} و کد رنگ تقریبی‌اش <b dir="ltr">${p.hex}</b> ـه (رنگ واقعی روی مانیتورهای مختلف کمی فرق می‌کنه).</p>
<p>می‌تونی همین رنگ رو توی استودیوی طراحی دستبند برداری و خونه‌به‌خونه الگوت رو بچینی؛ تعداد منجوق هر رنگ و قیمت هم همون موقع حساب می‌شه.</p>
<div class="btns"><a class="btn dark" href="/builder.html?color=${encodeURIComponent(p.code)}">طراحی دستبند با این رنگ</a><a class="btn" href="/upload.html">تبدیل عکس به الگو</a></div></div></div>
<h2>رنگ‌های نزدیک</h2><div class="rel">${near.map(swatchCard).join("")}</div>`;
  write(
    `colors/${p.code}.html`,
    HEAD({
      title,
      desc,
      path: cUrl(p),
      image: beadFiles[p.code]
        ? SITE + `/img/beads/${beadFiles[p.code]}`
        : undefined,
      ld,
    }) +
      body +
      FOOT,
  );
  urls.push(cUrl(p));
}
{
  const title = `رنگ منجوق‌های دلیکا میوکی | ${fa(PAL.length)} رنگ با کد و عکس واقعی | کارا`;
  const desc = `لیست کامل ${fa(PAL.length)} رنگ منجوق دلیکا میوکی با کد رنگ (DB…) و اسم فارسی. روی هر رنگ بزن تا عکس و رنگ‌های نزدیکش رو ببینی.`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: SITE + "/colors/",
    inLanguage: "fa-IR",
  };
  write(
    "colors/index.html",
    HEAD({ title, desc, path: "/colors/", ld }) +
      `<div class="crumb"><a href="/">خانه</a> › رنگ منجوق‌ها</div><h1>رنگ منجوق‌های دلیکا میوکی</h1><p>همه‌ی رنگ‌هایی که دستبندهای cara باهاشون بافته می‌شن، با کد رنگ. روی هر کدوم بزنی عکس و رنگ‌های نزدیکش رو می‌بینی.</p><div class="rel">${PAL.map(swatchCard).join("")}</div>` +
      FOOT,
  );
  console.log(`✓ ${PAL.length} صفحه‌ی رنگ + فهرست`);
}

/* ---------- لینک داخلی توی index و gallery + اسکریپت تماس ---------- */
function inject(file, block) {
  const f = path.join(ROOT, file);
  if (!fs.existsSync(f)) return;
  let h = fs.readFileSync(f, "utf8");
  const crlf = h.includes("\r\n");
  h = h.replace(/\r\n/g, "\n");
  const re = /<!-- SEO-LINKS:START -->[\s\S]*?<!-- SEO-LINKS:END -->\n?/;
  const b = block
    ? `<!-- SEO-LINKS:START -->\n${block}\n<!-- SEO-LINKS:END -->\n`
    : "";
  if (re.test(h)) h = h.replace(re, () => b);
  else if (b) h = h.replace("</main>", () => b + "</main>");
  if (!/js\/contact\.js/.test(h))
    h = h.replace(
      "</body>",
      '<script src="/js/contact.js" defer></script>\n</body>',
    );
  h = h.replace(
    /<script src="\/lib\/works-pricing\.js\?v=4"><\/script><script src="\/js\/sale\.js\?v=4" defer><\/script>\s*/g,
    "",
  );
  if (!/js\/sale\.js/.test(h))
    h = h.replace(
      "<head>",
      '<head>\n<script src="/lib/works-pricing.js?v=4"></script><script src="/js/sale.js?v=5"></script>',
    );
  fs.writeFileSync(f, crlf ? h.replace(/\n/g, "\r\n") : h);
}
const css = `<style>.seo-links{max-width:1000px;margin:40px auto;padding:0 18px;font-size:15px;line-height:2}.seo-links h2{font-size:18px;margin:18px 0 6px}.seo-links a{display:inline-block;margin:0 0 0 14px;text-decoration:underline;text-decoration-color:#b8975a;text-underline-offset:4px}.seo-links h2 a{margin:0}.seo-links summary{cursor:pointer;font-weight:700;font-size:17px;padding:10px 0}</style>`;
const wl = list
  .map((w) => `<a href="${urlOf(w)}">دستبند منجوقی ${esc(titleOf(w))}</a>`)
  .join("");
const cl = PAL.map(
  (p) => `<a href="${cUrl(p)}" dir="rtl">${p.code} ${esc(p.name)}</a>`,
).join("");
inject(
  "gallery.html",
  `${css}<nav class="seo-links" aria-label="صفحه‌ی تک‌تک دستبندها"><h2>صفحه‌ی هر دستبند</h2>${wl}</nav>`,
);
inject(
  "index.html",
  `${css}<nav class="seo-links" aria-label="لینک‌های مفید"><h2>دستبندها</h2><a href="/gallery.html">همه‌ی دستبندهای منجوقی</a><a href="/starter.html">شروع کم‌خطر</a><a href="/name-bracelet.html">دستبند منجوقی اسم</a><h2>راهنما</h2><a href="/size.html">اندازه‌ی مچ</a><a href="/faq.html">سوال‌های پرتکرار</a><a href="/about.html">درباره کارا</a><a href="/blog/">دفتر کارا</a><h2>رنگ‌ها</h2><a href="/colors/">همه‌ی رنگ‌های دلیکای میوکی</a></nav>`,
);
for (const f of [
  "builder.html",
  "upload.html",
  "game.html",
  "checkout.html",
  "name-bracelet.html",
])
  inject(f, null);
console.log("✓ لینک‌های داخلی و contact.js گذاشته شد");

/* ---------- صفحات ثابت وبلاگ ---------- */
urls.push("/blog/", "/blog/wrist-size.html", "/blog/color-meanings.html", "/blog/miyuki-delica.html", "/blog/bracelet-care.html", "/blog/miyuki-vs-chinese.html", "/blog/gift-ideas.html", "/blog/free-patterns.html", "/blog/bead-size-guide.html", "/blog/order-guide.html", "/blog/bracelet-styles.html");
urls.push("/about.html", "/faq.html", "/quiz.html");
urls.push("/category/", "/category/beaded-bracelet.html", "/category/name-bracelet.html", "/category/gift-birthday.html", "/category/gift-valentine.html", "/category/gift-anniversary.html");

/* ---------- sitemap و robots ---------- */
const prio = (u) =>
  u === "/"
    ? "1.0"
    : u.startsWith("/bracelet/") ||
        u === "/name-bracelet.html" ||
        u === "/gallery.html"
      ? "0.8"
      : "0.6";
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><priority>${prio(u)}</priority></url>`).join("\n")}\n</urlset>\n`,
);
write(
  "robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin-reviews.html\nDisallow: /checkout.html\nDisallow: /challenge-admin.html\nDisallow: /track.html\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\nFeed: ${SITE}/feed.xml\n`,
);
console.log(`✓ sitemap.xml (${urls.length} آدرس) و robots.txt`);
