const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared cara visual system is loaded after page styles on primary pages", () => {
  for (const file of [
    "index.html",
    "builder.html",
    "upload.html",
    "gallery.html",
    "checkout.html",
    "account.html",
    "game.html",
    "name-bracelet.html",
    "admin.html",
    "customers.html",
  ]) {
    const html = read(file);
    assert.match(html, /\/css\/polish\.css\?v=2/, file + " should load polish.css");
    assert.ok(
      html.indexOf("/css/polish.css?v=3") > html.lastIndexOf('rel="stylesheet"'),
      file + " should load the shared layer after its page styles",
    );
  }
});

test("generated bracelet and color pages share the same navigation and visual system", () => {
  const layout = read("lib/generated-page-layout.js");
  assert.match(layout, /\/css\/polish\.css\?v=2/);
  assert.match(layout, /href="\/account\.html">حساب کاربری/);
  assert.match(layout, /href="\/builder\.html">طراحی دستبند/);
});

test("navigation places account first and the designer CTA at the opposite edge", () => {
  const css = read("css/polish.css");
  assert.match(css, /a\[href\*="account\.html"\]\s*\{\s*order:0;/);
  assert.match(css, /a:not\(\[href\*="account\.html"\]\):not\(\[href\*="builder\.html"\]\)\s*\{\s*order:10;/);
  assert.match(css, /a\[href\*="builder\.html"\]\s*\{\s*order:20;/);
});


test("shared header rules do not target admin order-card .top elements", () => {
  const css = read("css/polish.css");
  assert.ok(css.includes("header.top {"));
  assert.equal(css.includes("\n.top {"), false);
});


test("mobile navigation is anchored to the physical left and overlays without a spacer", () => {
  const css = read("css/mobile-nav.css");
  const js = read("js/mobile-nav.js");
  assert.match(css, /left:\s*14px/);
  assert.match(css, /right:\s*auto/);
  assert.match(css, /left:\s*12px\s*!important/);
  assert.match(css, /display:\s*none\s*!important/);
  assert.match(js, /menu-open/);
  assert.doesNotMatch(js, /syncSpacer|spacer\.style\.height|header\.after\(spacer\)/);
});

test("mobile navigation remains accessible and closes on escape or link selection", () => {
  const js = read("js/mobile-nav.js");
  assert.match(js, /aria-expanded/);
  assert.match(js, /aria-controls/);
  assert.match(js, /event\.key === "Escape"/);
  assert.match(js, /nav\.addEventListener\("click"/);
});
