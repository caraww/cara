import { clientIp } from "./client-ip.mjs";

const SESSION_COOKIE = "__Host-cara_session";
const SESSION_TTL = 30 * 24 * 60 * 60;
// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100000.
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_KEY_BYTES = 32;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
});
const hex = (bytes) => [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
const sha256 = async (value) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const safeEqual = (a, b) => {
  a = String(a || ""); b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return hex(bytes);
};
const cookieValue = (request, name) => {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
};
const sessionCookie = (token, maxAge = SESSION_TTL) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearSessionCookie = () => sessionCookie("", 0);
const cleanText = (value, max = 80) => String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
export function normalizePhone(value) {
  const digitMap = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
  let phone = String(value || "")
    .replace(/[۰-۹٠-٩]/g, (d) => String(digitMap.indexOf(d) % 10))
    .replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff().-]/g, "");
  phone = phone.replace(/^(?:\+98|0098|98)0?(?=9\d{9}$)/, "+98");
  if (/^9\d{9}$/.test(phone)) phone = "+98" + phone;
  if (/^09\d{9}$/.test(phone)) phone = "+98" + phone.slice(1);
  if (/^989\d{9}$/.test(phone)) phone = "+" + phone;
  if (/^00989\d{9}$/.test(phone)) phone = "+" + phone.slice(2);
  if (/^\+989\d{9}$/.test(phone)) return phone;
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
  return null;
}
function requestIsSameOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    const expected = new URL(env.BASE_URL || "https://caraw.ir");
    const received = new URL(origin);
    const host = expected.hostname.replace(/^www\./, "");
    return received.origin === expected.origin ||
      (received.protocol === expected.protocol &&
        received.port === expected.port &&
        received.hostname.replace(/^www\./, "") === host);
  } catch { return false; }
}

const hexToBytes = (value) => {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return null;
  return new Uint8Array(value.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
};

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await pbkdf2(String(password), salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${hex(salt)}$${hex(digest)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expected = parts[3];
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000 || !salt || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const actual = await pbkdf2(String(password), salt, iterations);
  return safeEqual(hex(actual), expected);
}

export function normalizeLoginId(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 254) return null;
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
  }
  return normalizePhone(raw);
}

