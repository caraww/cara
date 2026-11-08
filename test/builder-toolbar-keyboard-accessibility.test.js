const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("builder toolbar uses roving tabindex and arrow-key navigation", () => {
  const js = fs.readFileSync(path.join(root, "js/builder.js"), "utf8");
  assert.match(js, /toolbar\.setAttribute\("aria-orientation", "horizontal"\)/);
  assert.ok(js.includes("button:not([disabled]), a[href]"));
  assert.match(js, /el\.tabIndex = el === active \? 0 : -1/);
  assert.match(js, /event\.key === "Home"/);
  assert.match(js, /event\.key === "End"/);
  assert.match(js, /event\.key === "ArrowRight"/);
  assert.match(js, /event\.key === "ArrowLeft"/);
  assert.match(js, /items\[next\]\.focus\(\)/);
  assert.match(js, /new MutationObserver\(\(\) => \{/);
});
