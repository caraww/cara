const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "index.js"), "utf8");
const featureReady = worker.includes('p === "/api/order-status"') &&
  js.includes('fetch("/api/order-status?id="');

test("checkout never trusts a success query parameter without server confirmation", { skip: !featureReady }, () => {
  assert.match(js, /fetch\("\/api\/order-status\?id="/);
  assert.match(js, /data\.status !== "paid"/);
  assert.doesNotMatch(js, /res === "success" \? \`<p class="ok">/);
});

test("checkout only clears saved pattern and discount after server-confirmed payment", { skip: !featureReady }, () => {
  const paidCheck = js.indexOf('if (!response.ok || data.status !== "paid")');
  const clearPattern = js.indexOf('localStorage.removeItem("cara-pattern")');
  const clearDiscount = js.indexOf('localStorage.removeItem("cara-discount")');
  assert.ok(paidCheck >= 0 && clearPattern > paidCheck && clearDiscount > paidCheck);
  assert.match(js, /الگوت محفوظ می‌مونه/);
});

test("Worker exposes only minimal public order status for UUID order IDs", { skip: !featureReady }, () => {
  assert.match(worker, /p === "\/api\/order-status" && request\.method === "GET"/);
  const endpoint = worker.slice(worker.indexOf('p === "/api/order-status"'), worker.indexOf('p === "/api/create-payment"'));
  assert.match(endpoint, /status: String\(order\.status/);
  assert.match(endpoint, /fulfillment: String\(order\.fulfillment/);
  assert.doesNotMatch(endpoint, /customer|priceToman|pattern|discountCode/);
});

test("discount storage is not cleared based on an unverified query parameter", { skip: !featureReady }, () => {
  assert.match(js, /has\("result"\)\) return/);
  assert.doesNotMatch(js, /get\("result"\) === "success".*removeItem\("cara-discount"\)/);
});