export async function getAccountUser(request, env) {
  if (!env.ACCOUNTS_DB) return null;
  const raw = cookieValue(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  const tokenHash = await sha256(raw);
  const row = await env.ACCOUNTS_DB.prepare(
    `SELECT u.id, u.status, p.display_name, p.username
     FROM sessions s JOIN users u ON u.id = s.user_id
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.status = 'active'`
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}

async function startSession(env, userId, now) {
  const token = randomToken();
  await env.ACCOUNTS_DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(await sha256(token), userId, now, now + SESSION_TTL).run();
  return token;
}

export async function handleAccountRequest(request, env, url, rateLimit, validateDesign) {
  const path = url.pathname;
  if (!path.startsWith("/api/account") && !path.startsWith("/api/auth/")) return null;
  if (!env.ACCOUNTS_DB) return json({ error: "حساب کاربری فعلاً روی این محیط فعال نیست." }, 503);

  if (path === "/api/auth/register" && request.method === "POST") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const ip = clientIp(request);
    if (rateLimit && !(await rateLimit(env, "account-register:" + ip, 8, 10 * 60 * 1000)))
      return json({ error: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کن." }, 429);
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات ثبت‌نام معتبر نیست." }, 400); }
    const name = cleanText(body?.name, 80);
    const loginId = normalizeLoginId(body?.identifier);
    const password = String(body?.password || "");
    if (name.length < 2) return json({ error: "نامت را کامل وارد کن." }, 400);
    if (!loginId) return json({ error: "ایمیل یا شماره موبایل معتبر نیست." }, 400);
    if (password.length < 8 || password.length > 128)
      return json({ error: "رمز عبور باید بین ۸ تا ۱۲۸ کاراکتر باشد." }, 400);

    const existing = await env.ACCOUNTS_DB.prepare(
      "SELECT user_id FROM local_credentials WHERE login_id = ?"
    ).bind(loginId).first();
    if (existing) return json({ error: "این ایمیل یا شماره قبلاً ثبت شده است؛ وارد شو." }, 409);

    const now = Math.floor(Date.now() / 1000);
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const phone = loginId.startsWith("+") ? loginId : null;
    try {
      await env.ACCOUNTS_DB.batch([
        env.ACCOUNTS_DB.prepare("INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)")
          .bind(userId, now, now),
        env.ACCOUNTS_DB.prepare(
          "INSERT INTO local_credentials (user_id, login_id, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(userId, loginId, passwordHash, now, now),
        env.ACCOUNTS_DB.prepare(
          "INSERT INTO user_profiles (user_id, display_name, username, phone, updated_at) VALUES (?, ?, NULL, ?, ?)"
        ).bind(userId, name, phone, now),
      ]);
    } catch {
      return json({ error: "این ایمیل یا شماره قبلاً ثبت شده است؛ وارد شو." }, 409);
    }

    const token = await startSession(env, userId, now);
    return json({ ok: true, user: { displayName: name } }, 201, { "Set-Cookie": sessionCookie(token) });
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const ip = clientIp(request);
    if (rateLimit && !(await rateLimit(env, "account-login:" + ip, 20, 10 * 60 * 1000)))
      return json({ error: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کن." }, 429);
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات ورود معتبر نیست." }, 400); }
    const loginId = normalizeLoginId(body?.identifier);
    const password = String(body?.password || "");
    const genericError = "ایمیل/شماره یا رمز عبور اشتباه است.";
    if (!loginId || password.length < 8 || password.length > 128) return json({ error: genericError }, 401);

    const row = await env.ACCOUNTS_DB.prepare(
      `SELECT c.user_id, c.password_hash, u.status
       FROM local_credentials c JOIN users u ON u.id = c.user_id
       WHERE c.login_id = ?`
    ).bind(loginId).first();
    if (!row || row.status !== "active" || !(await verifyPassword(password, row.password_hash)))
      return json({ error: genericError }, 401);

    const now = Math.floor(Date.now() / 1000);
    const token = await startSession(env, row.user_id, now);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  const user = await getAccountUser(request, env);
  if (path === "/api/account/favorites") {
    if (!user) return json({ error: "برای ذخیره‌ی علاقه‌مندی‌ها اول وارد شو." }, 401);
    if (request.method === "GET") {
      const { results } = await env.ACCOUNTS_DB.prepare(
        "SELECT work_id FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 500",
      ).bind(String(user.id)).all();
      return json({ favorites: (results || []).map((row) => row.work_id) });
    }
    if (request.method === "POST") {
      if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
      const ip = clientIp(request);
      if (rateLimit && !(await rateLimit(env, "favorites:" + ip, 120, 60 * 1000))) {
        return json({ error: "تعداد درخواست زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
      }
      let body;
      try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
      const workId = cleanText(body && body.workId, 120);
      if (!workId) return json({ error: "این دستبند پیدا نشد." }, 400);
      const remove = body.action === "remove";
      if (remove) {
        await env.ACCOUNTS_DB.prepare("DELETE FROM user_favorites WHERE user_id = ? AND work_id = ?")
          .bind(String(user.id), workId).run();
      } else {
        await env.ACCOUNTS_DB.prepare(
          "INSERT OR IGNORE INTO user_favorites (user_id, work_id, created_at) VALUES (?, ?, ?)",
        ).bind(String(user.id), workId, Math.floor(Date.now() / 1000)).run();
      }
      return json({ ok: true, workId, favorite: !remove });
    }
    return json({ error: "method not allowed" }, 405);
  }
  if (path === "/api/account/logout" && request.method === "POST") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const raw = cookieValue(request, SESSION_COOKIE);
    if (/^[a-f0-9]{64}$/.test(raw)) {
      await env.ACCOUNTS_DB.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
        .bind(Math.floor(Date.now() / 1000), await sha256(raw)).run();
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }
  if (path === "/api/account/me" && request.method === "GET") {
    return user ? json({ authenticated: true, user: { id: user.id, displayName: user.display_name || "", username: user.username || null } })
      : json({ authenticated: false, user: null }, 401);
  }
  if (!user) return json({ error: "برای ادامه وارد حساب کاربری شو." }, 401);
  if (path === "/api/account/profile" && request.method === "GET") {
    const profile = await env.ACCOUNTS_DB.prepare(
      "SELECT phone, phone_verified_at, marketing_sms_consent, marketing_sms_consent_at FROM user_profiles WHERE user_id = ?"
    ).bind(user.id).first();
    return json({
      phone: profile?.phone || "",
      phoneVerified: !!profile?.phone_verified_at,
      marketingSmsConsent: !!profile?.marketing_sms_consent,
      marketingSmsConsentAt: profile?.marketing_sms_consent_at || null,
    });
  }
  if (path === "/api/account/profile" && request.method === "PUT") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات معتبر نیست." }, 400); }
    const rawPhone = String(body?.phone || "").trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return json({ error: "شماره موبایل معتبر نیست؛ شماره را با فرمت 09xxxxxxxxx وارد کن." }, 400);
    const consent = body?.marketingSmsConsent === true;
    if (consent && !phone) return json({ error: "برای ثبت رضایت پیامک تبلیغاتی، ابتدا شماره موبایل را وارد کن." }, 400);
    const now = Math.floor(Date.now() / 1000);
    const previous = await env.ACCOUNTS_DB.prepare(
      "SELECT phone, phone_verified_at, marketing_sms_consent, marketing_sms_consent_at, marketing_sms_revoked_at FROM user_profiles WHERE user_id = ?"
    ).bind(user.id).first();
    const phoneChanged = (previous?.phone || null) !== phone;
    const consentAt = consent ? (previous?.marketing_sms_consent && !phoneChanged ? (previous.marketing_sms_consent_at || now) : now) : (phoneChanged ? null : (previous?.marketing_sms_consent_at || null));
    const revokedAt = consent ? null : (previous?.marketing_sms_consent ? now : (previous?.marketing_sms_revoked_at || null));
    const verifiedAt = phoneChanged ? null : (previous?.phone_verified_at || null);
    await env.ACCOUNTS_DB.prepare(
      `INSERT INTO user_profiles (user_id, display_name, username, phone, phone_verified_at, marketing_sms_consent, marketing_sms_consent_at, marketing_sms_revoked_at, updated_at)
       VALUES (?, '', NULL, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET phone = excluded.phone, phone_verified_at = excluded.phone_verified_at,
         marketing_sms_consent = excluded.marketing_sms_consent, marketing_sms_consent_at = excluded.marketing_sms_consent_at,
         marketing_sms_revoked_at = excluded.marketing_sms_revoked_at, updated_at = excluded.updated_at`
    ).bind(user.id, phone, verifiedAt, consent ? 1 : 0, consentAt, revokedAt, now).run();
    return json({ ok: true, phone: phone || "", phoneVerified: !!verifiedAt, marketingSmsConsent: consent, marketingSmsConsentAt: consentAt });
  }
  if (path === "/api/account/designs" && request.method === "GET") {
    const rows = await env.ACCOUNTS_DB.prepare(
      "SELECT id, title, design_json, created_at, updated_at FROM designs WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100"
    ).bind(user.id).all();
    return json((rows.results || []).map((row) => ({ id: row.id, title: row.title, design: JSON.parse(row.design_json), createdAt: row.created_at, updatedAt: row.updated_at })));
  }
  if (path === "/api/account/designs" && request.method === "POST") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات طرح معتبر نیست." }, 400); }
    const design = body?.design;
    const validatedDesign = design && validateDesign ? validateDesign(design) : null;
    if (!validatedDesign || !Array.isArray(design.data) || design.data.length < 1 || design.data.length > 200 ||
      !Array.isArray(design.data[0]) || design.data[0].length < 1 || design.data[0].length > 40 ||
      design.data.some((row) => !Array.isArray(row) || row.length !== design.data[0].length) ||
      new TextEncoder().encode(JSON.stringify(design)).length > 32000) {
      return json({ error: "ابعاد یا حجم طرح مجاز نیست." }, 400);
    }
    const now = Math.floor(Date.now() / 1000), id = crypto.randomUUID();
    await env.ACCOUNTS_DB.prepare(
      "INSERT INTO designs (id, user_id, title, design_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, user.id, cleanText(body.title, 60), JSON.stringify(validatedDesign), now, now).run();
    return json({ ok: true, id }, 201);
  }
  if (path.startsWith("/api/account/designs/") && request.method === "DELETE") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const id = path.slice("/api/account/designs/".length);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "طرح پیدا نشد." }, 404);
    const result = await env.ACCOUNTS_DB.prepare("DELETE FROM designs WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return json({ ok: true, deleted: Number(result.meta?.changes || 0) });
  }
  if (path === "/api/account/orders" && request.method === "GET") {
    if (!env.ORDERS) return json([]);
    const keys = await env.ORDERS.list({ prefix: "order:", limit: 1000 });
    const matches = [];
    for (let i = 0; i < keys.keys.length; i += 25) {
      const batch = await Promise.all(keys.keys.slice(i, i + 25).map((key) => env.ORDERS.get(key.name)));
      for (const value of batch) {
        try {
          const order = JSON.parse(value);
          if (order?.userId === user.id) matches.push({
            id: order.id, code: String(order.id).slice(0, 8), status: order.status,
            fulfillment: order.fulfillment || "new", createdAt: order.createdAt,
            paidAt: order.paidAt || null, priceToman: order.priceToman,
            tracking: order.tracking || null,
            work: order.work ? { id: order.work.id, title: order.work.title || order.work.id } : null,
          });
        } catch {}
      }
    }
    matches.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(matches.slice(0, 100));
  }
  return json({ error: "not found" }, 404);
}

export { SESSION_COOKIE, SESSION_TTL, sha256, requestIsSameOrigin };
