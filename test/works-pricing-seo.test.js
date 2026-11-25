const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
require(path.join(root, "lib/works-pricing.js"));
const { priceMap, baseMap, sale } = globalThis.CARA_WORK_PRICING;
const works = JSON.parse(fs.readFileSync(path.join(root, "data/works.json"), "utf8"));
const vm = require("node:vm");
const browserContext = { window: { CARA: {} } };
vm.runInNewContext(fs.readFileSync(path.join(root, "js/works.js"), "utf8"), browserContext);
const browserWorks = JSON.parse(JSON.stringify(browserContext.window.CARA.works));
const prices = priceMap(works); /* قیمت روز: توی بازه‌ی حراج با ۳۰٪ تخفیف */
const listPrices = baseMap(works); /* قیمت بدون تخفیف */

test("Worker and static SEO builder use the same shared pricing module", () => {
  const worker = fs.readFileSync(path.join(root, "index.js"), "utf8");
  const builder = fs.readFileSync(path.join(root, "tools/build-pages.js"), "utf8");
  assert.match(worker, /import ["']\.\/lib\/works-pricing\.js["']/);
  assert.match(worker, /globalThis\.CARA_WORK_PRICING\.priceMap/);
  assert.match(builder, /require\(path\.join\(ROOT, ["']lib\/works-pricing\.js["']\)\)/);
  assert.match(builder, /globalThis\.CARA_WORK_PRICING\.priceMap\(works\)/);
  assert.doesNotMatch(worker, /function autoPrice\(/);
});

test("shared pricing preserves the current fixed, auto, and noOrder rules", () => {
  assert.equal(listPrices["خطر"], 900000);
  assert.equal(listPrices["ریک اند مورتی"], 4000000);
  assert.equal(listPrices["آلبوم"], undefined);
  assert.equal(listPrices["اردک تک تک"], 2127000);
  assert.equal(listPrices["اردک تک تک"], baseMap(works)["اردک تک تک"]);
  assert.deepEqual(priceMap(browserWorks), prices, "Worker browser catalog and SEO source catalog must resolve identical prices");
  assert.equal(Object.keys(prices).length, works.filter((w) => !w.noOrder).length);
});

test("حراج بلک فرایدی: ۳۰٪ تخفیف از ۳۰ آبان تا پایان ۱۳ آذر", () => {
  const at = (iso) => Date.parse(iso);
  assert.equal(sale.active(at("2026-11-20T23:59:00+03:30")), false, "قبل از ۳۰ آبان تخفیف نداریم");
  assert.equal(sale.active(at("2026-11-21T00:00:00+03:30")), true, "۳۰ آبان شروع حراج");
  assert.equal(sale.active(at("2026-12-04T23:59:00+03:30")), true, "آخرین ساعت ۱۳ آذر هنوز حراج است");
  assert.equal(sale.active(at("2026-12-05T00:00:00+03:30")), false, "بعد از ۱۳ آذر قیمت‌ها برمی‌گرده");

  assert.equal(sale.final(2200000, at("2026-11-25T12:00:00+03:30")), 1540000);
  assert.equal(sale.final(2200000, at("2026-12-10T12:00:00+03:30")), 2200000);
  assert.equal(sale.final(0), 0);
  assert.equal(sale.info(at("2026-11-25T12:00:00+03:30")).active, true);
  assert.equal(sale.info(at("2026-12-10T12:00:00+03:30")).active, false);

  /* قیمت روز همون ۷۰٪ قیمت پایه‌ست و از قیمت پایه بیشتر نمی‌شه */
  for (const id of Object.keys(listPrices)) {
    assert.ok(prices[id] <= listPrices[id], id + " نباید گرون‌تر از قیمت پایه بشه");
    assert.ok(prices[id] >= Math.round(listPrices[id] * 0.7) - 1000, id + " تخفیفش کمتر از ۳۰٪ نشه");
  }
});

test("build-pages generates gallery JSON-LD and bracelet pages from the same catalog and prices", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cara-seo-pricing-"));
  try {
    for (const dir of ["tools", "lib", "data", "js", "css"]) fs.mkdirSync(path.join(temp, dir), { recursive: true });
    for (const file of ["tools/build-pages.js", "lib/works-pricing.js", "lib/generated-page-layout.js", "data/works.json", "js/palette.js", "js/beads.js"]) {
      fs.copyFileSync(path.join(root, file), path.join(temp, file));
    }
    for (const file of ["index.html", "builder.html", "upload.html", "game.html", "checkout.html", "name-bracelet.html"]) {
      fs.writeFileSync(path.join(temp, file), "<!doctype html><html><body><main></main></body></html>");
    }
    fs.writeFileSync(path.join(temp, "gallery.html"),
      "<!doctype html><html><head><!-- GALLERY-JSON-LD:START --><!-- GALLERY-JSON-LD:END --></head><body><main></main></body></html>");
    const run = spawnSync(process.execPath, ["tools/build-pages.js"], { cwd: temp, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);

    const colorPage = fs.readFileSync(path.join(temp, "colors", "DB0010.html"), "utf8");
    assert.match(colorPage, /property="og:image" content="https:\/\/caraw\.ir\/img\/beads\/DB0010\.jpg"/);
    assert.match(colorPage, /name="twitter:title"/);
    assert.match(colorPage, /name="twitter:description"/);
    assert.match(colorPage, /name="twitter:image" content="https:\/\/caraw\.ir\/img\/beads\/DB0010\.jpg"/);

    const braceletPage = fs.readFileSync(path.join(temp, "bracelet", "آلبوم.html"), "utf8");
    for (const page of [colorPage, braceletPage]) {
      assert.match(page, /<a class="skip-link" href="#main-content">رفتن به محتوای اصلی<\/a>/);
      assert.match(page, /<header class="sh is-solid"/);
      assert.match(page, /href="\/builder\.html">طراحی دستبند<\/a>/);
      assert.match(page, /href="\/checkout\.html">سفارش<\/a>/);
      assert.match(page, /href="\/account\.html">حساب کاربری<\/a>/);
      assert.match(page, /<script src="\/js\/contact\.js\?v=[\w.-]+" defer><\/script>/);
      assert.match(page, /\/css\/site-nav\.css\?v=20261113/);
      assert.match(page, /\/css\/bracelet-pages\.css\?v=9/);
      assert.match(page, /\/css\/polish\.css\?v=[\w.-]+/);
      assert.match(page, /\/js\/nav-hero\.js\?v=1/);
      assert.match(page, /<main class="pg" id="main-content" tabindex="-1">/);
    }

    const gallery = fs.readFileSync(path.join(temp, "gallery.html"), "utf8");
    const match = gallery.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(match, "gallery must contain generated JSON-LD");
    const schema = JSON.parse(match[1]);
    const products = schema.itemListElement.map((entry) => entry.item);
    assert.equal(products.length, works.filter((w) => w.title && !/^[\s0-9۰-۹.\-_)]+$/.test(w.title)).length);

    const album = products.find((p) => p.name === "دستبند منجوقی آلبوم");
    assert.ok(album);
    assert.equal(album.offers, undefined, "Album remains a sample and has no Offer");

    const danger = products.find((p) => p.name === "دستبند منجوقی خطر");
    assert.equal(danger.description, works.find((w) => w.id === "خطر").note);
    assert.equal(danger.offers.price, String(prices["خطر"] * 10));

    const duck = products.find((p) => p.name === "دستبند منجوقی اردک تک تک");
    assert.equal(duck.offers.price, String(prices["اردک تک تک"] * 10));

    for (const file of fs.readdirSync(path.join(temp, "bracelet"))) {
      const page = fs.readFileSync(path.join(temp, "bracelet", file), "utf8");
      const titleMatch = page.match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(titleMatch, file + " must have a title");
      assert.ok([...titleMatch[1]].length <= 60, file + " title must be at most 60 characters");
    }

    const albumPage = fs.readFileSync(path.join(temp, "bracelet", "آلبوم.html"), "utf8");
    assert.ok(!albumPage.includes("سفارش این دستبند"));
    assert.ok(!albumPage.includes("checkout.html?work="));
    assert.ok(albumPage.includes("<title>نمونه دستبند منجوقی آلبوم | کارا</title>"));
    const duckPage = fs.readFileSync(path.join(temp, "bracelet", "اردک-تک-تک.html"), "utf8");
    assert.ok(duckPage.includes("سفارش این دستبند"));
    /* در حراج مبلغ قبلی خط می‌خورد و مبلغ کم‌شده قرمز و بزرگ‌تر جایش می‌نشیند. */
    assert.ok(duckPage.includes('data-price="1489000" data-price-list="2127000"'));
    assert.ok(duckPage.includes('<s class="price-list">۲٬۱۲۷٬۰۰۰</s>'));
    assert.ok(duckPage.includes('<b class="price-now">۱٬۴۸۹٬۰۰۰ تومان</b>'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
