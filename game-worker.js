/* بازی «منجوق متفاوت» + کد تخفیف یک‌بار مصرف، برای Worker (کنار index.js).
   وضعیت بازی توی توکن امضاشده‌ست (بدون KV در هر کلیک)؛ کدها توی KV (ORDERS) با پیشوند code: ذخیره می‌شن
   و همه‌ی کارهای «فقط یک بار» (پایان بازی، سهمیه‌ی IP، رزرو و مصرف کد) از طریق Durable Object (binding به اسم GAME) اتمیک انجام می‌شن.
   Secret لازم:  npx wrangler secret put GAME_SECRET   (حداقل ۱۶ کاراکتر، جدا از ADMIN_TOKEN؛ بدونش بازی فقط حالت تمرین داره)
   Variable اختیاری:  GAME_GOAL (حداقل امتیاز برای کد، پیش‌فرض ۱۲) */

import { DurableObject } from "cloudflare:workers";

const TOTAL_MS = 60000, PENALTY_MS = 3000, BONUS_MS = 1000, MIN_GAP_MS = 300, RESERVE_MS = 20 * 60 * 1000;
const GRACE_MS = 2 * 60 * 1000; /* بعد از تموم شدن زمان، توکن بازی فقط این‌قدر معتبره (جلوی استفاده‌ی دوباره از توکن قدیمی) */
export const DISCOUNT = 0.1, DISCOUNT2 = 0.15; /* ۱۰٪ با GAME_GOAL امتیاز، ۱۵٪ با GAME_GOAL2 */
const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; /* کد ۷ روز اعتبار داره */

/* هر شیء (Durable Object) با اسمش یه کار اتمیک انجام می‌ده؛ اسم‌ها:
     st.i        → شماره‌ی آخرین مرحله‌ی یه بازی (هر توکن فقط یک بار قابل استفاده‌ست)
     fin:<بازی>  → هر بازی فقط یک بار می‌تونه کد بگیره
     ip:<آی‌پی>  → هر IP روزی یک کد
     rl:<...>    → محدودیت تعداد درخواست
     code:<کد>   → وضعیت رزرو/مصرف یه کد تخفیف (بدون alarm؛ پاک نمی‌شه) */
