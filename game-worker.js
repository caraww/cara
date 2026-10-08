/* بازی «منجوق متفاوت» + کد تخفیف یک‌بار مصرف، برای Worker (کنار index.js).
   وضعیت بازی توی توکن امضاشده‌ست (بدون KV در هر کلیک)؛ فقط کدها توی KV (ORDERS) با پیشوند code: ذخیره می‌شن.
   Secret لازم:  npx wrangler secret put GAME_SECRET   (اگه نباشه از ADMIN_TOKEN استفاده می‌شه)
   Variable اختیاری:  GAME_GOAL (حداقل امتیاز برای کد، پیش‌فرض ۱۲) */

const TOTAL_MS = 60000, PENALTY_MS = 3000, BONUS_MS = 1000, MIN_GAP_MS = 300, RESERVE_MS = 20 * 60 * 1000;
export const DISCOUNT = 0.1;
const enc = new TextEncoder();
const json = (o, c = 200) => new Response(JSON.stringify(o), { status: c, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const goalOf = (env) => Number(env.GAME_GOAL) || 12;
const secretOf = (env) => String(env.GAME_SECRET || env.ADMIN_TOKEN || "");
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));

async function hmac(env, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secretOf(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
const sign = async (env, st) => { const p = b64(enc.encode(JSON.stringify(st))); return p + "." + b64(await hmac(env, p)); };
const safeEq = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function open(env, tok) {
  const [p, s] = String(tok || "").split(".");
  if (!p || !s || !safeEq(b64(await hmac(env, p)), s)) return null;
  try { return unb64(p); } catch { return null; }
}

/* سختی: شبکه بزرگ‌تر می‌شه، اختلاف رنگ کم می‌شه و از راند ۵ به بعد بقیه‌ی منجوق‌ها هم کمی نوسان رنگ دارن */
const sizeOf = (r) => Math.min(7, 2 + Math.floor((r + 1) / 2));
/* اختلاف روشنایی توی OKLCH (برای چشم یکنواخته، پس روی همه‌ی رنگ‌ها یه‌اندازه دیده می‌شه). حداقلش ۰٫۰۴۵ که هنوز تشخیص‌دادنیه */
const deltaOf = (r) => 0.045 + 0.085 * Math.exp(-r / 6);
/* جای منجوق متفاوت از روی راز سرور حساب می‌شه، پس توی توکن نیست */
async function oddIndex(env, st) {
  const n = sizeOf(st.r);
  return new DataView(await hmac(env, `odd:${st.i}:${st.r}`)).getUint32(0) % (n * n);
}
async function makeRound(env, st) {
  const size = sizeOf(st.r), d = deltaOf(st.r), C = 0.13;
  const hue = Math.random() * 360, L = 0.58 + Math.random() * 0.17, dir = L > 0.665 ? -1 : 1;
  const oddIdx = await oddIndex(env, st);
  const base = `oklch(${L.toFixed(3)} ${C} ${hue.toFixed(1)})`;
  const odd = `oklch(${(L + dir * d).toFixed(3)} ${(C + dir * d * 0.4).toFixed(3)} ${((hue + d * 60) % 360).toFixed(1)})`;
  const cells = Array.from({ length: size * size }, (_, i) => (i === oddIdx ? odd : base));
  return { size, cells, round: st.r, score: st.c, goal: goalOf(env), token: await sign(env, st) };
}

/* ===== ضدتقلب: هر توکن فقط یک بار قابل‌مصرفه =====
   بدون این، می‌شد با یه توکن قدیمی همه‌ی خونه‌ها رو یکی‌یکی امتحان کرد و جریمه‌ی ۳ ثانیه‌ای رو دور زد.
   اگه binding با اسم GAME نباشه، مثل قبل بدون این محافظت کار می‌کنه (WRANGLER-SNIPPET.txt). */
async function consume(env, st) {
  if (!env.GAME) return true;
  try {
    const stub = env.GAME.get(env.GAME.idFromName(String(st.i)));
    const r = await stub.fetch("https://game/consume?n=" + ((st.n | 0)));
    return r.ok;
  } catch { return true; } /* خرابی DO نباید بازی رو بخوابونه */
}
export class GameDO {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const n = Number(new URL(req.url).searchParams.get("n")) | 0;
    const cur = (await this.state.storage.get("n")) || 0;
    if (n !== cur) return new Response("stale", { status: 409 });
    await this.state.storage.put("n", cur + 1);
    await this.state.storage.setAlarm(Date.now() + 40 * 60 * 1000); /* بعد از ۴۰ دقیقه پاک می‌شه */
    return new Response("ok");
  }
  async alarm() { await this.state.storage.deleteAll(); }
}

/* ===== کد تخفیف ===== */
const faDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const norm = (c) => faDigits(c || "").replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").toUpperCase();
const getRec = async (env, code) => { const t = await env.ORDERS.get("code:" + code); try { return t ? JSON.parse(t) : null; } catch { return null; } };
const putRec = (env, code, r) => env.ORDERS.put("code:" + code, JSON.stringify(r));

export async function checkCode(env, raw) { /* کد معتبر و آزاد؟ نرمال‌شده‌ش رو برمی‌گردونه */
  const code = norm(raw);
  if (!/^CARA-[0-9A-F]{8}$/.test(code)) return null;
  const r = await getRec(env, code);
  if (!r || r.usedBy) return null;
  if (r.reservedBy && Date.now() - r.reservedAt < RESERVE_MS) return null;
  return code;
}
export async function reserveCode(env, code, orderId) { const r = await getRec(env, code); if (r) { r.reservedBy = orderId; r.reservedAt = Date.now(); await putRec(env, code, r); } }
export async function releaseCode(env, code, orderId) { const r = await getRec(env, code); if (r && !r.usedBy && (!orderId || r.reservedBy === orderId)) { r.reservedBy = null; r.reservedAt = 0; await putRec(env, code, r); } }
export async function useCode(env, code, orderId) { const r = await getRec(env, code); if (r) { r.usedBy = orderId; r.usedAt = Date.now(); await putRec(env, code, r); } }

async function finish(env, request, st) {
  const out = { over: true, score: st.c, goal: goalOf(env), percent: DISCOUNT * 100 };
  if (st.c >= out.goal) {
    const prev = await env.ORDERS.get("gdone:" + st.i); /* همین بازی قبلاً تموم شده؟ همون کد قبلی (اگه جواب اولی گم شده بود) */
    if (prev && prev !== "1") { out.code = prev; return json(out); }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if ((await env.ORDERS.get("gdone:" + st.i)) || (await env.ORDERS.get("gip:" + ip))) out.limited = true; /* هر بازی یک کد، هر IP روزی یک کد */
    else {
      const code = "CARA-" + [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      await putRec(env, code, { createdAt: Date.now(), reservedBy: null, reservedAt: 0, usedBy: null });
      await env.ORDERS.put("gdone:" + st.i, code, { expirationTtl: 3600 });
      await env.ORDERS.put("gip:" + ip, "1", { expirationTtl: 86400 });
      out.code = code;
    }
  }
  return json(out);
}

/* در index.js: const g = await handleGame(request, env, url); if (g) return g; */
export async function handleGame(request, env, url) {
  const p = url.pathname;
  if (!p.startsWith("/api/game/")) return null;
  if (!secretOf(env)) return json({ error: "بازی روی سرور تنظیم نشده (GAME_SECRET)." }, 503);
  if (p === "/api/game/config" && request.method === "GET") return json({ goal: goalOf(env), percent: DISCOUNT * 100 });
  if (p === "/api/game/code" && request.method === "GET") return json({ valid: !!(await checkCode(env, url.searchParams.get("c"))) });
  if (request.method !== "POST") return json({ error: "not found" }, 404);

  if (p === "/api/game/start") {
    const st = { i: crypto.randomUUID(), r: 1, c: 0, d: Date.now() + TOTAL_MS, t: 0, n: 0 };
    return json({ remainingMs: TOTAL_MS, ...(await makeRound(env, st)) });
  }
  if (p === "/api/game/answer") {
    const b = await request.json().catch(() => ({}));
    const st = await open(env, b.token);
    if (!st) return json({ error: "بازی معتبر نیست؛ دوباره شروع کن." }, 400);
    const now = Date.now(), idx = Number(b.idx);
    if (now >= st.d) { /* وقت تموم شده؛ توکن مصرف‌شده هم کد همون بازی رو دوباره می‌گیره، کد جدید نه */
      if (!(await consume(env, st))) { const prev = await env.ORDERS.get("gdone:" + st.i); return json({ over: true, score: st.c, goal: goalOf(env), ...(prev && prev !== "1" ? { code: prev } : {}) }); }
      return finish(env, request, st);
    }
    if (!(idx >= 0) || now - st.t < MIN_GAP_MS) return json({ tooFast: true, token: b.token, remainingMs: st.d - now });
    if (!(await consume(env, st))) return json({ stale: true, error: "این کلیک قبلاً ثبت شده بود." }, 409);
    if (idx === (await oddIndex(env, st))) {
      const next = { ...st, r: st.r + 1, c: st.c + 1, d: st.d + BONUS_MS, t: now, n: (st.n | 0) + 1 };
      return json({ correct: true, remainingMs: next.d - now, ...(await makeRound(env, next)) });
    }
    const wrong = { ...st, d: st.d - PENALTY_MS, t: now, n: (st.n | 0) + 1 };
    if (now >= wrong.d) return finish(env, request, wrong);
    return json({ correct: false, token: await sign(env, wrong), remainingMs: wrong.d - now });
  }
  return json({ error: "not found" }, 404);
}
