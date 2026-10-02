/* API سایت cara روی Cloudflare Worker (جایگزین server.js).
   مسیرها: /api/config  /api/works  /api/work  /api/create-payment  /api/payment-callback  /api/admin/orders
   تنظیمات (توی داشبورد Cloudflare → Worker → Settings):
     Variables:  PRICE_PER_BEAD=1500   BASE_FEE=150000   BASE_URL=https://caraw.ir
     Secrets:    SEPAL_API_KEY (کلید وب‌سرویس درگاه تأییدشده‌ی سپال؛ اجباریه)
                 ADMIN_TOKEN (یه رمز دلخواه؛ توی هدر Authorization: Bearer فرستاده می‌شه)
     اختیاری:    SEPAL_BASE (پیش‌فرض https://payment.sepal.ir)   CALLBACK_URL
     KV binding: ORDERS  (یه KV namespace بساز و با همین اسم وصلش کن) */

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
  /* اگه کلید از صفحه‌ی راست‌به‌چپ کپی شده باشه ممکنه رقم‌هاش فارسی (۵۸۰) یا کاراکتر نامرئی داشته باشه؛ اینجا درستش می‌کنیم */
  const key = digits(String(env.SEPAL_API_KEY || "")).replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");
  return {
    key,
    sepal: String(env.SEPAL_BASE || "https://payment.sepal.ir").trim().replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://"),
    price: Number(env.PRICE_PER_BEAD) || 0,
    base: Number(env.BASE_FEE) || 0,
    callback: String(env.CALLBACK_URL || "").trim(), /* اختیاری: اگه سپال آدرس بازگشت رو فقط با http:// قبول می‌کنه، اینجا بذار */
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
  const r = await fetch(`${C.sepal}/api/${endpoint}.json`, {
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

/* کارهای گالری: از js/works.js خود سایت خونده می‌شه (فایل خودکار ساخته می‌شه؛ قیمت رو این‌جا کنترل می‌کنیم).
   اگه توی works.js برای یه اثر فیلد price (تومان) باشه همون استفاده می‌شه، وگرنه قیمت خودکار (PRICE_OVERRIDES بالای همین بخش). */
function extractArray(text) {
  const m = text.match(/\bworks\s*=\s*\[/);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, str = null, esc = false;
  for (let j = start; j < text.length; j++) {
    const ch = text[j];
    if (str) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { str = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return text.slice(start, j + 1);
  }
  return null;
}
function parseLoose(src) {
  try { return JSON.parse(src); } catch {}
  const fixed = src
    .replace(/,\s*([\]}])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'([^'\\\n]*)'/g, (_, t) => JSON.stringify(t));
  return JSON.parse(fixed);
}
async function loadWorks(C) {
  try {
    const r = await fetch(`${C.site}/js/works.js`, { cf: { cacheTtl: 60, cacheEverything: true } });
    if (!r.ok) { console.error("works.js status", r.status); return []; }
    const a = extractArray(await r.text());
    const list = a ? parseLoose(a) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("works load failed", String(e));
    return [];
  }
}
const findWork = async (C, id) => (await loadWorks(C)).find((w) => String(w.id) === String(id)) || null;

/* ===== قیمت دستبندها (تومان) =====
   اولویت: ۱) PRICE_OVERRIDES  ۲) ریک و مورتی  ۳) فیلد price توی works.js  ۴) قیمت خودکار غیررند که برای هر دستبند فرق داره
   برای تغییر قیمت یه دستبند، شناسه یا بخشی از عنوانش رو اینجا بنویس، مثلاً:  "هزار چشم": 2987000 */
const PRICE_OVERRIDES = {};
const RICK_MORTY_PRICE = 4000000;
const norm = (s) => String(s || "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s\u200c_-]/g, "").toLowerCase();
const isRickMorty = (w) => /ریک|مورتی|rick|morty/.test(norm([w.title, w.id, w.file, w.src].join("|")));
function fixedPrice(w) {
  const key = norm((w.title || "") + "|" + (w.id || ""));
  for (const [k, v] of Object.entries(PRICE_OVERRIDES)) if (norm(k) && key.includes(norm(k))) return Math.round(Number(v));
  if (isRickMorty(w)) return RICK_MORTY_PRICE;
  return Math.round(Number(w.price)) || 0;
}
/* قیمت خودکار: از شناسه‌ی دستبند ساخته می‌شه، پس همیشه ثابته (بین ۱٬۴۵۰٬۰۰۰ تا ۲٬۹۵۰٬۰۰۰ و غیررند) */
function autoPrice(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let p = Math.round((1450000 + (h % 1500000)) / 1000) * 1000;
  if (p % 5000 === 0) p += 3000;
  return p;
}
function priceMap(list) {
  const out = {}, used = new Set();
  for (const w of list) { const f = fixedPrice(w); if (f) { out[String(w.id)] = f; used.add(f); } }
  for (const w of list) {
    const id = String(w.id);
    if (out[id]) continue;
    let p = autoPrice(id);
    while (used.has(p)) p += 7000; /* دو دستبند هیچ‌وقت قیمت یکسان نمی‌گیرن */
    used.add(p); out[id] = p;
  }
  return out;
}
async function pricedWorks(env) {
  const list = await loadWorks(cfg(env));
  return { list, prices: priceMap(list) };
}

/* قیمت همه‌ی کارها برای نمایش توی گالری (فقط نمایشه؛ مبلغ پرداخت همیشه دوباره سمت سرور حساب می‌شه) */
async function worksInfo(env) {
  const { list, prices } = await pricedWorks(env);
  return json(list.map((w) => ({ id: String(w.id), title: w.title || "", price: prices[String(w.id)] })));
}

async function workInfo(env, url) {
  const { list, prices } = await pricedWorks(env);
  const w = list.find((x) => String(x.id) === String(url.searchParams.get("id")));
  if (!w) return json({ error: "not found" }, 404);
  return json({ id: String(w.id), title: w.title || "", src: w.src, price: prices[String(w.id)] });
}

async function createPayment(request, env) {
  const C = cfg(env);
  if (!env.ORDERS) return json({ error: "ذخیره‌ساز سفارش (KV) به Worker وصل نشده." }, 500);
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

  let priceToman, extra;
  if (body.workId != null && body.workId !== "") {
    /* سفارش مستقیم از گالری؛ قیمت همیشه سمت سرور تعیین می‌شه */
    const { list, prices } = await pricedWorks(env);
    const work = list.find((x) => String(x.id) === String(body.workId));
    if (!work) return json({ error: "این دستبند پیدا نشد؛ از گالری دوباره انتخابش کن." }, 404);
    priceToman = prices[String(work.id)];
    extra = { kind: "work", work: { id: String(work.id), title: work.title || "", src: work.src } };
  } else {
    if (!C.price) return json({ error: "قیمت هنوز تنظیم نشده، بعداً امتحان کن." }, 503);
    const pattern = cleanPattern(body.pattern);
    if (!pattern) return json({ error: "الگو معتبر نیست. دوباره توی استودیو بازش کن." }, 400);
    priceToman = Math.round(C.base + pattern.total * C.price);
    extra = { kind: "pattern", pattern };
  }

  if (!C.key) return json({ error: "کلید درگاه (SEPAL_API_KEY) روی Worker تنظیم نشده." }, 503);
  if (!(priceToman * 10 >= 100000)) return json({ error: "مبلغ کمتر از حداقل مجاز درگاه (۱۰٬۰۰۰ تومان) است." }, 400);

  const order = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    priceToman,
    customer,
    ...extra,
  };
  await saveOrder(env, order);

  const j = await sepal(C, "request", {
    apiKey: C.key,
    amount: priceToman * 10 /* سپال ریال می‌گیره */,
    callbackUrl: C.callback || `${C.site}/api/payment-callback`,
    invoiceNumber: order.id.slice(0, 8),
    payerName: `${customer.firstName} ${customer.lastName}`,
    payerMobile: customer.phone,
  });
  if (ok(j) && j.paymentNumber) {
    order.paymentNumber = String(j.paymentNumber);
    await saveOrder(env, order);
    await env.ORDERS.put("pn:" + order.paymentNumber, order.id, { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ paymentUrl: `${C.sepal}/api/payment/${order.paymentNumber}/` });
  }
  order.status = "failed";
  order.error = j && j.message;
  await saveOrder(env, order);
  console.error("sepal request failed", JSON.stringify(j), "callback:", C.callback || `${C.site}/api/payment-callback`);
  return json({ error: "درگاه درخواست رو قبول نکرد، یه کم بعد دوباره امتحان کن." + (j && typeof j.message === "string" && j.message ? " (" + j.message.slice(0, 120) + ")" : "") }, 502);
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
   و برای جزئیات کامل یه سفارش:  .../api/admin/orders?id=<کد کامل سفارش> */
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
    const pt = o.pattern; /* سفارش‌های گالری الگو ندارن */
    rows.push({
      id: o.id, code: o.id.slice(0, 8), paidAt: o.paidAt, sandbox: o.sandbox, priceToman: o.priceToman,
      name: `${o.customer.firstName} ${o.customer.lastName}`, phone: o.customer.phone, address: o.customer.address,
      kind: o.kind || "pattern", work: o.work || null,
      size: pt ? `${pt.width}x${pt.height}` : "", beads: pt ? pt.total : 0, colors: pt ? pt.counts : null,
    });
  }
  rows.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
  return json(rows);
}

/* عیب‌یابی (فقط با ADMIN_TOKEN):
   curl -H "Authorization: Bearer ADMIN_TOKEN" "https://caraw.ir/api/admin/debug"
   با ?sepal=1 یه درخواست آزمایشی به سپال هم می‌فرسته و جواب خامش رو نشون می‌ده */
async function debug(request, env, url) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || !same(t, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
  const C = cfg(env);
  const rawKey = String(env.SEPAL_API_KEY || "");
  const out = { sepalBase: C.sepal, hasSepalKey: !!rawKey, key: { length: rawKey.length, trimmedLength: rawKey.trim().length, masked: rawKey.trim().slice(0, 2) + "…" + rawKey.trim().slice(-2) }, kv: !!env.ORDERS, site: C.site,
    pricePerBead: C.price, baseFee: C.base, callback: C.callback || `${C.site}/api/payment-callback` };
  try {
    const r = await fetch(`${C.site}/js/works.js`);
    const txt = await r.text();
    out.works = { status: r.status, finalUrl: r.url, redirected: r.redirected, length: txt.length, head: txt.slice(0, 160), tail: txt.slice(-120) };
    try { const a = extractArray(txt); out.works.arrayFound = !!a; out.works.count = a ? parseLoose(a).length : 0; }
    catch (e) { out.works.parseError = String(e).slice(0, 200); }
  } catch (e) { out.works = { error: String(e) }; }
  if (url.searchParams.get("sepal"))
    out.sepal = await sepal(C, "request", { apiKey: C.key, amount: 100000 /* حداقل مجاز سپال: ۱۰۰٬۰۰۰ ریال */, callbackUrl: out.callback,
      invoiceNumber: "debug", payerName: "test", payerMobile: "09123456789" });
  return json(out);
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
      if (p === "/api/works" && request.method === "GET") return await worksInfo(env);
      if (p === "/api/work" && request.method === "GET") return await workInfo(env, url);
      if (p === "/api/create-payment" && request.method === "POST") return await createPayment(request, env);
      if (p === "/api/payment-callback") return await paymentCallback(request, env, url);
      if (p === "/api/admin/debug") return await debug(request, env, url);
      if (p === "/api/admin/orders") return await admin(request, env, url);
      if (p.startsWith("/api/")) return json({ error: "not found" }, 404);
      /* مسیر غیر از /api: فقط روی دامنه‌ی خود سایت (routeهای caraw.ir/api/*) به GitHub Pages پاس داده می‌شه.
         روی ساب‌دامین api.caraw.ir مبدأیی وجود نداره و پاس دادن همون خطای ۵۲۲ می‌شد. */
      const siteHost = new URL(cfg(env).site).hostname;
      if (url.hostname === siteHost || url.hostname === "www." + siteHost) return fetch(request);
      return json({ error: "not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "یه مشکل پیش اومد، دوباره امتحان کن." }, 500);
    }
  },
};
