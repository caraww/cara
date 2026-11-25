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
    const polishMatch = html.match(/\/css\/polish\.css\?v=\d+/);
    assert.ok(polishMatch, file + " should load polish.css");
    const polishPath = polishMatch[0];
    const sharedLayerIndex = html.indexOf(polishPath);
    const pageStyles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+>/g)]
      .filter(([tag]) => !tag.includes("polish.css") && !tag.includes("premium.css") && !tag.includes("hero-signature.css") && !tag.includes("hero-wow.css") && !tag.includes("site-nav.css") && !tag.includes("nav-hero.css") && !tag.includes("site-footer.css") && !tag.includes("theme.css") && !tag.includes("builder-app.css") && !tag.includes("home.bundle.css"))
      .map(([tag]) => html.indexOf(tag));
    assert.ok(
      sharedLayerIndex > Math.max(-1, ...pageStyles),
      file + " should load the shared layer after its page styles",
    );
    if (html.includes("/css/nav-hero.css?v=3")) {
      assert.ok(html.indexOf("/css/nav-hero.css?v=3") > sharedLayerIndex, file + " should load the current header/hero layer after polish.css");
    }
    if (html.includes("/css/premium.css?v=2")) {
      assert.ok(html.indexOf("/css/premium.css?v=2") > sharedLayerIndex, file + " should load the final premium layer after polish.css");
    }
    if (html.includes("css/builder-app.css")) {
      assert.ok(html.indexOf("css/builder-app.css") > html.indexOf("/css/theme.css"), file + " should load the builder app layer last");
    }
  }
});

test("generated bracelet and color pages share the same navigation and visual system", () => {
  const layout = read("lib/generated-page-layout.js");
  assert.ok(layout.includes("/css/accessibility.css"));
  assert.ok(layout.includes("/css/site-nav.css?v=20261113"));
  assert.ok(layout.includes("/css/bracelet-pages.css?v=9"));
  assert.match(layout, /\/css\/polish\.css\?v=[\w.-]+/);
  assert.ok(layout.includes("/css/premium.css?v=2"));
  assert.match(layout, /\/js\/contact\.js\?v=[\w.-]+/);
  assert.match(layout, /\/css\/nav-hero\.css\?v=[\w.-]+/);
  assert.ok(layout.includes("/js/nav-hero.js?v=1"));
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


test("desktop cart link is a hover/focus disclosure from the account navigation item", () => {
  const css = read("css/site-nav.css");
  assert.match(css, /nav:has\(a\[href\*="account\.html"\]:hover\) a\[href\*="cart\.html"\]/);
  assert.match(css, /nav:has\(a\[href\*="account\.html"\]:focus-visible\) a\[href\*="cart\.html"\]/);
  assert.match(css, /opacity: 0 !important;[\s\S]*visibility: hidden;[\s\S]*pointer-events: none;/);
  assert.match(css, /@media \(min-width: 851px\)/);
});
