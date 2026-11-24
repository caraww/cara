const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

test("checkout shows a pattern price after coming from the builder", async () => {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        hidden: false,
        disabled: false,
        textContent: "",
        innerHTML: "",
        width: 0,
        height: 0,
        getContext: () => ({}),
        addEventListener: () => {},
        replaceChildren: () => {},
      });
    }
    return elements.get(id);
  };

  const pattern = { width: 10, height: 2, data: Array.from({ length: 2 }, () => Array(10).fill("DB0010")) };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    location: { search: "" },
    document: {
      getElementById: (id) => (id === "pay" ? null : element(id)),
      querySelector: (selector) => {
        if (selector === "#form" || selector === "#err" || selector === "#pay") {
          return selector === "#pay" ? null : element(selector.slice(1));
        }
        return null;
      },
      createElement: () => element("created"),
      addEventListener: () => {},
    },
    fetch: async () => ({ json: async () => ({ baseFee: 50000, pricePerBead: 1000 }) }),
    CARA: {
      loadPattern: () => pattern,
      faNum: (n) => String(n),
      L: { BEAD_ASPECT: 1 },
      drawPattern: () => {},
    },
    CARA_SALE: {
      final: (n) => Math.round(n * 0.7),
      priceHTML: (n) => `<s class="price-list">${n}</s><b class="price-now">${Math.round(n * 0.7)}</b>`,
    },
  };
  context.window = context;

  vm.runInNewContext(fs.readFileSync(path.join(root, "js/checkout.js"), "utf8"), context, { filename: "js/checkout.js" });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const price = elements.get("price");
  assert.ok(price, "checkout should render the price element");
  assert.notEqual(price.textContent, "—", "a builder pattern must not fall back to a dash");
  assert.match(price.innerHTML, /price-list/, "the original price should be shown");
  assert.match(price.innerHTML, /price-now/, "the sale price should be shown");
});
