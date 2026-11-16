import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mirrorOrder, unmirrorOrder, backfillOrders, compareOrders, orderValues } from "../lib/order-store.mjs";

function fakeKV(entries = {}, pageSize = 2) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    get: async (k) => map.get(k) ?? null,
    put: async (k, v) => { map.set(k, v); },
    list: async ({ prefix = "", cursor, limit = 1000 } = {}) => {
      const names = [...map.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0, size = Math.min(pageSize, limit);
      const slice = names.slice(start, start + size);
      const done = start + size >= names.length;
      return { keys: slice.map((name) => ({ name })), list_complete: done, cursor: done ? undefined : String(start + size) };
    },
  };
}
function fakeD1({ fail = false } = {}) {
  const rows = new Map();
  const run = (sql, args) => {
    if (fail) throw new Error("D1 down");
    if (/^INSERT INTO orders/.test(sql)) rows.set(args[0], { id: args[0], created_at: args[1], status: args[2], fulfillment: args[3], paid_at: args[4], price_toman: args[5], sandbox: args[6], customer_phone: args[7], user_id: args[8], track_id: args[9], order_json: args[10] });
    else if (/^DELETE FROM orders/.test(sql)) rows.delete(args[0]);
  };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { run(sql, args); return { success: true }; },
    all: async () => ({ results: [...rows.values()] }),
    _run: () => run(sql, args),
  });
  return { rows, prepare: (sql) => stmt(sql), batch: async (list) => { list.forEach((s) => s._run()); return list.map(() => ({ success: true })); } };
}
const order = (id, extra = {}) => ({ id, status: "pending", fulfillment: "new", createdAt: "2026-11-15T10:00:00.000Z", priceToman: 250000, customer: { phone: "09121234567" }, ...extra });

test("mirrorOrder stores the full order JSON plus the indexed columns", async () => {
  const env = { ACCOUNTS_DB: fakeD1() };
  assert.equal(await mirrorOrder(env, order("a1", { userId: "u1", status: "paid", paidAt: "2026-11-15T11:00:00.000Z", sandbox: true })), true);
  const row = env.ACCOUNTS_DB.rows.get("a1");
  assert.equal(row.status, "paid");
  assert.equal(row.user_id, "u1");
  assert.equal(row.customer_phone, "09121234567");
  assert.equal(row.sandbox, 1);
  assert.deepEqual(JSON.parse(row.order_json).customer, { phone: "09121234567" });
});

test("a D1 failure never throws, so a payment can never be broken by the mirror", async () => {
  const env = { ACCOUNTS_DB: fakeD1({ fail: true }) };
  assert.equal(await mirrorOrder(env, order("a1")), false);
  assert.equal(await unmirrorOrder(env, "a1"), false);
  assert.equal(await mirrorOrder({}, order("a1")), false);
});

test("backfill copies every KV order across pages and is idempotent", async () => {
  const kv = fakeKV({ "order:a": JSON.stringify(order("a")), "order:b": JSON.stringify(order("b")), "order:c": JSON.stringify(order("c")), "pn:zzz": "x", "order:bad": "{oops" });
  const env = { ORDERS: kv, ACCOUNTS_DB: fakeD1() };
  for (let round = 0; round < 2; round++) {
    let cursor, copied = 0, guard = 0;
    do { const r = await backfillOrders(env, { cursor }); copied += r.copied; cursor = r.cursor; if (r.done) break; } while (cursor && ++guard < 10);
    assert.equal(copied, 3);
    assert.equal(env.ACCOUNTS_DB.rows.size, 3);
  }
});

test("compareOrders reports missing, extra and different orders", async () => {
  const kv = fakeKV({ "order:a": JSON.stringify(order("a")), "order:b": JSON.stringify(order("b", { status: "paid" })), "order:c": JSON.stringify(order("c")) });
  const d1 = fakeD1(); const env = { ORDERS: kv, ACCOUNTS_DB: d1 };
  await mirrorOrder(env, order("a"));
  await mirrorOrder(env, order("b"));            // stale status in D1
  await mirrorOrder(env, order("ghost"));        // only in D1
  const r = await compareOrders(env);
  assert.deepEqual(r.missingInD1, ["c"]);
  assert.deepEqual(r.onlyInD1, ["ghost"]);
  assert.deepEqual(r.different, ["b"]);
  assert.equal(r.inSync, false);
  await backfillOrders(env, {}); await backfillOrders(env, { cursor: "2" });
  await unmirrorOrder(env, "ghost");
  assert.equal((await compareOrders(env)).inSync, true);
});

test("orderValues keeps nulls for missing optional fields", () => {
  const v = orderValues({ id: "x", customer: {} }, 123);
  assert.equal(v[0], "x"); assert.equal(v[7], null); assert.equal(v[8], null); assert.equal(v[11], 123);
});

test("Worker writes KV first and only then mirrors; the sync endpoint is admin-gated", () => {
  const w = fs.readFileSync(new URL("../index.js", import.meta.url), "utf8");
  const save = w.slice(w.indexOf("const saveOrder"), w.indexOf("const removeOrder"));
  assert.ok(save.indexOf("env.ORDERS.put") >= 0 && save.indexOf("env.ORDERS.put") < save.indexOf("mirrorOrder(env, o)"));
  const sync = w.slice(w.indexOf("async function adminOrdersSync"), w.indexOf("async function admin(request"));
  assert.match(sync, /adminGate/); assert.match(sync, /authed\(request, env\)/);
  assert.match(w, /p === "\/api\/admin\/orders-sync"/);
});
