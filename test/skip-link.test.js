const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pages = ["index.html", "builder.html", "upload.html", "gallery.html", "checkout.html", "game.html", "name-bracelet.html", "offline.html", "admin.html"];

test("all standalone pages expose a keyboard skip link and focusable main landmark", () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    assert.match(html, /class="skip-link" href="#main-content"/, page + " skip link");
    assert.match(html, /<main\\b[^>]*id="main-content"[^>]*tabindex="-1"/, page + " main landmark");
    assert.match(html, /css\\/accessibility\\.css/, page + " shared accessibility stylesheet");
  }
});

test("generated work and color pages include the same skip navigation", () => {
  const generator = fs.readFileSync(path.join(__dirname, "..", "tools", "build-pages.js"), "utf8");
  assert.match(generator, /class="skip-link" href="#main-content"/);
  assert.match(generator, /<main class="pg" id="main-content" tabindex="-1">/);
  assert.match(generator, /css\\/accessibility\\.css/);
});