export class GameDO extends DurableObject {
  async advance(n) {
    const cur = (await this.ctx.storage.get("n")) || 0;
    if (n !== cur) return false;
    await this.ctx.storage.put("n", cur + 1);
    await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
    return true;
  }
  /* اولین صدا true، بعدش تا ttlMs همیشه false */
  async claim(ttlMs) {
    if (await this.ctx.storage.get("claimed")) return false;
    await this.ctx.storage.put("claimed", 1);
    await this.ctx.storage.setAlarm(Date.now() + ttlMs);
    return true;
  }
  /* حداکثر max درخواست توی هر پنجره‌ی windowMs؛ false یعنی زیاده */
  async hit(max, windowMs) {
    const now = Date.now();
    let s = (await this.ctx.storage.get("rl")) || { t: now, n: 0 };
    if (now - s.t >= windowMs) s = { t: now, n: 0 };
    s.n++;
    await this.ctx.storage.put("rl", s);
    await this.ctx.storage.setAlarm(s.t + windowMs + 1000);
    return s.n <= max;
  }
  async codeAvailable(reserveMs) {
    const s = (await this.ctx.storage.get("code")) || {};
    return !s.usedBy && !(s.reservedBy && Date.now() - s.reservedAt < reserveMs);
  }
  async codeReserve(orderId, reserveMs) {
    const now = Date.now(), s = (await this.ctx.storage.get("code")) || {};
    if (s.usedBy) return false;
    if (s.reservedBy && s.reservedBy !== orderId && now - s.reservedAt < reserveMs) return false;
    await this.ctx.storage.put("code", { ...s, reservedBy: orderId, reservedAt: now });
    return true;
  }
  async codeRelease(orderId) {
    const s = (await this.ctx.storage.get("code")) || {};
    if (s.usedBy || (orderId && s.reservedBy !== orderId)) return;
    await this.ctx.storage.put("code", { ...s, reservedBy: null, reservedAt: 0 });
  }
  async codeUse(orderId) {
    const s = (await this.ctx.storage.get("code")) || {};
    await this.ctx.storage.put("code", { ...s, usedBy: orderId, usedAt: Date.now() });
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}
const stub = (env, name) => env.GAME.get(env.GAME.idFromName(name));
const ipOf = (request) => request.headers.get("CF-Connecting-IP") || "unknown";

/* محدودیت تعداد درخواست؛ اگه binding نباشه همیشه true (محدودیتی اعمال نمی‌شه) */
export async function rateLimit(env, key, max, windowMs) {
  if (!env.GAME) return true;
  try { return await stub(env, "rl:" + key).hit(max, windowMs); } catch { return true; }
}

const enc = new TextEncoder();
const json = (o, c = 200) => new Response(JSON.stringify(o), { status: c, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const goalOf = (env) => Number(env.GAME_GOAL) || 12;
const goal2Of = (env) => Math.max(goalOf(env) + 1, Number(env.GAME_GOAL2) || 20);
const capOf = (env) => Number(env.GAME_DAILY_CAP) || 30;
/* فقط GAME_SECRET؛ توکن بازی دست مرورگره، پس اگه با ADMIN_TOKEN امضا بشه می‌شه رمز ادمین رو آفلاین حدس زد */
const secretOf = (env) => { const s = String(env.GAME_SECRET || ""); return s.length >= 16 ? s : ""; };
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));

async function hmac(env, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secretOf(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
const sign = async (env, st) => { const p = b64(enc.encode(JSON.stringify(st))); return p + "." + b64(await hmac(env, p)); };
async function open(env, tok) {
  const [p, s] = String(tok || "").split(".");
  if (!p || !s || b64(await hmac(env, p)) !== s) return null;
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
  return { size, cells, round: st.r, score: st.c, token: await sign(env, st) };
}

/* ===== کد تخفیف ===== */
const faDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const norm = (c) => faDigits(c || "").replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").toUpperCase();
const getRec = async (env, code) => { const t = await env.ORDERS.get("code:" + code); try { return t ? JSON.parse(t) : null; } catch { return null; } };
const putRec = (env, code, r) => env.ORDERS.put("code:" + code, JSON.stringify(r));
const codeDO = (env, code) => stub(env, "code:" + code);

/* کد معتبر و آزاد؟ نرمال‌شده‌ش رو برمی‌گردونه.
   KV ممکنه تا یه دقیقه قدیمی بخونه، پس مرجع اصلی وضعیت رزرو/مصرف همون Durable Object ـه. */
export async function checkCode(env, raw) {
  const code = norm(raw);
  if (!/^CARA-[0-9A-F]{8}$/.test(code)) return null;
  const r = await getRec(env, code);
  if (!r || r.usedBy) return null;
  if (r.createdAt && Date.now() - r.createdAt > CODE_TTL_MS) return null; /* منقضی */
  if (r.reservedBy && Date.now() - r.reservedAt < RESERVE_MS) return null;
  if (env.GAME && !(await codeDO(env, code).codeAvailable(RESERVE_MS))) return null;
  return code;
}
/* درصد تخفیف این کد (۰٫۱ یا ۰٫۱۵)؛ کدهای قدیمی بدون درصد ۱۰٪ حساب می‌شن */
export async function codeDiscount(env, code) {
  const r = await getRec(env, code);
  return r && r.percent ? r.percent / 100 : DISCOUNT;
}
/* رزرو اتمیک؛ true یعنی رزرو شد. اگه false برگشت، سفارش رو نساز (کد همزمان توسط یکی دیگه رزرو شده) */
export async function reserveCode(env, code, orderId) {
  if (env.GAME && !(await codeDO(env, code).codeReserve(orderId, RESERVE_MS))) return false;
  const r = await getRec(env, code);
  if (r) { r.reservedBy = orderId; r.reservedAt = Date.now(); await putRec(env, code, r); }
  return true;
}
export async function releaseCode(env, code, orderId) {
  if (env.GAME) await codeDO(env, code).codeRelease(orderId);
  const r = await getRec(env, code);
  if (r && !r.usedBy && (!orderId || r.reservedBy === orderId)) { r.reservedBy = null; r.reservedAt = 0; await putRec(env, code, r); }
}
export async function useCode(env, code, orderId) {
  if (env.GAME) await codeDO(env, code).codeUse(orderId);
  const r = await getRec(env, code);
  if (r) { r.usedBy = orderId; r.usedAt = Date.now(); await putRec(env, code, r); }
}

async function finish(env, request, st) {
  const out = { over: true, score: st.c, goal: goalOf(env) };
  /* بازی‌ای که سریع‌تر از توان آدم تموم شده کد نمی‌گیره */
  const human = Date.now() - (st.s || 0) >= st.c * 700;
  if (st.c >= out.goal && human && !(await rateLimit(env, "codes:day", capOf(env), 24 * 60 * 60 * 1000))) out.capped = true;
  else if (st.c >= out.goal && human) {
    /* هر بازی یک کد، هر IP روزی یک کد؛ هر دو اتمیک (دو درخواست هم‌زمان نمی‌تونن دو کد بگیرن) */
    const first = await stub(env, "fin:" + st.i).claim(60 * 60 * 1000);
    const free = first && (await stub(env, "ip:" + ipOf(request)).claim(24 * 60 * 60 * 1000));
    if (!first || !free) out.limited = true;
    else {
      const code = "CARA-" + [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const percent = st.c >= goal2Of(env) ? DISCOUNT2 * 100 : DISCOUNT * 100;
      await putRec(env, code, { createdAt: Date.now(), percent, reservedBy: null, reservedAt: 0, usedBy: null });
      out.code = code; out.percent = percent;
    }
  }
  return json(out);
}

/* در index.js: const g = await handleGame(request, env, url); if (g) return g; */
export async function handleGame(request, env, url) {
  const p = url.pathname;
  if (!p.startsWith("/api/game/")) return null;
  /* بدون راز بازی یا بدون Durable Object، کد دادن امن نیست؛ کلاینت می‌افته روی حالت تمرین */
  if (!secretOf(env)) return json({ error: "بازی روی سرور تنظیم نشده (GAME_SECRET)." }, 503);
  if (!env.GAME) return json({ error: "محافظ بازی (binding با اسم GAME) تنظیم نشده." }, 503);
  if (p === "/api/game/config" && request.method === "GET") return json({ goal: goalOf(env), percent: DISCOUNT * 100, goal2: goal2Of(env), percent2: DISCOUNT2 * 100 });
  if (p === "/api/game/code" && request.method === "GET") {
    if (!(await rateLimit(env, "code:" + ipOf(request), 30, 60 * 1000))) return json({ error: "تعداد درخواست زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    const c = await checkCode(env, url.searchParams.get("c"));
    return json({ valid: !!c, percent: c ? Math.round((await codeDiscount(env, c)) * 100) : undefined });
  }
  if (request.method !== "POST") return json({ error: "not found" }, 404);

  if (p === "/api/game/start") {
    if (!(await rateLimit(env, "start:" + ipOf(request), 20, 60 * 1000))) return json({ error: "تعداد درخواست زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    const st = { i: crypto.randomUUID(), r: 1, c: 0, d: Date.now() + TOTAL_MS, t: 0, n: 0, s: Date.now() };
    return json({ remainingMs: TOTAL_MS, ...(await makeRound(env, st)) });
  }
  if (p === "/api/game/answer") {
    if (!(await rateLimit(env, "ans:" + ipOf(request), 300, 60 * 1000))) return json({ error: "تعداد درخواست زیاده؛ کمی صبر کن." }, 429);
    const b = await request.json().catch(() => ({}));
    const st = await open(env, b.token);
    if (!st) return json({ error: "بازی معتبر نیست؛ دوباره شروع کن." }, 400);
    const now = Date.now(), idx = Number(b.idx);
    if (now >= st.d) {
      if (now > st.d + GRACE_MS) return json({ error: "این بازی تموم شده؛ دوباره شروع کن." }, 400);
      return finish(env, request, st);
    }
    if (!(idx >= 0) || now - st.t < MIN_GAP_MS) return json({ tooFast: true, token: b.token, remainingMs: st.d - now });
    /* توکن تکراری/قدیمی رد می‌شه */
    if (!(await stub(env, st.i).advance(st.n || 0)))
      return json({ error: "این مرحله قبلاً جواب داده شده؛ بازی رو دوباره شروع کن." }, 409);
    const n2 = (st.n || 0) + 1;
    if (idx === (await oddIndex(env, st))) {
      const next = { ...st, r: st.r + 1, c: st.c + 1, d: st.d + BONUS_MS, t: now, n: n2 };
      return json({ correct: true, remainingMs: next.d - now, ...(await makeRound(env, next)) });
    }
    const wrong = { ...st, d: st.d - PENALTY_MS, t: now, n: n2 };
    if (now >= wrong.d) return finish(env, request, wrong);
    return json({ correct: false, token: await sign(env, wrong), remainingMs: wrong.d - now });
  }
  return json({ error: "not found" }, 404);
}
