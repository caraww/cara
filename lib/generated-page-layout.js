/* Shared shell for generated bracelet and color landing pages. */
let footerHTML = () => "";
try { ({ footerHTML } = require("./site-footer.js")); } catch {}
module.exports = function createGeneratedPageLayout({ SITE, FONT, esc }) {
const HEAD = (o) => `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<script src="/lib/works-pricing.js?v=4"></script><script src="/js/sale.js?v=4"></script>
<script>try{var t=localStorage.getItem("cara-theme")||"auto",d=t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.setAttribute("data-theme",d?"dark":"light");e.setAttribute("data-theme-mode",t)}catch(n){}</script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" sizes="192x192" href="/img/cara-favicon.png?v=2"><link rel="icon" href="/favicon.ico?v=2" sizes="any">
${FONT}
<link rel="stylesheet" href="/css/studio.css?v=20261121-pass6"><link rel="stylesheet" href="/css/decor.css">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#343B64">
<link rel="canonical" href="${SITE}${o.path}">
<meta property="og:type" content="website"><meta property="og:locale" content="fa_IR"><meta property="og:site_name" content="کارا (cara)">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:url" content="${SITE}${o.path}">
<meta property="og:image" content="${esc(o.image || SITE + "/img/og-image.png?v=2")}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${esc(o.image || SITE + "/img/og-image.png?v=2")}">
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
<link rel="stylesheet" href="/css/reviews.css?v=1"><link rel="stylesheet" href="/css/accessibility.css"><link rel="stylesheet" href="/css/polish.css?v=20261124-perf"><link rel="stylesheet" href="/css/bracelet-pages.css?v=6"><link rel="stylesheet" href="/css/site-nav.css?v=20261113"><link rel="stylesheet" href="/css/nav-hero.css?v=20261121-pass10"><link rel="stylesheet" href="/css/premium.css?v=2"><link rel="stylesheet" href="/css/trust.css?v=2"><link rel="stylesheet" href="/css/site-footer.css?v=20261125-enamad"><link rel="stylesheet" href="/css/recovery.css?v=2">
<style>
.pg{max-width:980px;margin:auto;padding:100px 18px 40px}.crumb{font-size:14px;color:var(--muted);margin-bottom:10px}.crumb a{text-decoration:underline}
.pg h1{font-size:clamp(26px,4vw,40px);line-height:1.3;margin:0 0 14px;font-weight:900}
.pg-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start}
.pg-img img{width:100%;height:auto;border-radius:20px;background:#ece6f2;display:block}.pg-thumbs{display:flex;gap:8px;margin-top:8px}.pg-thumbs img{width:76px;border-radius:10px}
.pg-price{font-size:26px;font-weight:900;margin:10px 0}.pg .tags{margin:10px 0 16px}
.pg-sw{width:100%;aspect-ratio:1.4;border-radius:22px;box-shadow:inset 0 3px rgba(255,255,255,.5),inset 0 -6px 10px rgba(0,0,0,.22)}
.rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:14px}.rel a{display:block;text-align:center;font-size:15px;font-weight:700}
.rel img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;background:#ece6f2;display:block;margin-bottom:4px}.rel i{display:block;aspect-ratio:1.4;border-radius:12px;margin-bottom:4px}
.pg h2{font-size:22px;margin:34px 0 4px}.pg p{margin:0 0 12px}.pg-view-toggle{display:flex;gap:8px;margin:10px 0 4px}.pg-view-toggle button{flex:1;padding:9px 10px;border:1px solid var(--line,#d8cfdf);border-radius:12px;background:var(--panel,#fff);color:var(--ink,#4e3b60);font:inherit;font-size:14px;font-weight:700;cursor:pointer}.pg-view-toggle button.is-on{border-color:#b8975a;background:rgba(184,151,90,.16)}.pg-view-note{color:var(--muted);font-size:13px;line-height:1.9}.pg-help{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:12px;font-size:14px}.pg-help a{text-decoration:underline;text-underline-offset:3px}.pg-help span{color:#b9afc5}.cp__lead{color:#5b5368;font-size:18px;line-height:2}.cp__note{padding:16px 18px;border-inline-start:3px solid #b8975a;border-radius:0 16px 16px 0;background:rgba(184,151,90,.09)}.starter-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin:20px 0}.starter-card{display:grid;gap:5px;padding:12px;border:1px solid rgba(184,151,90,.24);border-radius:18px;background:var(--panel,#fff);color:var(--ink,#2d2440);text-decoration:none}.starter-card:hover{box-shadow:0 12px 30px rgba(42,28,60,.12)}.starter-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;background:#ece6f2}.starter-card b{font-size:16px}.starter-card span{color:#7b5a24;font-weight:800}.starter-card small{color:#6c6478;font-size:13px;line-height:1.8}
@media(max-width:760px){.pg-grid{grid-template-columns:1fr}}
</style><link rel="stylesheet" href="/css/theme.css?v=20261121-pass8"><script src="/js/theme.js?v=1" defer></script></head><body>
<a class="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
<header class="sh is-solid" data-sh="solid">
<div class="sh__in">
<a href="/" class="sh__logo" aria-label="cara، صفحه‌ی اصلی"><img class="is-dark" src="/img/cara-logo.webp?v=1" alt="cara"></a>
<button class="sh__toggle" type="button" aria-controls="shNav" aria-expanded="false" aria-label="باز کردن منو"><span aria-hidden="true">☰</span></button>
<nav class="sh__nav" id="shNav" aria-label="منوی اصلی"><a href="/builder.html">طراحی دستبند</a><a href="/upload.html">عکس به الگو</a><a href="/gallery.html">گالری</a><a href="/challenge.html">چالش</a><a href="/game.html">بازی</a><a href="/account.html">حساب کاربری</a><a href="/cart.html">سبد خرید</a><a href="/about.html">درباره کارا</a><a class="sh__cta" href="/checkout.html">سفارش</a></nav>
</div>
</header>
<main class="pg" id="main-content" tabindex="-1">`;
const FOOT = `</main>${footerHTML()}<script src="/js/palette.js?v=36"></script><script src="/js/reviews.js?v=1" defer></script><script src="/js/work-share.js?v=1" defer></script><script src="/js/product-preview.js?v=1" defer></script><script src="/js/analytics.js?v=1" defer></script><script src="/js/contact.js?v=20261124-perf" defer></script><script src="/js/nav-hero.js?v=1" defer></script><script src="/js/recovery.js?v=1" defer></script></body></html>`;
  return { HEAD, FOOT };
};
