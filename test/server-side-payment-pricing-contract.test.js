const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const worker = fs.readFileSync(path.join(root, "index.js"), "utf8");
const start = worker.indexOf("async function createPayment(request, env) {");
const end = worker.indexOf("/* تأیید پرداخت با زیبال.", start);
assert.ok(start >= 0 && end > start, "Worker createPayment boundary must remain identifiable");
const createPayment = worker.slice(start, end);

test("pattern and gallery payment amounts are calculated from server-owned data", () => {
  assert.match(createPayment, /priceToman = Math\.round\(C\.base \+ pattern\.total \* C\.price\)/);
  assert.match(createPayment, /const \{ list, prices \} = await pricedWorks\(env\)/);
  assert.match(createPayment, /priceToman = prices\[String\(work\.id\)\]/);
  assert.match(createPayment, /priceToman,\s*customer,/);
});

test("client-supplied price or amount fields cannot determine the payment total", () => {
  assert.doesNotMatch(createPayment, /body\.(?:price|amount|total|priceToman)\b/);
  assert.match(createPayment, /a: priceToman \* 10/);
  assert.match(createPayment, /priceToman \* 10 >= 10000/);
});

test("discount is validated and applied by the Worker after the authoritative base price", () => {
  const basePrice = createPayment.indexOf("priceToman = Math.round(C.base + pattern.total * C.price)");
  const validateCode = createPayment.indexOf("dc = await checkCode(env, body.discountCode)");
  const applyDiscount = createPayment.indexOf("priceToman = Math.round(priceToman * (1 - ((await codeDiscount(env, dc)) || DISCOUNT)))");
  const createOrder = createPayment.indexOf("const order = {");
  assert.ok(basePrice >= 0 && validateCode > basePrice);
  assert.ok(applyDiscount > validateCode && createOrder > applyDiscount);
});
