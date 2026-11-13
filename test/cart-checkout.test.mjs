import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cart = fs.readFileSync(path.join(root, "lib/cart.mjs"), "utf8");
const worker = fs.readFileSync(path.join(root, "index.js"), "utf8");
const page = fs.readFileSync(path.join(root, "cart.html"), "utf8");
const client = fs.readFileSync(path.join(root, "js/cart.js"), "utf8");
const checkout = fs.readFileSync(path.join(root, "js/checkout.js"), "utf8");
const schema = fs.readFileSync(path.join(root, "migrations/0001_accounts.sql"), "utf8");
const admin = fs.readFileSync(path.join(root, "admin.html"), "utf8");

test("cart schema has one owner per cart and bounded item quantities", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS carts/);
  assert.match(schema, /carts_one_per_user_idx/);
  assert.match(schema, /carts_one_per_guest_idx/);
  assert.match(schema, /UNIQUE \(cart_id, item_key\)/);
  assert.match(schema, /quantity BETWEEN 1 AND 20/);
});

test("guest cart uses a high-entropy HttpOnly Secure SameSite cookie", () => {
  assert.match(cart, /__Host-cara_guest/);
  assert.match(cart, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(cart, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(cart, /request\.headers\.get\("Origin"\)/);
  assert.match(cart, /method === "GET" && path === "\/api\/cart"/);
});

test("cart mutations are scoped to the resolved owner and enforce quantity and item limits", () => {
  assert.match(cart, /SELECT id FROM carts WHERE \$\{column\} = \?/);
  assert.match(cart, /WHERE id = \? AND cart_id = \?/);
  assert.match(cart, /MAX_ITEMS = 30/);
  assert.match(cart, /MAX_QUANTITY = 20/);
  assert.match(cart, /quantity < 1 \|\| quantity > MAX_QUANTITY/);
  assert.match(cart, /ON CONFLICT\(cart_id, item_key\) DO UPDATE SET quantity = MIN\(cart_items\.quantity \+ excluded\.quantity, 20\)/);
});

test("cart prices are recomputed from server-owned catalog and validated designs", () => {
  assert.match(cart, /options\.getWork\(snapshot\.workId\)/);
  assert.match(cart, /options\.cleanPattern\(snapshot\.design\)/);
  assert.match(cart, /options\.baseFee \+ pattern\.total \* options\.pricePerBead/);
  assert.doesNotMatch(cart, /body\.(?:price|amount|total|unitPrice|lineTotal)\b/);
  assert.match(worker, /price: prices\[String\(work\.id\)\]/);
});

test("guest-to-account merge is transactional and idempotent by cart item key", () => {
  assert.match(cart, /POST" && path === "\/api\/cart\/merge"/);
  assert.match(cart, /await env\.ACCOUNTS_DB\.batch\(statements\)/);
  assert.match(cart, /ON CONFLICT\(cart_id, item_key\) DO UPDATE/);
  assert.match(cart, /DELETE FROM carts WHERE id = \? AND guest_id = \?/);
});

test("cart checkout totals are server-calculated and purchased rows clear only after verified payment", () => {
  assert.match(worker, /body\.cart === true/);
  assert.match(worker, /cart\.items\.reduce\(\(sum, item\) => sum \+ item\.lineTotal, 0\)/);
  assert.match(worker, /cartSnapshot:/);
  const paidBlock = worker.slice(worker.indexOf("if (paid) {"), worker.indexOf("if (markFailed)", worker.indexOf("if (paid) {")));
  assert.match(paidBlock, /clearPurchasedCartItems\(env, order\.cartSnapshot\)/);
  assert.match(cart, /DELETE FROM cart_items WHERE id = \? AND cart_id = \? AND updated_at = \?/);
});

test("cart page exposes accessible quantity controls and cart checkout entry", () => {
  assert.match(page, /id="cartItems"/);
  assert.match(page, /id="cartMessage" role="status"/);
  assert.match(page, /checkout\.html\?cart=1/);
  assert.match(client, /method: "PATCH"/);
  assert.match(client, /method: "DELETE"/);
  assert.match(client, /aria-label", "زیاد کردن تعداد"/);
  assert.match(client, /aria-label", "کم کردن تعداد"/);
});

test("checkout submits a cart without trusting browser-supplied totals", () => {
  assert.match(checkout, /const cartMode = q\.get\("cart"\) === "1"/);
  assert.match(checkout, /cart: true, customer: fd/);
  assert.match(checkout, /data\.items\.some\(\(item\) => !item\.available\)/);
});

test("cart orders remain visible in admin details and exports", () => {
  assert.match(worker, /items: Array\.isArray\(o\.items\)/);
  assert.match(admin, /o\.kind === "cart"/);
  assert.match(admin, /r\.kind === "cart"/);
  assert.match(admin, /item\.design/);
});

test("existing single-item and guest checkout paths remain available", () => {
  assert.match(worker, /body\.workId != null/);
  assert.match(worker, /cleanPattern\(body\.pattern\)/);
  assert.match(checkout, /q\.get\("work"\)/);
  assert.match(checkout, /pattern: \{ width: p\.width, height: p\.height, data: p\.data \}/);
});
