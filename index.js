import { handleGame, checkCode, reserveCode, releaseCode, useCode, DISCOUNT } from "./game-worker.js";

/* API سایت cara روی Cloudflare Worker: پرداخت با زیبال (zibal.ir) + ثبت و مدیریت سفارش‌ها.
   مسیرها: /api/config  /api/works  /api/work  /api/create-payment  /api/payment-callback  /api/admin/orders  /api/admin/debug
   تنظیمات (داشبورد Cloudflare → Worker → Settings، یا  npx wrangler secret put <اسم>):
     Variables (توی wrangler.jsonc):  PRICE_PER_BEAD   BASE_FEE   BASE_URL
     Secrets:    ZIBAL_MERCHANT  (کد merchant درگاه زیبال؛ برای تست بنویس zibal)
                 ADMIN_TOKEN     (یه رمز دلخواه برای صفحه‌ی admin.html)
                 TELEGRAM_BOT_TOKEN  و  TELEGRAM_CHAT_ID  (اعلان سفارش جدید توی تلگرام؛ اختیاری)
     اختیاری:    CALLBACK_URL    (پیش‌فرض: BASE_URL/api/payment-callback)
                 ZIBAL_BASE + ZIBAL_RELAY_KEY  (فقط اگه زیبال آی‌پی ثابت می‌خواد؛ zibal-relay.js رو ببین)
     KV binding: ORDERS */

/* کدهای معتبر منجوق؛ باید با js/palette.js یکی باشه. بعد از هر تغییر توی palette.js این رو بزن:  node tools/sync-valid.js <مسیر این فایل> */
/* SYNC:START (خودکار؛ دستی ویرایش نکن: node tools/sync-valid.js) */
const VALID = new Set([
  "FGB0370", "DB0010", "DB0654", "DB0757", "DB2103", "DB0310", "DB0732", "DB0726", "DB0727", "DB0157",
  "DB1498", "DB0725", "DB0321", "DB0721", "DB2359", "DB0756", "DB1133", "DB0724", "DB0774", "DB1134",
  "DB2109", "DB0351", "DB0200", "DB2264", "DB0785", "DB0628", "DB0766", "DB1832", "DB1582", "DB0680",
  "DB1268", "DB2116", "DB0389",
]);
/* SYNC:END */
const LIM = { MAX_W: 40, MAX_H: 200 };
const GATEWAY = "https://gateway.zibal.ir"; /* صفحه‌ی پرداخت: مرورگر مشتری می‌ره این‌جا */
const FULFIL = ["new", "weaving", "shipped"]; /* جدید / در حال بافت / ارسال شد */

const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const digits = (s) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
/* کد کپی‌شده از صفحه‌ی راست‌به‌چپ ممکنه رقم فارسی یا کاراکتر نامرئی داشته باشه؛ اینجا درستش می‌کنیم */
const clean = (s) => digits(String(s || "")).replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");

function cfg(env) {
  const merchant = clean(env.ZIBAL_MERCHANT);
  return {
    merchant,
    sandbox: merchant === "zibal", /* کد آزمایشی زیبال */
    api: String(env.ZIBAL_BASE || GATEWAY).trim().replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://"),
    relayKey: String(env.ZIBAL_RELAY_KEY || "").trim(),
    price: Number(env.PRICE_PER_BEAD) || 0,
    base: Number(env.BASE_FEE) || 0,
    callback: String(env.CALLBACK_URL || "").trim(),
    site: (env.BASE_URL || "https://caraw.ir").replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://"),
  };
}
const callbackOf = (C) => C.callback || `${C.site}/api/payment-callback`;

