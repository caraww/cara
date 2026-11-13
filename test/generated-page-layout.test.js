"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const createGeneratedPageLayout = require("../lib/generated-page-layout.js");

const esc = (value) => String(value == null ? "" : value)
  .replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);

test("generated page shell keeps Persian document metadata and escaped SEO values", () => {
  const { HEAD } = createGeneratedPageLayout({
    SITE: "https://caraw.ir",
    FONT: '<link rel="stylesheet" href="/css/fonts.css">',
    esc,
  });

  const html = HEAD({
    title: 'دستبند A & B',
    desc: 'طرح <خاص> و دست‌باف',
    path: "/bracelet/example.html",
    image: "https://caraw.ir/img/example.webp",
    ld: { "@context": "https://schema.org", "@type": "WebPage" },
  });

  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /<title>دستبند A &amp; B<\/title>/);
  assert.match(html, /name="description" content="طرح &lt;خاص&gt; و دست‌باف"/);
  assert.match(html, /rel="canonical" href="https:\/\/caraw\.ir\/bracelet\/example\.html"/);
  assert.match(html, /property="og:image" content="https:\/\/caraw\.ir\/img\/example\.webp"/);
  assert.match(html, /application\/ld\+json/);
});

test("generated page shell preserves accessible main landmark and shared navigation hooks", () => {
  const { HEAD, FOOT } = createGeneratedPageLayout({
    SITE: "https://caraw.ir",
    FONT: "",
    esc,
  });

  const html = HEAD({
    title: "نمونه",
    desc: "توضیح",
    path: "/bracelet/example.html",
    ld: {},
  }) + FOOT;

  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<main class="pg" id="main-content" tabindex="-1">/);
  assert.match(html, /<nav/);
  assert.match(html, /href="\/checkout\.html">سفارش<\/a>/);
  assert.match(html, /\/js\/mobile-nav\.js/);
  assert.match(html, /\/js\/contact\.js/);
  assert.match(html, /\/css\/bracelet-pages\.css\?v=1/);
  assert.match(html, /\/css\/site-nav\.css\?v=20261113/);
  assert.ok(html.indexOf("/css/site-nav.css") > html.indexOf("/css/bracelet-pages.css"));
});
