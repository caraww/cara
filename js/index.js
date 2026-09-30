/* API سایت cara روی Cloudflare Worker (جایگزین server.js).
   مسیرها: /api/config  /api/create-payment  /api/payment-callback  /api/admin/orders
   تنظیمات (توی داشبورد Cloudflare → Worker → Settings):
     Variables:  PRICE_PER_BEAD=1500   BASE_FEE=150000   BASE_URL=https://caraw.ir
     Secrets:    SEPAL_API_KEY (کلید اصلی سپال؛ اگه نذاری حالت test/سندباکس می‌شه)
                 ADMIN_TOKEN (یه رمز دلخواه؛ توی هدر Authorization: Bearer فرستاده می‌شه)
     KV binding: ORDERS  (یه KV namespace بساز و با همین اسم وصلش کن) */

const SEPAL = "https://sepal.ir";

/* کدهای معتبر منجوق؛ باید با js/palette.js یکی باشه. بعد از هر تغییر توی palette.js این رو بزن:  node tools/sync-valid.js <مسیر این فایل> */
/* SYNC:START (خودکار؛ دستی ویرایش نکن: node tools/sync-valid.js) */
const VALID = new Set([
  "FGB0370", "DB0010", "DB0654", "DB0757", "DB2103", "DB0310", "DB0732", "DB0726", "DB0727", "DB0157",
  "DB1498", "DB0725", "DB0321", "DB0721", "DB2359", "DB0756", "DB1133", "DB0724", "DB0774", "DB1134",
  "DB2109", "DB0351", "DB0200", "DB2264", "DB0785", "DB0628", "DB0766", "DB1832", "DB1582",
]);
/* SYNC:END */
const LIM = { MAX_W: 40, MAX_H: 200 };

const ok = (j) => !!j && (j.status === true || j.status === 1 || j.status === "1");
const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const digits = (s) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

function cfg(env) {
  const key = env.SEPAL_API_KEY || "test";
  return {
    key,
    sandbox: key === "test",
    price: Number(env.PRICE_PER_BEAD) || 0,
    base: Number(env.BASE_FEE) || 0,
    site: (env.BASE_URL || "https://caraw.ir").replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://"),
  };
}

function cleanPattern(p) {
  if (!p || !Array.isArray(p.data)) return null;
  const h = p.data.length;
  if (h < 1 || h > LIM.MAX_H || !Array.isArray(p.data[0])) return null;
  const w = p.data[0].length;
  if (w < 1 || w > LIM.MAX_W) return null;
  const counts = {};
  let total = 0;
  const data = [];
  for (const row of p.data) {
    if (!Array.isArray(row) || row.length !== w) return null;
    const out = [];
    for (const c of row) {
      if (c == null) { out.push(null); continue; }
      if (!VALID.has(c)) return null;
      total++;
      counts[c] = (counts[c] || 0) + 1;
      out.push(c);
    }
    data.push(out);
  }
  return total ? { width: w, height: h, data, counts, total } : null;
}

