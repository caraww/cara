/* Shared shell for generated bracelet and color landing pages. */
module.exports = function createGeneratedPageLayout({ SITE, FONT, esc }) {
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
<meta property="og:image" content="${esc(o.image || SITE + "/img/og-image.png?v=2")}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${esc(o.image || SITE + "/img/og-image.png?v=2")}">
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
<link rel="stylesheet" href="/css/accessibility.css"><link rel="stylesheet" href="/css/mobile-nav.css"><link rel="stylesheet" href="/css/polish.css?v=2">
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
<a class="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
<header class="top solid"><a href="/" class="logo"><img src="/img/cara-logo.png?v=2" alt="cara" style="height:44px;width:auto;display:block"></a>
<nav aria-label="منوی اصلی"><a href="/builder.html">طراحی دستبند</a><a href="/upload.html">عکس به الگو</a><a href="/gallery.html">گالری</a><a href="/game.html">بازی</a><a class="btn dark sm" href="/checkout.html">سفارش</a><a href="/account.html">حساب کاربری</a></nav></header>
<main class="pg" id="main-content" tabindex="-1">`;
const FOOT = `</main><script src="/js/palette.js?v=34"></script><script src="/js/contact.js" defer></script><script src="/js/mobile-nav.js" defer></script></body></html>`;
  return { HEAD, FOOT };
};