/* درخواست به API زیبال (merchant خودکار اضافه می‌شه). همیشه یه آبجکت برمی‌گردونه؛ result === 100 یعنی موفق */
async function zibal(C, endpoint, body) {
  try {
    const r = await fetch(`${C.api}/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; cara-shop/1.0; +https://caraw.ir)",
        ...(C.relayKey ? { "X-Relay-Key": C.relayKey } : {}),
      },
      body: JSON.stringify({ merchant: C.merchant, ...body }),
      signal: AbortSignal.timeout(15000),
    });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { result: -1, message: `bad response (${r.status}): ` + t.slice(0, 200) }; }
  } catch (e) {
    return { result: -1, message: "network: " + String(e).slice(0, 150) };
  }
}

const saveOrder = (env, o) => env.ORDERS.put("order:" + o.id, JSON.stringify(o));
const removeOrder = async (env, o) => {
  await env.ORDERS.delete("order:" + o.id);
  if (o.trackId) await env.ORDERS.delete("pn:" + o.trackId);
};
const getOrder = async (env, id) => {
  const t = await env.ORDERS.get("order:" + id);
  return t ? JSON.parse(t) : null;
};

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
/* محصول آزمایشی ۵٬۰۰۰ تومانی: فقط وقتی TEST_MODE="1" باشه وجود داره و توی گالری نمایش داده نمی‌شه (فقط با لینک مستقیم قابل سفارشه) */
const TEST_WORK = { id: "cara-test-5000", title: "تست پرداخت", src: "img/cara-favicon.png", price: 5000 };
async function pricedWorks(env) {
  const list = await loadWorks(cfg(env));
  if (String(env.TEST_MODE) === "1") list.push({ ...TEST_WORK });
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

  /* کد تخفیف بازی (۱۰٪)؛ قیمت نهایی همیشه سمت سرور حساب می‌شه */
  let dc = null;
  if (body.discountCode) {
    dc = await checkCode(env, body.discountCode);
    if (!dc) return json({ error: "کد تخفیف نامعتبر یا قبلاً استفاده شده." }, 400);
    priceToman = Math.round(priceToman * (1 - DISCOUNT));
  }

  if (!C.merchant) return json({ error: "کد درگاه (ZIBAL_MERCHANT) روی Worker تنظیم نشده." }, 503);
  if (!(priceToman * 10 >= 10000)) return json({ error: "مبلغ کمتر از حداقل مجاز درگاه است." }, 400);

  const order = {
    id: crypto.randomUUID(),
    status: "pending",
    fulfillment: "new",
    createdAt: new Date().toISOString(),
    sandbox: C.sandbox || !!(extra.work && extra.work.id === TEST_WORK.id),
    provider: "zibal",
    priceToman,
    customer,
    ...(dc ? { discountCode: dc } : {}),
    ...extra,
  };
  await saveOrder(env, order);
  if (dc) await reserveCode(env, dc, order.id);

  const j = await zibal(C, "request", {
    amount: priceToman * 10 /* زیبال ریال می‌گیره */,
    callbackUrl: callbackOf(C),
    orderId: order.id,
    mobile: customer.phone,
    description: `سفارش cara ${order.id.slice(0, 8)}`,
  });
  if (j && j.result === 100 && j.trackId) {
    order.trackId = String(j.trackId);
    await saveOrder(env, order);
    await env.ORDERS.put("pn:" + order.trackId, order.id, { expirationTtl: 60 * 60 * 24 * 60 });
    return json({ paymentUrl: `${GATEWAY}/start/${order.trackId}` });
  }
  order.status = "failed";
  order.error = j && (j.message || String(j.result));
  await saveOrder(env, order);
  if (dc) await releaseCode(env, dc, order.id);
  console.error("zibal request failed", JSON.stringify(j), "callback:", callbackOf(C));
  const why = j && (j.message || j.result != null) ? " (" + String(j.message || "کد " + j.result).slice(0, 120) + ")" : "";
  return json({ error: "درگاه درخواست رو قبول نکرد، یه کم بعد دوباره امتحان کن." + why }, 502);
}

/* تأیید پرداخت با زیبال. هم از بازگشت مشتری از درگاه صدا زده می‌شه، هم از دکمه‌ی «بررسی وضعیت» توی admin.html.
   markFailed=false یعنی اگه پرداخت پیدا نشد، وضعیت سفارش رو خراب نکن. */
async function settle(C, env, order, markFailed, ctx) {
  const later = (p) => (ctx ? ctx.waitUntil(p) : p); /* اعلان نباید مشتری رو معطل کنه */
  const v = await zibal(C, "verify", { trackId: Number(order.trackId) });
  const fresh = await getOrder(env, order.id);
  if (fresh && fresh.status === "paid") return fresh; /* کال‌بک هم‌زمان قبلاً تأییدش کرده */
  order.verify = v;
  const paid = v && (v.result === 100 || v.result === 201); /* ۲۰۱ = قبلاً تأیید شده */
  const rial = order.priceToman * 10;
  if (paid && v.amount != null && Number(v.amount) !== rial) {
    order.status = "review"; /* پول گرفته شده ولی مبلغ با سفارش نمی‌خونه؛ دستی بررسی کن */
    order.error = `amount mismatch: ${v.amount} != ${rial}`;
    await saveOrder(env, order);
    console.error("zibal amount mismatch", order.id, v.amount, rial);
    await later(telegram(env, `⚠️ پرداخت با مبلغ نامطابق، نیاز به بررسی دستی\n#${order.id.slice(0, 8)}\nمبلغ سفارش: ${rial} ریال، مبلغ دریافتی: ${v.amount} ریال\n${C.site}/admin.html`));
    return order;
  }
  if (paid) {
    order.status = "paid";
    order.paidAt = new Date().toISOString();
    order.refNumber = v.refNumber != null ? String(v.refNumber) : null;
    order.cardNumber = v.cardNumber || null;
    await saveOrder(env, order);
    if (order.discountCode) await useCode(env, order.discountCode, order.id);
    await later(notifyPaid(C, env, order));
    return order;
  }
  if (markFailed) order.status = "failed";
  await saveOrder(env, order);
  if (markFailed && order.discountCode) await releaseCode(env, order.discountCode, order.id);
  console.error("zibal verify not paid", JSON.stringify(v));
  return order;
}

/* زیبال مشتری رو با GET برمی‌گردونه این‌جا: ?success=1&status=2&trackId=...&orderId=... */
async function paymentCallback(request, env, url, ctx) {
  const C = cfg(env);
  const back = (result, order) =>
    Response.redirect(`${C.site}/checkout.html?result=${result}${order ? "&order=" + order.id : ""}`, 302);
  try {
    let body = {};
    if (request.method === "POST") {
      const raw = await request.text();
      try { body = raw.trim().startsWith("{") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)); } catch {}
    }
    const g = (k) => String(url.searchParams.get(k) || body[k] || "");
    const trackId = g("trackId"), orderId = g("orderId"), success = g("success"), status = g("status");
    let id = trackId && (await env.ORDERS.get("pn:" + trackId));
    if (!id && /^[0-9a-f-]{36}$/i.test(orderId)) id = orderId;
    const order = id && (await getOrder(env, id));
    if (!order) { console.error("callback for unknown order", url.search, JSON.stringify(body)); return back("failed"); }
    if (trackId && order.trackId && trackId !== order.trackId) { console.error("callback trackId mismatch", url.search); return back("failed"); }
    if (order.status === "paid") return back("success", order);

    if (success !== "1") { /* لغو یا ناموفق توی درگاه؛ نیازی به verify نیست */
      order.status = "failed";
      order.cancelStatus = status;
      await saveOrder(env, order);
      if (order.discountCode) await releaseCode(env, order.discountCode, order.id);
      return back(status === "3" ? "canceled" : "failed", order);
    }
    const o = await settle(C, env, order, true, ctx);
    return back(o.status === "paid" ? "success" : "failed", o);
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

const authed = (request, env) => {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return !!env.ADMIN_TOKEN && same(t, env.ADMIN_TOKEN);
};

async function allOrders(env) {
  const keys = [];
  let cursor;
  do {
    const l = await env.ORDERS.list({ prefix: "order:", cursor });
    keys.push(...l.keys);
    cursor = l.list_complete ? undefined : l.cursor;
  } while (cursor && keys.length < 2000);
  const out = [];
  for (let i = 0; i < keys.length; i += 25) {
    const part = await Promise.all(keys.slice(i, i + 25).map((k) => env.ORDERS.get(k.name)));
    for (const t of part) { try { const o = JSON.parse(t); if (o && o.id) out.push(o); } catch {} }
  }
  return out;
}

/* خلاصه‌ی یه سفارش برای لیست (الگوی کامل فقط توی ?id= می‌آد) */
function row(o) {
  const pt = o.pattern;
  return {
    id: o.id, code: o.id.slice(0, 8), status: o.status, fulfillment: o.fulfillment || "new",
    createdAt: o.createdAt, paidAt: o.paidAt || null, sandbox: !!o.sandbox, priceToman: o.priceToman,
    name: `${o.customer.firstName} ${o.customer.lastName}`, phone: o.customer.phone, address: o.customer.address,
    kind: o.kind || "pattern", work: o.work || null,
    size: pt ? `${pt.width}x${pt.height}` : "", beads: pt ? pt.total : 0, colors: pt ? pt.counts : null,
    tracking: o.tracking || "", note: o.note || "",
    trackId: o.trackId || null, refNumber: o.refNumber || null, cardNumber: o.cardNumber || null, error: o.error || null,
  };
}

/* ===== اعلان تلگرام ===== */
const tgEsc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
async function telegram(env, text) {
  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim(), chat = String(env.TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chat) return { ok: false, description: "TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID تنظیم نشده" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error("telegram failed", r.status, JSON.stringify(j));
    return { ok: !!j.ok, description: j.description || "" };
  } catch (e) {
    console.error("telegram error", String(e).slice(0, 150));
    return { ok: false, description: String(e).slice(0, 150) };
  }
}
function orderText(C, o) {
  const c = o.customer || {}, pt = o.pattern;
  const what = o.kind === "work" ? `دستبند گالری: ${tgEsc(o.work && (o.work.title || o.work.id))}` : pt ? `الگوی دلخواه ${pt.width}×${pt.height} · ${pt.total} منجوق` : "";
  return [
    `${o.sandbox ? "🧪 سفارش آزمایشی" : "🛍 سفارش جدید (پرداخت شد)"} #${o.id.slice(0, 8)}`,
    `💰 ${Number(o.priceToman).toLocaleString("fa-IR")} تومان`,
    what,
    `👤 ${tgEsc(c.firstName)} ${tgEsc(c.lastName)}`,
    `📞 ${tgEsc(c.phone)}`,
    `📍 ${tgEsc(c.address)}`,
    o.refNumber ? `🧾 مرجع بانکی: ${tgEsc(o.refNumber)}` : "",
    `${C.site}/admin.html`,
  ].filter(Boolean).join("\n");
}
async function notifyPaid(C, env, o) {
  if (o.notified) return;
  const r = await telegram(env, orderText(C, o));
  if (r.ok) { const f = await getOrder(env, o.id); if (f) { f.notified = true; await saveOrder(env, f); } }
}

/* دیدن و مدیریت سفارش‌ها (توکن فقط توی هدر Authorization: Bearer ...). صفحه‌ی admin.html همین رو صدا می‌زنه.
   GET  /api/admin/orders              → سفارش‌های پرداخت‌شده (با ?status=all همه‌ی سفارش‌ها)
   GET  /api/admin/orders?id=<کد کامل> → جزئیات کامل یه سفارش (با الگو)
   POST /api/admin/orders {id, fulfillment:"new|weaving|shipped"}  → تغییر وضعیت ارسال
   POST /api/admin/orders {id, action:"recheck"}                   → دوباره از زیبال بپرس پرداخت شده یا نه
   POST /api/admin/orders {id, action:"delete", confirm}           → حذف یه سفارش (برای پرداخت‌شده‌ی واقعی confirm = ۸ حرف اول کد سفارش)
   POST /api/admin/orders {action:"purge", scope:"sandbox|unpaid"} → حذف گروهی آزمایشی‌ها / ناموفق‌های قدیمی
   POST /api/admin/orders {id, tracking, note}                     → کد رهگیری پست و یادداشت */
async function admin(request, env, url, ctx) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  if (!env.ORDERS) return json({ error: "KV وصل نیست." }, 500);
  if (request.method === "POST") {
    let b;
    try { b = await request.json(); } catch { return json({ error: "bad request" }, 400); }
    /* پاک‌سازی گروهی: scope = "sandbox" (آزمایشی‌ها) یا "unpaid" (ناموفق/در انتظارِ قدیمی‌تر از ۲ ساعت) */
    if (b.action === "purge") {
      const scope = String(b.scope || "");
      const cutoff = Date.now() - 2 * 3600 * 1000;
      let n = 0;
      for (const x of await allOrders(env)) {
        const hit = scope === "sandbox" ? !!x.sandbox
          : scope === "unpaid" ? (x.status === "pending" || x.status === "failed") && Date.parse(x.createdAt) < cutoff
          : false;
        if (hit) { await removeOrder(env, x); n++; }
      }
      return json({ deleted: n });
    }
    const o = await getOrder(env, String(b.id || ""));
    if (!o) return json({ error: "not found" }, 404);
    if (b.action === "delete") {
      const real = (o.status === "paid" || o.status === "review") && !o.sandbox;
      if (real && String(b.confirm || "") !== o.id.slice(0, 8))
        return json({ error: "برای حذف سفارش پرداخت‌شده باید کد سفارش رو تایپ کنی." }, 400);
      await removeOrder(env, o);
      return json({ deleted: 1, id: o.id });
    }
    if (b.action === "recheck") {
      if (o.status === "paid") return json(row(o));
      if (!o.trackId) return json({ error: "این سفارش شماره‌ی پیگیری درگاه نداره (درخواست پرداختش ساخته نشده)." }, 400);
      return json(row(await settle(cfg(env), env, o, false, ctx)));
    }
    if (typeof b.tracking === "string" || typeof b.note === "string") {
      if (typeof b.tracking === "string") o.tracking = b.tracking.trim().slice(0, 60); /* کد رهگیری پست */
      if (typeof b.note === "string") o.note = b.note.trim().slice(0, 500); /* یادداشت داخلی */
      await saveOrder(env, o);
    }
    if (FULFIL.includes(b.fulfillment)) { o.fulfillment = b.fulfillment; await saveOrder(env, o); }
    return json(row(o));
  }
  const id = url.searchParams.get("id");
  if (id) { const o = await getOrder(env, id); return o ? json({ ...o, fulfillment: o.fulfillment || "new" }) : json({ error: "not found" }, 404); }
  const all = url.searchParams.get("status") === "all";
  const rows = (await allOrders(env))
    .filter((o) => all || o.status === "paid" || o.status === "review")
    .map(row);
  rows.sort((a, b) => String(b.paidAt || b.createdAt).localeCompare(String(a.paidAt || a.createdAt)));
  return json(rows);
}

