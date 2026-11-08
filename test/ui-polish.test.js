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
    assert.match(html, /\/css\/polish\.css\?v=1/, file + " should load polish.css");
    assert.ok(
      html.indexOf("/css/polish.css?v=1") > html.lastIndexOf('rel="stylesheet"'),
      file + " should load the shared layer after its page styles",
    );
  }
});

test("generated bracelet and color pages share the same navigation and visual system", () => {
  const layout = read("lib/generated-page-layout.js");
  assert.match(layout, /\/css\/polish\.css\?v=1/);
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
  assert.match(css, /header\\.top\\s*\\{/);
  assert.doesNotMatch(css, /(^|[},\\s])\\.top\\s*\\{/m);
});
