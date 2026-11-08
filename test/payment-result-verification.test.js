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
  assert.ok(js.includes('fetch("/api/order-status?id="'));
  assert.ok(js.includes('data.status !== "paid"'));
  assert.ok(!js.includes('box.innerHTML = res === "success"'));
});

test("checkout only clears saved pattern and discount after server-confirmed payment", { skip: !featureReady }, () => {
  const paidCheck = js.indexOf('if (!response.ok || data.status !== "paid")');
  const clearPattern = js.indexOf('localStorage.removeItem("cara-pattern")');
  const clearDiscount = js.indexOf('localStorage.removeItem("cara-discount")');
  assert.ok(paidCheck >= 0 && clearPattern > paidCheck && clearDiscount > paidCheck);
  assert.ok(js.includes("الگوت محفوظ می‌مونه"));
});

test("Worker exposes only minimal public order status for UUID order IDs", { skip: !featureReady }, () => {
  assert.ok(worker.includes('p === "/api/order-status" && request.method === "GET"'));
  const endpoint = worker.slice(worker.indexOf('p === "/api/order-status"'), worker.indexOf('p === "/api/create-payment"'));
  assert.ok(endpoint.includes("status: String(order.status"));
  assert.ok(endpoint.includes("fulfillment: String(order.fulfillment"));
  assert.ok(!/customer|priceToman|pattern|discountCode/.test(endpoint));
});

test("discount storage is not cleared based on an unverified query parameter", { skip: !featureReady }, () => {
  assert.ok(js.includes('has("result")) return'));
  assert.ok(!js.includes('get("result") === "success".*removeItem("cara-discount")'));
});
