const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");

test("shared mobile navigation is left-anchored, accessible, and overlays without blank page space", () => {
  const js = fs.readFileSync(path.join(root, "js/mobile-nav.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "css/mobile-nav.css"), "utf8");
  const polish = fs.readFileSync(path.join(root, "css/polish.css"), "utf8");
  assert.match(js, /aria-controls/);
  assert.match(js, /aria-expanded/);
  assert.match(js, /event\.key === "Escape"/);
  assert.match(js, /toggle\.focus\(\)/);
  assert.match(js, /window\.innerWidth > 850/);
  assert.doesNotMatch(js, /mobile-nav-spacer|getBoundingClientRect\(\)\.height|syncSpacer/);
  assert.match(css, /left: 14px/);
  assert.match(css, /right: auto/);
  assert.match(css, /display: none !important/);
  assert.match(css, /display: flex !important/);
  assert.ok(css.includes("width: min(196px, calc(100vw - 24px))"));
  assert.ok(css.includes("background: rgba(255,255,255,.985)"));
  assert.match(polish, /left:14px !important/);
  assert.match(polish, /inset-inline-start:auto !important/);
  const finalMenu = polish.slice(polish.lastIndexOf("/* Final mobile menu surface:"));
  assert.ok(finalMenu.includes("max-height:min(44vh,320px) !important;"));
  assert.ok(finalMenu.includes("gap:2px !important;"));
  assert.ok(finalMenu.includes("padding:7px !important;"));
  assert.ok(finalMenu.includes("background:#fffdfb !important;"));
  assert.ok(finalMenu.includes("backdrop-filter:none !important;"));
  assert.ok(finalMenu.includes("min-height:40px !important;"));
});

test("all primary and generated pages receive the shared mobile menu", () => {
  const pages = ["index.html", "builder.html", "upload.html", "gallery.html", "checkout.html", "game.html", "name-bracelet.html", "account.html"];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.ok(html.includes("/css/mobile-nav.css?v=20261111-release"), page + " loads the current mobile nav CSS cache key");
    assert.ok(html.includes("/js/mobile-nav.js?v=20261111-release"), page + " loads the current mobile nav JS cache key");
    const mobileNavCss = html.indexOf("/css/mobile-nav.css?v=20261111-release");
    const polishCss = html.indexOf("/css/polish.css?v=7");
    assert.ok(polishCss > mobileNavCss, page + " loads the final polish override after mobile-nav.css");
  }
  const contact = fs.readFileSync(path.join(root, "js/contact.js"), "utf8");
  assert.ok(contact.includes("/css/mobile-nav.css?v=20261111-release"));
  assert.ok(contact.includes("/js/mobile-nav.js?v=20261111-release"));
  const template = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.ok(template.includes("/css/mobile-nav.css?v=20261111-release"));
  assert.ok(template.includes("/js/mobile-nav.js?v=20261111-release"));
  const templateMobileCss = template.indexOf("/css/mobile-nav.css?v=20261111-release");
  const templatePolishCss = template.indexOf("/css/polish.css?v=7");
  assert.ok(templatePolishCss > templateMobileCss, "generated pages load the final polish override after mobile-nav.css");
});


test("mobile navigation closes when keyboard focus leaves the header", () => {
  const source = fs.readFileSync(path.join(root, "js/mobile-nav.js"), "utf8");
  const headerHandlers = {};
  const navHandlers = {};
  const documentHandlers = {};
  const windowHandlers = {};
  const attributes = {};
  const classes = new Set();
  const insideHeader = new Set();
  let toggleFocusCount = 0;
  const firstLink = { focus() {} };
  const nav = {
    id: "",
    hasAttribute: () => false,
    setAttribute() {},
    querySelector: () => firstLink,
    addEventListener: (name, handler) => { navHandlers[name] = handler; },
    before() {},
  };
  const toggle = {
    setAttribute: (name, value) => { attributes[name] = value; },
    addEventListener: (name, handler) => { toggleHandlers[name] = handler; },
    focus: () => { toggleFocusCount += 1; },
  };
  const toggleHandlers = {};
  const header = {
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
    },
    querySelector: (selector) => selector === "nav" ? nav : null,
    addEventListener: (name, handler) => { headerHandlers[name] = handler; },
    contains: (target) => insideHeader.has(target),
  };
  insideHeader.add(toggle);
  insideHeader.add(firstLink);
  const document = {
    querySelector: () => header,
    createElement: () => toggle,
    addEventListener: (name, handler) => { documentHandlers[name] = handler; },
  };
  const window = {
    innerWidth: 390,
    addEventListener: (name, handler) => { windowHandlers[name] = handler; },
  };
  vm.runInNewContext(source, { document, window });

  toggleHandlers.click();
  assert.equal(classes.has("menu-open"), true);
  assert.equal(attributes["aria-expanded"], "true");

  headerHandlers.focusout({ relatedTarget: firstLink });
  assert.equal(classes.has("menu-open"), true, "focus moving within the header must keep the menu open");

  headerHandlers.focusout({ relatedTarget: {} });
  assert.equal(classes.has("menu-open"), false, "focus leaving the header must close the menu");
  assert.equal(attributes["aria-expanded"], "false");

  toggleHandlers.click();
  documentHandlers.keydown({ key: "Escape" });
  assert.equal(classes.has("menu-open"), false);
  assert.ok(toggleFocusCount > 0, "Escape should restore focus to the menu toggle");
});
