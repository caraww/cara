const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const PUBLIC_PAGES = [
  "index.html",
  "gallery.html",
  "builder.html",
  "upload.html",
  "cart.html",
  "checkout.html",
  "about.html",
  "faq.html",
  "sale.html",
  "starter.html",
  "name-bracelet.html",
  "bracelet/کوکا.html",
  "colors/index.html",
  "category/gift-anniversary.html",
  "blog/index.html",
  "blog/order-guide.html",
];

test("every public page loads exactly one GTM container with the canonical bootstrap", () => {
  for (const page of PUBLIC_PAGES) {
    const html = read(page);
    assert.equal((html.match(/GTM-P54M67FG/g) || []).length, 1, page + ": one GTM container reference");
    assert.ok(html.includes('window.dataLayer=window.dataLayer||[]'), page + ": dataLayer bootstrap");
    assert.ok(html.includes('event:"gtm.js"'), page + ": gtm.js event before the container loads");
    assert.ok(/setTimeout\(function\(\)\{var s=document\.createElement\("script"\)/.test(html), page + ": container script stays deferred");
  }
});

test("product pages report view_item with a price", () => {
  const html = read("bracelet/کوکا.html");
  assert.ok(html.includes('event:"view_item"'), "view_item on the product page");
  assert.ok(html.includes("[data-price]"), "view_item reads the rendered price");
});

test("analytics helper exposes the canonical GA4 ecommerce events", () => {
  const js = read("js/analytics.js");
  for (const name of ["view_item", "view_item_list", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase"]) {
    assert.ok(js.includes(name + ": 1"), "js/analytics.js whitelists " + name);
  }
  assert.ok(js.includes('name === "search"'), "search is pushed with search_term");
});

test("funnel pages call the ecommerce helper", () => {
  assert.ok(read("js/gallery.js").includes('CARA.ecom("view_item_list"'), "gallery: view_item_list");
  assert.ok(read("js/gallery.js").includes('CARA.ecom("view_item"'), "gallery: view_item");
  assert.ok(read("js/cart.js").includes('ecom("add_to_cart"'), "cart: add_to_cart");
  assert.ok(read("js/cart.js").includes('ecom("remove_from_cart"'), "cart: remove_from_cart");
  assert.ok(read("js/checkout.js").includes('CARA.ecom("begin_checkout"'), "checkout: begin_checkout");
  assert.ok(read("js/checkout.js").includes('CARA.ecom("purchase"'), "checkout: purchase");
});

test("purchase reports the order value and id, and the order id is dropped from the URL", () => {
  const js = read("js/checkout.js");
  assert.ok(js.includes("transaction_id: id"), "purchase sends transaction_id");
  assert.ok(js.includes('sessionStorage.setItem("cara-order-" + j.orderId'), "order value is kept for the return page");
  assert.ok(js.includes('history.replaceState(null, "", location.pathname + "?result="'), "order id is stripped from the URL");
});