async function sepal(C, endpoint, body) {
  const r = await fetch(`${SEPAL}/api/${C.sandbox ? "sandbox/" : ""}${endpoint}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: 0, message: "bad response: " + t.slice(0, 200) }; }
}

const saveOrder = (env, o) => env.ORDERS.put("order:" + o.id, JSON.stringify(o));
const getOrder = async (env, id) => {
  const t = await env.ORDERS.get("order:" + id);
  return t ? JSON.parse(t) : null;
};

async function createPayment(request, env) {
  const C = cfg(env);
  if (!env.ORDERS) return json({ error: "ذخیره‌ساز سفارش (KV) به Worker وصل نشده." }, 500);
  if (!C.price) return json({ error: "قیمت هنوز تنظیم نشده، بعداً امتحان کن." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
  const c = (body && body.customer) || {};
  const customer = {
    firstName: String(c.firstName || "").trim().slice(0, 60),
    lastName: String(c.lastName || "").trim().slice(0, 60),
    phone: digits(c.phone || "").trim(),
    address: String(c.address || "").trim().slice(0, 500),
  };
  if (!customer.firstName || !customer.lastName || !customer.address)
    return json({ error: "اسم، فامیلی و آدرس رو کامل بنویس." }, 400);
  if (!/^09\d{9}$/.test(customer.phone)) return json({ error: "شماره موبایل باید شبیه 09123456789 باشه." }, 400);
  const pattern = cleanPattern(body.pattern);
  if (!pattern) return json({ error: "الگو معتبر نیست. دوباره توی استودیو بازش کن." }, 400);

  const priceToman = Math.round(C.base + pattern.total * C.price);
  const order = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    sandbox: C.sandbox,
    priceToman,
    customer,
    pattern,
  };
  await saveOrder(env, order);

  const j = await sepal(C, "request", {
    apiKey: C.key,
    amount: priceToman * 10 /* سپال ریال می‌گیره */,
    callbackUrl: `${C.site}/api/payment-callback`,
    invoiceNumber: order.id.slice(0, 8),
    payerName: `${customer.firstName} ${customer.lastName}`,
    payerMobile: customer.phone,
  });
  if (ok(j) && j.paymentNumber) {
    order.paymentNumber = String(j.paymentNumber);
    await saveOrder(env, order);
    await env.ORDERS.put("pn:" + order.paymentNumber, order.id, { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ paymentUrl: `${SEPAL}${C.sandbox ? "/sandbox/payment" : "/payment"}/${order.paymentNumber}` });
  }
  order.status = "failed";
  order.error = j && j.message;
  await saveOrder(env, order);
  console.error("sepal request failed", JSON.stringify(j), "callback:", `${C.site}/api/payment-callback`);
  return json({ error: "درگاه درخواست رو قبول نکرد، یه کم بعد دوباره امتحان کن." }, 502);
}

async function paymentCallback(request, env, url) {
  const C = cfg(env);
  const back = (result, order) =>
    Response.redirect(`${C.site}/checkout.html?result=${result}${order ? "&order=" + order.id : ""}`, 302);
  try {
    let body = {};
    if (request.method === "POST") {
      const raw = await request.text();
      try { body = raw.trim().startsWith("{") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)); } catch {}
    }
    const pn = String(url.searchParams.get("paymentNumber") || body.paymentNumber || "");
    const id = pn && (await env.ORDERS.get("pn:" + pn));
    const order = id && (await getOrder(env, id));
    if (!order) { console.error("callback without known paymentNumber", url.search, JSON.stringify(body)); return back("failed"); }
    if (order.status === "paid") return back("success", order);

    const v = await sepal(C, "verify", { apiKey: C.key, paymentNumber: order.paymentNumber });
    const fresh = await getOrder(env, id);
    if (fresh && fresh.status === "paid") return back("success", fresh);
    order.verify = v;
    if (ok(v)) {
      order.status = "paid";
      order.paidAt = new Date().toISOString();
      await saveOrder(env, order);
      return back("success", order);
    }
    order.status = "failed";
    await saveOrder(env, order);
    console.error("sepal verify failed", JSON.stringify(v));
    return back(String(body.status) === "0" && !v.status ? "canceled" : "failed", order);
  } catch (e) {
    console.error(e);
    return back("failed");
  }
}

/* مقایسه‌ی رمز بدون لو دادن طول تطابق */
function same(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/* دیدن سفارش‌ها (توکن فقط توی هدر، نه توی آدرس):
   curl -H "Authorization: Bearer ADMIN_TOKEN" https://caraw.ir/api/admin/orders
   و برای الگوی کامل یه سفارش:  .../api/admin/orders?id=<کد کامل سفارش> */
async function admin(request, env, url) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || !same(t, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
  const id = url.searchParams.get("id");
  if (id) { const o = await getOrder(env, id); return o ? json(o) : json({ error: "not found" }, 404); }
  const list = await env.ORDERS.list({ prefix: "order:", limit: 200 });
  const rows = [];
  for (const k of list.keys) {
    const o = JSON.parse((await env.ORDERS.get(k.name)) || "null");
    if (!o || o.status !== "paid") continue;
    rows.push({
      id: o.id, code: o.id.slice(0, 8), paidAt: o.paidAt, sandbox: o.sandbox, priceToman: o.priceToman,
      name: `${o.customer.firstName} ${o.customer.lastName}`, phone: o.customer.phone, address: o.customer.address,
      size: `${o.pattern.width}x${o.pattern.height}`, beads: o.pattern.total, colors: o.pattern.counts,
    });
  }
  rows.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
  return json(rows);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (p === "/api/config" && request.method === "GET") {
        const C = cfg(env);
        return json({ pricePerBead: C.price, baseFee: C.base });
      }
      if (p === "/api/create-payment" && request.method === "POST") return await createPayment(request, env);
      if (p === "/api/payment-callback") return await paymentCallback(request, env, url);
      if (p === "/api/admin/orders") return await admin(request, env, url);
      if (p.startsWith("/api/")) return json({ error: "not found" }, 404);
      return fetch(request); /* هر چیز دیگه‌ای (خود سایت) عادی از GitHub Pages می‌آد */
    } catch (e) {
      console.error(e);
      return json({ error: "یه مشکل پیش اومد، دوباره امتحان کن." }, 500);
    }
  },
};
