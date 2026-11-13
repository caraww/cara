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
    if (page === "index.html") {
      assert.ok(html.includes("/css/cn-top.css?v=2"), "index.html loads the current cn-header and cn-hero stylesheet");
      assert.ok(html.includes("/js/cn-header.js?v=1"), "index.html loads the current cn-header behavior");
      assert.match(html, /class="cn-header"/);
      assert.match(html, /class="cn-toggle"/);
    } else {
      const hasSharedNav = html.includes("/css/mobile-nav.css?v=20261111-release") || html.includes("/css/site-nav.css?v=20261113");
      assert.ok(hasSharedNav, page + " loads a shared navigation stylesheet");
      const hasSharedNavScript = html.includes("/js/mobile-nav.js?v=20261111-release") || html.includes("/js/site-nav.js") || html.includes("/js/cn-header.js");
      assert.ok(hasSharedNavScript, page + " loads shared navigation behavior");
      const navCss = html.includes("/css/mobile-nav.css?v=20261111-release") ? html.indexOf("/css/mobile-nav.css?v=20261111-release") : html.indexOf("/css/site-nav.css?v=20261113");
      const polishCss = html.indexOf("/css/polish.css?v=7");
      if (polishCss >= 0) assert.ok(polishCss > navCss || html.indexOf("/css/site-nav.css?v=20261113") > polishCss, page + " keeps navigation and polish layers ordered");
    }
  }
  const contact = fs.readFileSync(path.join(root, "js/contact.js"), "utf8");
  assert.ok(contact.includes("/css/mobile-nav.css?v=20261111-release"));
  assert.ok(contact.includes("/js/mobile-nav.js?v=20261111-release"));
  assert.ok(contact.includes("/css/polish.css?v=7"));
  assert.match(contact, /link\.onload = loadPolish/);
  assert.match(contact, /link\.onerror = loadPolish/);
  assert.match(contact, /polish\.onload = loadNavScript/);
  assert.match(contact, /polish\.onerror = loadNavScript/);
  assert.match(contact, /link\.href\.includes\("\/css\/site-nav\.css"\)/);
  const template = fs.readFileSync(path.join(root, "lib/generated-page-layout.js"), "utf8");
  assert.ok(template.includes("/css/site-nav.css?v=20261113"));
  assert.ok(template.includes("/js/mobile-nav.js?v=20261111-release"));
  assert.ok(template.includes("/js/contact.js?v=20261112-release"));
  const templateBraceletCss = template.indexOf("/css/bracelet-pages.css?v=1");
  const templateSiteNavCss = template.indexOf("/css/site-nav.css?v=20261113");
  assert.ok(templateSiteNavCss > templateBraceletCss, "generated pages load the shared navigation as the final visual layer");
});


test("all generated bracelet and color pages load current shared navigation assets", () => {
  for (const folder of ["bracelet", "colors"]) {
    const names = fs.readdirSync(path.join(root, folder)).filter((name) => name.endsWith(".html"));
    assert.ok(names.length > 0, folder + " generated pages must exist");
    for (const name of names) {
      const page = path.join(folder, name);
      const html = fs.readFileSync(path.join(root, page), "utf8");
      const braceletCss = html.indexOf("/css/bracelet-pages.css?v=1");
      const navCss = html.indexOf("/css/site-nav.css?v=20261113");
      assert.ok(braceletCss >= 0 && navCss > braceletCss, page + " loads shared navigation after the bracelet page styles");
      assert.ok(html.includes("/js/contact.js?v=20261112-release"), page + " uses the fresh contact fallback URL");
      assert.ok(html.includes("/js/mobile-nav.js?v=20261111-release"), page + " loads the shared menu behavior");
    }
  }
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
