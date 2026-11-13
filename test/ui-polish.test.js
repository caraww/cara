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
    assert.ok(html.includes("/css/polish.css?v=7"), file + " should load polish.css");
    const polishPath = "/css/polish.css?v=7";
    const sharedLayerIndex = html.indexOf(polishPath);
    const pageStyles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+>/g)]
      .filter(([tag]) => !tag.includes("polish.css") && !tag.includes("hero-signature.css") && !tag.includes("cn-top.css") && !tag.includes("hero-wow.css") && !tag.includes("site-nav.css"))
      .map(([tag]) => html.indexOf(tag));
    assert.ok(
      sharedLayerIndex > Math.max(-1, ...pageStyles),
      file + " should load the shared layer after its page styles",
    );
  }
});

test("generated bracelet and color pages share the same navigation and visual system", () => {
  const layout = read("lib/generated-page-layout.js");
  assert.ok(layout.includes("/css/accessibility.css"));
  assert.ok(layout.includes("/css/site-nav.css?v=20261113"));
  assert.ok(layout.includes("/css/bracelet-pages.css?v=1"));
  assert.ok(layout.includes("/css/polish.css?v=7"));
  assert.ok(layout.includes("/js/contact.js?v=20261112-release"));
  assert.ok(layout.includes("/js/mobile-nav.js?v=20261111-release"));
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


test("Gallery mobile menu stays compact and fully opaque", () => {
  const css = read("css/polish.css");
  assert.match(css, /width:min\(196px,calc\(100vw - 24px\)\) !important;/);
  assert.doesNotMatch(css, /width:min\(238px,calc\(100vw - 24px\)\) !important;/, "narrow phones must not override the 196px menu cap");
  const finalMenu = css.slice(css.lastIndexOf("/* Final mobile menu surface:"));
  assert.match(finalMenu, /background:#fffdfb !important;/);
  assert.match(finalMenu, /backdrop-filter:none !important;/);
  assert.match(finalMenu, /max-height:min\(44vh,320px\) !important;/);
});


test("shared navigation has explicit contrast for transparent and solid headers", () => {
  const css = read("css/polish.css");
  assert.match(css, /header\.top:not\(\.solid\) nav a:not\(\.btn\):not\(\.cta\)\s*\{\s*color:#F1EFF7;/);
  assert.match(css, /header\.top\.solid nav a:not\(\.btn\):not\(\.cta\)\s*\{\s*color:var\(--cara-text\);/);
  assert.match(css, /header\.top\.solid nav a:not\(\.btn\):not\(\.cta\):hover/);
});
