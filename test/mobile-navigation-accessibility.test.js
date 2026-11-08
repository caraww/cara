const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("shared mobile navigation creates an accessible menu and restores focus on Escape", () => {
  const js = fs.readFileSync(path.join(root, "js/mobile-nav.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "css/mobile-nav.css"), "utf8");
  assert.match(js, /aria-controls/);
  assert.match(js, /aria-expanded/);
  assert.match(js, /event\.key === "Escape"/);
  assert.match(js, /toggle\.focus\(\)/);
  assert.match(js, /window\.innerWidth > 850/);
  assert.match(css, /\.top\.has-mobile-menu\.menu-open nav/);
  assert.match(css, /max-height: min\\(62vh, 440px\\)/);
});

test("all primary pages and generated landing pages load the shared mobile menu", () => {
  const pages = ["index.html", "builder.html", "upload.html", "gallery.html", "checkout.html", "game.html", "name-bracelet.html"];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /mobile-nav\.css/, page + " loads mobile nav CSS");
    assert.match(html, /mobile-nav\.js/, page + " loads mobile nav JS");
  }
  const template = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.match(template, /mobile-nav\.css/);
  assert.match(template, /mobile-nav\.js/);
});