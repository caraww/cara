#!/usr/bin/env node
/* ساخت صفحه‌های سئو از روی data/works.json و js/palette.js:
     bracelet/<نام>.html   یه صفحه‌ی ثابت برای هر دستبند گالری (Product schema)
     colors/<کد>.html + colors/index.html   یه صفحه برای هر رنگ منجوق
     sitemap.xml , robots.txt
   و لینک‌های داخلی رو بین نشانگرهای SEO-LINKS داخل index.html و gallery.html می‌ذاره (چندبار اجرا کنی تکراری نمی‌شه).
   اجرا (از ریشه‌ی پروژه، بعد از build-works.js):  node tools/build-pages.js */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://caraw.ir";
const { CARA_PALETTE: PAL } = require(path.join(ROOT, "js/palette.js"));
const works = JSON.parse(fs.readFileSync(path.join(ROOT, "data/works.json"), "utf8"));
let beadFiles = {};
try { beadFiles = JSON.parse(fs.readFileSync(path.join(ROOT, "js/beads.js"), "utf8").replace(/^[^{]*/, "").replace(/;\s*$/, "")); } catch {}
const today = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fa = (n) => Number(n).toLocaleString("fa-IR");
const slug = (id) => String(id).trim().replace(/[\s\u200c]+/g, "-").replace(/[\/\\?#%.]+/g, ""); /* باید با gallery.js و home.js یکی باشه */
const abs = (p) => "/" + String(p).replace(/^\/+/, "");
const bare = (p) => String(p).split("?")[0];
const urlOf = (w) => `/bracelet/${encodeURIComponent(slug(w.id))}.html`;
const NUM = /^[\s0-9۰-۹.\-_)]+$/;
const titleOf = (w) => (w.title && !NUM.test(w.title) ? w.title : "");
const write = (rel, txt) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };

/* اگه tools/self-host-fonts.js اجرا شده باشه فونت از خود سایت لود می‌شه */
const FONT = fs.existsSync(path.join(ROOT, "css/fonts.css")) ? '<link rel="stylesheet" href="/css/fonts.css">' : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap">';
const HEAD = (o) => `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" sizes="192x192" href="/img/cara-favicon.png?v=2"><link rel="icon" href="/favicon.ico?v=2" sizes="any">
${FONT}
<link rel="stylesheet" href="/css/studio.css"><link rel="stylesheet" href="/css/decor.css">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#1d1527">
<link rel="canonical" href="${SITE}${o.path}">
<meta property="og:type" content="website"><meta property="og:locale" content="fa_IR"><meta property="og:site_name" content="کارا (cara)">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:url" content="${SITE}${o.path}">
<meta property="og:image" content="${esc(o.image || SITE + "/img/og-image.png?v=2")}"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
<style>
.pg{max-width:980px;margin:auto;padding:100px 18px 40px}.crumb{font-size:14px;color:var(--muted);margin-bottom:10px}.crumb a{text-decoration:underline}
.pg h1{font-size:clamp(26px,4vw,40px);line-height:1.3;margin:0 0 14px;font-weight:900}
.pg-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start}
.pg-img img{width:100%;height:auto;border-radius:20px;background:#ece6f2;display:block}.pg-thumbs{display:flex;gap:8px;margin-top:8px}.pg-thumbs img{width:76px;border-radius:10px}
.pg-price{font-size:26px;font-weight:900;margin:10px 0}.pg .tags{margin:10px 0 16px}
.pg-sw{width:100%;aspect-ratio:1.4;border-radius:22px;box-shadow:inset 0 3px rgba(255,255,255,.5),inset 0 -6px 10px rgba(0,0,0,.22)}
.rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:14px}.rel a{display:block;text-align:center;font-size:15px;font-weight:700}
.rel img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;background:#ece6f2;display:block;margin-bottom:4px}.rel i{display:block;aspect-ratio:1.4;border-radius:12px;margin-bottom:4px}
.pg h2{font-size:22px;margin:34px 0 4px}.pg p{margin:0 0 12px}
@media(max-width:760px){.pg-grid{grid-template-columns:1fr}}
</style></head><body>
<header class="top solid"><a href="/" class="logo"><img src="/img/cara-logo.png?v=2" alt="cara" style="height:44px;width:auto;display:block"></a>
<nav><a href="/builder.html">طراحی دستی</a><a href="/upload.html">عکس به الگو</a><a href="/gallery.html">گالری</a><a href="/game.html">بازی</a><a class="btn dark sm" href="/checkout.html">سفارش</a></nav></header>
<main class="pg">`;
const FOOT = `</main><script src="/js/palette.js?v=34"></script><script src="/js/contact.js" defer></script></body></html>`;
const crumbLd = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + p })) });

