/* order-store.mjs — کپی سفارش‌ها در D1 (مرحله‌ی ۱ انتقال از KV).
   قانون‌ها:
   - KV هنوز مرجع اصلیه؛ اول توی KV نوشته می‌شه، بعد این‌جا آینه می‌شه.
   - هر خطای D1 قورت داده می‌شه (فقط لاگ)؛ هیچ‌وقت نباید پرداخت یا سفارش رو خراب کنه.
   - ستون order_json همون JSON کامل KV ـه، پس شکل سفارش عوض نمی‌شه. */

const UPSERT = `INSERT INTO orders
  (id, created_at, status, fulfillment, paid_at, price_toman, sandbox, customer_phone, user_id, track_id, order_json, mirrored_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    created_at = excluded.created_at, status = excluded.status, fulfillment = excluded.fulfillment,
    paid_at = excluded.paid_at, price_toman = excluded.price_toman, sandbox = excluded.sandbox,
    customer_phone = excluded.customer_phone, user_id = excluded.user_id, track_id = excluded.track_id,
    order_json = excluded.order_json, mirrored_at = excluded.mirrored_at`;

const text = (v) => (v == null ? null : String(v));

export function orderValues(order, now = Date.now()) {
  return [
    String(order.id), text(order.createdAt), String(order.status || "pending"), String(order.fulfillment || "new"),
    text(order.paidAt), Number.isFinite(Number(order.priceToman)) ? Math.round(Number(order.priceToman)) : null,
    order.sandbox ? 1 : 0, text(order.customer && order.customer.phone), text(order.userId), text(order.trackId),
    JSON.stringify(order), now,
  ];
}

const upsertStatement = (db, order) => db.prepare(UPSERT).bind(...orderValues(order));

export async function mirrorOrder(env, order) {
  if (!env || !env.ACCOUNTS_DB || !order || !order.id) return false;
  try {
    await upsertStatement(env.ACCOUNTS_DB, order).run();
    return true;
  } catch (e) {
    console.error("orders mirror failed", String(order.id), String(e).slice(0, 200));
    return false;
  }
}

export async function unmirrorOrder(env, id) {
  if (!env || !env.ACCOUNTS_DB || !id) return false;
  try {
    await env.ACCOUNTS_DB.prepare("DELETE FROM orders WHERE id = ?").bind(String(id)).run();
    return true;
  } catch (e) {
    console.error("orders unmirror failed", String(id), String(e).slice(0, 200));
    return false;
  }
}

/* یه قدم از کپی سفارش‌های قدیمی KV → D1 (idempotent؛ هر بار می‌شه تکرارش کرد). */
export async function backfillOrders(env, { cursor, limit = 100 } = {}) {
  if (!env.ORDERS || !env.ACCOUNTS_DB) return { error: "KV یا D1 وصل نیست." };
  const page = await env.ORDERS.list({ prefix: "order:", cursor: cursor || undefined, limit: Math.min(Math.max(+limit || 100, 1), 100) });
  const orders = [];
  let skipped = 0;
  for (let i = 0; i < page.keys.length; i += 25) {
    const values = await Promise.all(page.keys.slice(i, i + 25).map((k) => env.ORDERS.get(k.name)));
    for (const v of values) {
      try { const o = JSON.parse(v); if (o && o.id) orders.push(o); else skipped++; } catch { skipped++; }
    }
  }
  if (orders.length) await env.ACCOUNTS_DB.batch(orders.map((o) => upsertStatement(env.ACCOUNTS_DB, o)));
  return { copied: orders.length, skipped, cursor: page.list_complete ? null : page.cursor, done: !!page.list_complete };
}

/* مقایسه‌ی KV و D1 قبل از این‌که بخونیمشون از D1 (حداکثر ۲۰۰۰ سفارش). */
export async function compareOrders(env, max = 2000) {
  if (!env.ORDERS || !env.ACCOUNTS_DB) return { error: "KV یا D1 وصل نیست." };
  const kv = new Map();
  let cursor;
  do {
    const page = await env.ORDERS.list({ prefix: "order:", cursor });
    for (const k of page.keys) kv.set(k.name.slice(6), k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && kv.size < max);
  const d1 = new Map();
  const { results } = await env.ACCOUNTS_DB.prepare("SELECT id, status, fulfillment, paid_at FROM orders").all();
  for (const r of results || []) d1.set(r.id, r);
  const missingInD1 = [], onlyInD1 = [], different = [];
  const ids = [...kv.keys()];
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    const values = await Promise.all(chunk.map((id) => env.ORDERS.get(kv.get(id))));
    chunk.forEach((id, j) => {
      const row = d1.get(id);
      if (!row) { missingInD1.push(id); return; }
      let o; try { o = JSON.parse(values[j]); } catch { return; }
      if (!o) return;
      if (String(o.status || "pending") !== row.status || String(o.fulfillment || "new") !== row.fulfillment || (o.paidAt || null) !== (row.paid_at || null)) different.push(id);
    });
  }
  for (const id of d1.keys()) if (!kv.has(id)) onlyInD1.push(id);
  return {
    kv: kv.size, d1: d1.size, missingInD1: missingInD1.slice(0, 50), missingInD1Count: missingInD1.length,
    onlyInD1: onlyInD1.slice(0, 50), onlyInD1Count: onlyInD1.length, different: different.slice(0, 50), differentCount: different.length,
    inSync: !missingInD1.length && !onlyInD1.length && !different.length,
  };
}
