const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage uses the hx hero with the photo stage and the shared header", () => {
  const html = read("index.html");
  const css = read("css/nav-hero.css");
  assert.match(html, /<section class="hx"/);
  assert.match(html, /class="hx__copy"/);
  assert.match(html, /class="hx__stage"/);
  assert.match(html, /id="heroStage"/);
  assert.match(html, /nav-hero\.css\?v=[\w.-]+/);
  assert.match(html, /nav-hero\.js\?v=1/);
  assert.match(css, /\.hx__in/);
  assert.match(css, /\.hx__copy/);
  assert.match(css, /\.hx__stage/);
  assert.match(css, /prefers-reduced-motion/);
});

test("hero stage shows three named bracelets with real photos and keyboard controls", () => {
  const html = read("index.html");
  const heroStart = html.indexOf('<section class="hx"');
  const heroEnd = html.indexOf("<!-- SALE:START -->", heroStart);
  assert.ok(heroStart >= 0 && heroEnd > heroStart, "current hero section exists");
  const hero = html.slice(heroStart, heroEnd);

  const cards = [...hero.matchAll(/<figure class="hx__card[^"]*">([\s\S]*?)<\/figure>/g)];
  assert.equal(cards.length, 3, "hero shows three bracelet cards");
  for (const [, card] of cards) {
    assert.match(card, /<img\b/);
    assert.match(card, /alt="دستبند منجوقی/);
    assert.match(card, /width="\d+" height="\d+"/);
    assert.match(card, /<figcaption>[^<]+<small>/);
  }
  for (const name of ["آبشار رنگی", "هزارچشم", "زنجیر"]) assert.ok(hero.includes(name), name);
  assert.equal((hero.match(/loading="lazy"/g) || []).length, 2, "only the first photo loads eagerly");
  assert.match(hero, /fetchpriority="high"/);
  assert.match(hero, /aria-label="دستبند قبلی"/);
  assert.match(hero, /aria-label="دستبند بعدی"/);
  assert.match(hero, /aria-label="نمونه‌ی دستبندهای دست‌باف کارا"/);
  assert.equal((hero.match(/<button\s+class="hx__dot/g) || []).length, 3);
});

test("legacy cn and hero2 markup is not required by the current homepage", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /class="hero hero2"/);
  assert.doesNotMatch(html, /class="cn-header"/);
  assert.doesNotMatch(html, /cara-bracelet-lineup/);
  assert.match(html, /class="sh"/);
  assert.match(html, /class="sh__toggle"/);
});
