import test from "node:test";
import assert from "node:assert/strict";
import { handleCartRequest } from "../lib/cart.mjs";

function emptyD1() {
  return {
    prepare() {
      return {
        bind() {
          return {
            first: async () => null,
            run: async () => ({ success: true, meta: { changes: 1 } }),
            all: async () => ({ results: [] }),
          };
        },
      };
    },
    batch: async () => [],
  };
}

const options = {
  rateLimit: async () => true,
  cleanPattern: (design) => design?.data?.length ? { ...design, total: 1 } : null,
  getWork: async () => null,
  pricePerBead: 1500,
  baseFee: 150000,
};

test("GET /api/cart creates an anonymous server cart and sets a protected guest cookie", async () => {
  const response = await handleCartRequest(
    new Request("https://caraw.ir/api/cart"),
    { ACCOUNTS_DB: emptyD1(), BASE_URL: "https://caraw.ir" },
    new URL("https://caraw.ir/api/cart"),
    options,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], totalItems: 0, totalToman: 0 });
  const cookie = response.headers.get("Set-Cookie") || "";
  assert.match(cookie, /^__Host-cara_guest=[a-f0-9]{64};/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=//);
});

test("cart mutations reject missing or foreign Origin headers", async () => {
  const response = await handleCartRequest(
    new Request("https://caraw.ir/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ type: "design", design: { data: [["DB0010"]] } }),
    }),
    { ACCOUNTS_DB: emptyD1(), BASE_URL: "https://caraw.ir" },
    new URL("https://caraw.ir/api/cart/items"),
    options,
  );
  assert.equal(response.status, 403);
});

test("cart rejects invalid quantities before creating a guest cart", async () => {
  const response = await handleCartRequest(
    new Request("https://caraw.ir/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://caraw.ir" },
      body: JSON.stringify({ type: "design", quantity: 21, design: { data: [["DB0010"]] } }),
    }),
    { ACCOUNTS_DB: emptyD1(), BASE_URL: "https://caraw.ir" },
    new URL("https://caraw.ir/api/cart/items"),
    options,
  );
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /بین ۱ تا ۲۰/);
});

test("cart routes fail closed when the D1 binding is unavailable", async () => {
  const response = await handleCartRequest(
    new Request("https://caraw.ir/api/cart"),
    {},
    new URL("https://caraw.ir/api/cart"),
    options,
  );
  assert.equal(response.status, 503);
});
