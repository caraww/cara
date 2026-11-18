/* lib/digipay.mjs — کیف پول دیجی‌پی (UPG، type=11) برای Worker
   Secrets لازم:  DIGIPAY_CLIENT_ID  DIGIPAY_CLIENT_SECRET  DIGIPAY_USERNAME  DIGIPAY_PASSWORD
   اختیاری:        DIGIPAY_BASE  (برای تست: https://uat.mydigipay.info/digipay/api)
   خروجی digipayVerify هم‌شکل جواب زیبال است تا settle() توی index.js بدون تغییر ازش استفاده کند. */

const DEFAULT_BASE = "https://api.mydigipay.com/digipay/api";
export const WALLET_TYPE = 11;

const base = (env) => String(env.DIGIPAY_BASE || DEFAULT_BASE).trim().replace(/\/+$/, "");
export const digipayConfigured = (env) =>
  !!(env.DIGIPAY_CLIENT_ID && env.DIGIPAY_CLIENT_SECRET && env.DIGIPAY_USERNAME && env.DIGIPAY_PASSWORD);

/* توکن OAuth؛ داخل حافظه‌ی isolate کش می‌شه */
let cache = { v: null, exp: 0 };
async function token(env, force) {
  if (!force && cache.v && Date.now() < cache.exp) return cache.v;
  const r = await fetch(`${base(env)}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.DIGIPAY_CLIENT_ID}:${env.DIGIPAY_CLIENT_SECRET}`),
      
    },
    body: (() => { const form = new FormData(); form.set("username", env.DIGIPAY_USERNAME); form.set("password", env.DIGIPAY_PASSWORD); form.set("grant_type", "password"); return form; })(),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("digipay auth " + r.status);
  cache = { v: j.access_token, exp: Date.now() + Math.max(60, (Number(j.expires_in) || 3600) - 60) * 1000 };
  return cache.v;
}

async function call(env, path, body, retry = true) {
  const t = await token(env, !retry);
  const r = await fetch(`${base(env)}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", Agent: "WEB", "Digipay-Version": "2022-02-02" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (r.status === 401 && retry) { cache = { v: null, exp: 0 }; return call(env, path, body, false); }
  const data = await r.json().catch(() => ({}));
  return { http: r.status, data };
}

const statusOf = (d) => (d && d.result && d.result.status != null ? Number(d.result.status) : null);

/* ساخت تیکت خرید. amountRial: ریال. providerId: شناسه‌ی یکتای سفارش خودمان */
export async function digipayCreateTicket(env, { amountRial, phone, providerId, callbackUrl }) {
  try {
    const { http, data } = await call(env, `/tickets/business?type=${WALLET_TYPE}`, {
      amount: amountRial, cellNumber: phone, providerId, callbackUrl,
    });
    const st = statusOf(data);
    if (http === 200 && st === 0 && data.redirectUrl)
      return { ok: true, redirectUrl: data.redirectUrl, ticket: data.ticket || null };
    console.error("digipay ticket failed", http, JSON.stringify(data).slice(0, 300));
    return { ok: false, message: (data.result && data.result.message) || `status ${http}` };
  } catch (e) {
    console.error("digipay ticket error", String(e).slice(0, 150));
    return { ok: false, message: "network" };
  }
}

/* تأیید پرداخت. result:100 یعنی موفق (هم‌شکل زیبال) */
export async function digipayVerify(env, { trackingCode, providerId, type }) {
  try {
    const paymentType = Number.isInteger(Number(type)) && Number(type) >= 0 ? Number(type) : WALLET_TYPE;
    let last;
    for (let i = 0; i < 3; i++) {
      last = await call(env, `/purchases/verify?type=${paymentType}`, { trackingCode: String(trackingCode), providerId: String(providerId) });
      if (statusOf(last.data) === 9011) { await new Promise((r) => setTimeout(r, 1500)); continue; } /* هنوز آماده نیست؛ دوباره */
      break;
    }
    const { http, data } = last;
    const st = statusOf(data);
    const amount = Number(data.amount);
    if (http === 200 && st === 0 && Number.isSafeInteger(amount) && amount > 0) {
      return {
        result: 100,
        amount, /* ریال؛ مبلغ verify باید حتماً با مبلغ سفارش تطبیق داده شود */
        refNumber: data.rrn || data.trackingCode || trackingCode,
        cardNumber: data.maskedPan || data.cardNumber || null,
      };
    }
    console.error("digipay verify not ok", http, JSON.stringify(data).slice(0, 300));
    return { result: -1, message: (data.result && data.result.message) || `status ${http}`, digipayStatus: st };
  } catch (e) {
    console.error("digipay verify error", String(e).slice(0, 150));
    return { result: -1, message: "network" };
  }
}
