const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("shared mobile navigation is accessible and overlays without adding blank page space", () => {
  const js = fs.readFileSync(path.join(root, "js/mobile-nav.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "css/mobile-nav.css"), "utf8");
  assert.match(js, /aria-controls/);
  assert.match(js, /aria-expanded/);
  assert.match(js, /event\\.key === "Escape"/);
  assert.match(js, /toggle\\.focus\\(\\)/);
  assert.match(js, /window\\.innerWidth > 850/);
  assert.doesNotMatch(js, /mobile-nav-spacer|getBoundingClientRect\\(\\)\\.height/);
  assert.match(css, /header\\.top\\.has-mobile-menu\\.menu-open nav/);
  assert.match(css, /left: 14px/);
  assert.match(css, /left: 12px/);
  assert.match(css, /display: none !important/);
  assert.match(css, /display: flex !important/);
  assert.ok(css.includes("width: min(248px, calc(100vw - 24px))"));
  assert.ok(css.includes("max-height: min(68svh, 460px)"));
  assert.ok(css.includes("background: rgba(255,255,255,.985)"));
  assert.ok(css.includes("backdrop-filter: blur(22px) saturate(150%)"));
});

test("all primary and generated pages receive the shared mobile menu", () => {
  const pages = ["index.html", "builder.html", "upload.html", "gallery.html", "checkout.html", "game.html", "name-bracelet.html"];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /mobile-nav\.css/, page + " loads mobile nav CSS");
    assert.match(html, /mobile-nav\.js/, page + " loads mobile nav JS");
  }
  const contact = fs.readFileSync(path.join(root, "js/contact.js"), "utf8");
  assert.match(contact, /mobile-nav\.css/);
  assert.match(contact, /mobile-nav\.js/);
  const template = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.match(template, /mobile-nav\.css/);
  assert.match(template, /mobile-nav\.js/);
});