/* ---------- صفحه‌ی هر دستبند ---------- */
const urls = ["/", "/builder.html", "/upload.html", "/gallery.html", "/game.html", "/name-bracelet.html", "/colors/"];
const list = works.filter((w) => titleOf(w));
for (const w of list) {
  const t = titleOf(w), imgs = (w.images && w.images.length ? w.images : [w.src]).map((s) => SITE + abs(bare(s)));
  const orderable = !w.noOrder && Number(w.price) > 0;
  const rel = list.filter((x) => x !== w && (x.tags || []).some((g) => (w.tags || []).includes(g))).concat(list.filter((x) => x !== w)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
  const title = `دستبند منجوقی ${t} | دست‌باف، سفارش آنلاین | کارا`;
  const desc = `${(w.note || "").slice(0, 120)} دستبند منجوقی ${t} با منجوق دلیکای میوکی، دست‌باف و آماده‌ی ارسال تا یک هفته.`.trim();
  const product = { "@type": "Product", name: `دستبند منجوقی ${t}`, description: w.note || t, image: imgs, brand: { "@type": "Brand", name: "cara" }, url: SITE + urlOf(w) };
  if (orderable) product.offers = { "@type": "Offer", priceCurrency: "IRR", price: String(Number(w.price) * 10), availability: "https://schema.org/MadeToOrder", url: SITE + urlOf(w), seller: { "@type": "Organization", name: "cara" } };
  const ld = { "@context": "https://schema.org", "@graph": [product, crumbLd([["خانه", "/"], ["گالری", "/gallery.html"], [t, urlOf(w)]])] };
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/gallery.html">گالری</a> › ${esc(t)}</div>
<h1>دستبند منجوقی ${esc(t)}</h1>
<div class="pg-grid"><div class="pg-img"><img src="${esc(abs(w.src))}" alt="دستبند منجوقی ${esc(t)} دست‌باف"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} fetchpriority="high">
${w.images && w.images.length > 1 ? `<div class="pg-thumbs">${w.images.slice(1).map((s) => `<img src="${esc(abs(s))}" alt="دستبند منجوقی ${esc(t)}، عکس دیگر" loading="lazy">`).join("")}</div>` : ""}</div>
<div><p>${esc(w.note || "")}</p>
${(w.tags || []).length ? `<div class="tags">${w.tags.map((g) => `<span>${esc(g)}</span>`).join("")}</div>` : ""}
${orderable ? `<div class="pg-price">${fa(w.price)} تومان</div><div class="btns"><a class="btn dark" href="/checkout.html?work=${encodeURIComponent(w.id)}">سفارش این دستبند</a><a class="btn" href="/upload.html?src=${encodeURIComponent(w.src)}">از روی این عکس الگو بساز</a></div>`
 : `<div class="btns"><a class="btn dark" href="/upload.html">عکس خودت رو به الگو تبدیل کن</a><a class="btn" href="/builder.html">طراحی دستی</a></div>`}
<p style="margin-top:16px;color:var(--muted);font-size:16px">دست‌باف با منجوق دلیکای میوکی ژاپنی. حداکثر تا یک هفته بعد از سفارش آماده و برات پست می‌شه. می‌تونی همین طرح رو توی <a href="/builder.html" style="text-decoration:underline">استودیو</a> عوض کنی یا طرح خودت رو بسازی.</p></div></div>
<h2>دستبندهای دیگه</h2><div class="rel">${rel.map((x) => `<a href="${urlOf(x)}"><img src="${esc(abs(x.thumb || x.src))}" alt="دستبند منجوقی ${esc(titleOf(x))}" loading="lazy">${esc(titleOf(x))}</a>`).join("")}</div>`;
  write(`bracelet/${slug(w.id)}.html`, HEAD({ title, desc, path: urlOf(w), image: imgs[0], ld }) + body + FOOT);
  urls.push(urlOf(w));
}
console.log(`✓ ${list.length} صفحه‌ی دستبند`);

/* ---------- صفحه‌ی رنگ‌ها ---------- */
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const dist = (a, b) => { const x = rgb(a.hex), y = rgb(b.hex); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
const tone = (h) => { const l = lum(h), [r, g, b] = rgb(h), sat = Math.max(r, g, b) - Math.min(r, g, b); return (l > 0.72 ? "روشن" : l < 0.3 ? "تیره" : "میانه") + (sat < 28 ? " و خنثی" : r > b + 30 ? " و گرم" : b > r + 30 ? " و سرد" : ""); };
const cUrl = (p) => `/colors/${p.code}.html`;
const swatchCard = (p) => `<a href="${cUrl(p)}"><i style="background:${p.hex}"></i>${esc(p.name)}<br><small dir="ltr">${p.code}</small></a>`;
for (const p of PAL) {
  const near = PAL.filter((x) => x !== p).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 6);
  const title = `منجوق دلیکا میوکی ${p.code} ${p.name} | کد رنگ و عکس واقعی | کارا`;
  const desc = `منجوق دلیکا میوکی کد ${p.code} با رنگ ${p.name} (${p.hex}). عکس واقعی، رنگ‌های نزدیک و طراحی آنلاین دستبند منجوقی با این رنگ.`;
  const ld = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: title, url: SITE + cUrl(p), inLanguage: "fa-IR" }, crumbLd([["خانه", "/"], ["رنگ منجوق‌ها", "/colors/"], [p.name, cUrl(p)]])] };
  const photo = beadFiles[p.code] ? `<img src="/img/beads/${esc(beadFiles[p.code])}" alt="منجوق دلیکا ${p.code} ${esc(p.name)}" width="480" loading="eager" style="max-width:100%;height:auto;border-radius:20px;margin-top:10px">` : "";
  const body = `<div class="crumb"><a href="/">خانه</a> › <a href="/colors/">رنگ منجوق‌ها</a> › ${esc(p.name)}</div>
<h1>منجوق دلیکا میوکی <span dir="ltr">${p.code}</span> · ${esc(p.name)}</h1>
<div class="pg-grid"><div><div class="pg-sw" style="background:${p.hex}"></div>${photo}</div>
<div><p>این رنگ توی ${fa(PAL.length)} رنگ منجوق‌های دلیکای میوکی cara، با کد <b dir="ltr">${p.code}</b> و اسم «${esc(p.name)}» ثبت شده. رنگ ظاهری‌اش ${tone(p.hex)} و کد رنگ تقریبی‌اش <b dir="ltr">${p.hex}</b> ـه (رنگ واقعی روی مانیتورهای مختلف کمی فرق می‌کنه).</p>
<p>می‌تونی همین رنگ رو توی استودیوی طراحی دستبند برداری و خونه‌به‌خونه الگوت رو بچینی؛ تعداد منجوق هر رنگ و قیمت هم همون موقع حساب می‌شه.</p>
<div class="btns"><a class="btn dark" href="/builder.html">طراحی دستبند با این رنگ</a><a class="btn" href="/upload.html">تبدیل عکس به الگو</a></div></div></div>
<h2>رنگ‌های نزدیک</h2><div class="rel">${near.map(swatchCard).join("")}</div>`;
  write(`colors/${p.code}.html`, HEAD({ title, desc, path: cUrl(p), ld }) + body + FOOT);
  urls.push(cUrl(p));
}
{
  const title = `رنگ منجوق‌های دلیکا میوکی | ${fa(PAL.length)} رنگ با کد و عکس واقعی | کارا`;
  const desc = `لیست کامل ${fa(PAL.length)} رنگ منجوق دلیکا میوکی با کد رنگ (DB…) و اسم فارسی. روی هر رنگ بزن تا عکس و رنگ‌های نزدیکش رو ببینی.`;
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: SITE + "/colors/", inLanguage: "fa-IR" };
  write("colors/index.html", HEAD({ title, desc, path: "/colors/", ld }) + `<div class="crumb"><a href="/">خانه</a> › رنگ منجوق‌ها</div><h1>رنگ منجوق‌های دلیکا میوکی</h1><p>همه‌ی رنگ‌هایی که دستبندهای cara باهاشون بافته می‌شن، با کد رنگ. روی هر کدوم بزنی عکس و رنگ‌های نزدیکش رو می‌بینی.</p><div class="rel">${PAL.map(swatchCard).join("")}</div>` + FOOT);
  console.log(`✓ ${PAL.length} صفحه‌ی رنگ + فهرست`);
}

/* ---------- لینک داخلی توی index و gallery + اسکریپت تماس ---------- */
function inject(file, block) {
  const f = path.join(ROOT, file); if (!fs.existsSync(f)) return;
  let h = fs.readFileSync(f, "utf8"); const crlf = h.includes("\r\n"); h = h.replace(/\r\n/g, "\n");
  const re = /<!-- SEO-LINKS:START -->[\s\S]*?<!-- SEO-LINKS:END -->\n?/;
  const b = block ? `<!-- SEO-LINKS:START -->\n${block}\n<!-- SEO-LINKS:END -->\n` : "";
  if (re.test(h)) h = h.replace(re, () => b); else if (b) h = h.replace("</main>", () => b + "</main>");
  if (!/js\/contact\.js/.test(h)) h = h.replace("</body>", '<script src="/js/contact.js" defer></script>\n</body>');
  fs.writeFileSync(f, crlf ? h.replace(/\n/g, "\r\n") : h);
}
const css = `<style>.seo-links{max-width:1000px;margin:40px auto;padding:0 18px;font-size:15px;line-height:2}.seo-links h2{font-size:18px;margin:18px 0 6px}.seo-links a{display:inline-block;margin:0 0 0 14px;text-decoration:underline;text-decoration-color:#b8975a;text-underline-offset:4px}</style>`;
const wl = list.map((w) => `<a href="${urlOf(w)}">دستبند منجوقی ${esc(titleOf(w))}</a>`).join("");
const cl = PAL.map((p) => `<a href="${cUrl(p)}" dir="rtl">${p.code} ${esc(p.name)}</a>`).join("");
inject("gallery.html", `${css}<nav class="seo-links" aria-label="صفحه‌ی تک‌تک دستبندها"><h2>صفحه‌ی هر دستبند</h2>${wl}</nav>`);
inject("index.html", `${css}<nav class="seo-links" aria-label="لینک‌های مفید"><h2>دستبندها</h2>${wl}<h2>رنگ منجوق‌ها (<a href="/colors/">همه</a>)</h2>${cl}<h2>بیشتر</h2><a href="/name-bracelet.html">دستبند منجوقی اسم</a><a href="/upload.html">تبدیل عکس به الگوی منجوق‌کاری</a><a href="/game.html">بازی و کد تخفیف</a></nav>`);
for (const f of ["builder.html", "upload.html", "game.html", "checkout.html", "name-bracelet.html"]) inject(f, null);
console.log("✓ لینک‌های داخلی و contact.js گذاشته شد");

/* ---------- sitemap و robots ---------- */
const prio = (u) => (u === "/" ? "1.0" : u.startsWith("/bracelet/") || u === "/name-bracelet.html" || u === "/gallery.html" ? "0.8" : "0.6");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><priority>${prio(u)}</priority></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /checkout.html\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`✓ sitemap.xml (${urls.length} آدرس) و robots.txt`);