/* عیب‌یابی (فقط با ADMIN_TOKEN):
   curl.exe -H "Authorization: Bearer ADMIN_TOKEN" "https://caraw.ir/api/admin/debug?zibal=1"
   با ?zibal=1 یه درخواست آزمایشی ۱۰٬۰۰۰ ریالی به زیبال می‌فرسته و جواب خامش رو نشون می‌ده (فقط یه تراکنش در انتظار می‌سازه) */
async function debug(request, env, url) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  const C = cfg(env), raw = String(env.ZIBAL_MERCHANT || "");
  const out = { sandbox: C.sandbox, hasMerchant: !!C.merchant, merchant: { length: raw.length, cleanLength: C.merchant.length, masked: C.merchant.slice(0, 2) + "…" + C.merchant.slice(-2) },
    telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID), api: C.api, viaRelay: !!C.relayKey, kv: !!env.ORDERS, site: C.site, pricePerBead: C.price, baseFee: C.base, callback: callbackOf(C) };
  try {
    const r = await fetch(`${C.site}/js/works.js`);
    const txt = await r.text();
    out.works = { status: r.status, length: txt.length, head: txt.slice(0, 120) };
    try { const a = extractArray(txt); out.works.arrayFound = !!a; out.works.count = a ? parseLoose(a).length : 0; }
    catch (e) { out.works.parseError = String(e).slice(0, 200); }
  } catch (e) { out.works = { error: String(e) }; }
  if (url.searchParams.get("zibal"))
    out.zibal = await zibal(C, "request", { amount: 10000, callbackUrl: callbackOf(C), orderId: "debug-" + Date.now(), description: "debug" });
  if (url.searchParams.get("telegram")) out.telegramTest = await telegram(env, "✅ اتصال تلگرام cara برقراره");
  return json(out);
}

export default {
  async fetch(request, env, ctx) {
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
      if (p === "/api/payment-callback") return await paymentCallback(request, env, url, ctx);
      if (p === "/api/admin/debug") return await debug(request, env, url);
      if (p === "/api/admin/orders") return await admin(request, env, url, ctx);
      const gameRes = await handleGame(request, env, url);
      if (gameRes) return gameRes;
      if (p.startsWith("/api/")) return json({ error: "not found" }, 404);
      /* مسیر غیر از /api: فقط روی دامنه‌ی خود سایت به GitHub Pages پاس داده می‌شه (روی api.caraw.ir مبدأیی نیست و ۵۲۲ می‌شد) */
      const siteHost = new URL(cfg(env).site).hostname;
      if (url.hostname === siteHost || url.hostname === "www." + siteHost) return fetch(request);
      return json({ error: "not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "یه مشکل پیش اومد، دوباره امتحان کن." }, 500);
    }
  },
};
