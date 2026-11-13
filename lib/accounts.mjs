const SESSION_COOKIE = "__Host-cara_session";
const SESSION_TTL = 30 * 24 * 60 * 60;
const TELEGRAM_MAX_AGE = 5 * 60;

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
    return received.origin === `https://${host}` || received.origin === `https://www.${host}`;
  } catch { return false; }
}

export async function verifyTelegramLogin(payload, botToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !botToken) return null;
  const suppliedHash = String(payload.hash || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(suppliedHash)) return null;
  const authDate = Number(payload.auth_date);
  if (!Number.isInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > TELEGRAM_MAX_AGE) return null;
  const userId = String(payload.id || "");
  if (!/^\d{1,24}$/.test(userId)) return null;

  const entries = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  const checkString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(botToken));
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(checkString)));
  if (!safeEqual(suppliedHash, expected)) return null;

  return {
    id: userId,
    firstName: cleanText(payload.first_name, 80),
    lastName: cleanText(payload.last_name, 80),
    username: cleanText(payload.username, 64) || null,
  };
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

export async function handleAccountRequest(request, env, url, rateLimit, validateDesign) {
  const path = url.pathname;
  if (!path.startsWith("/api/account") && !path.startsWith("/api/auth/")) return null;
  if (!env.ACCOUNTS_DB) return json({ error: "حساب کاربری فعلاً روی این محیط فعال نیست." }, 503);

  if (path === "/api/account/config" && request.method === "GET") {
    return json({ telegramBotUsername: cleanText(env.TELEGRAM_BOT_USERNAME, 64).replace(/^@/, "") || null });
  }

  if (path === "/api/auth/telegram" && request.method === "POST") {
    if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimit && !(await rateLimit(env, "account-login:" + ip, 12, 10 * 60 * 1000)))
      return json({ error: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کن." }, 429);
    if (!env.TELEGRAM_BOT_TOKEN) return json({ error: "ورود تلگرام هنوز پیکربندی نشده است." }, 503);
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "اطلاعات ورود معتبر نیست." }, 400); }
    const identity = await verifyTelegramLogin(payload, env.TELEGRAM_BOT_TOKEN);
    if (!identity) return json({ error: "تأیید تلگرام نامعتبر یا منقضی شده است؛ دوباره وارد شو." }, 401);

    const now = Math.floor(Date.now() / 1000);
    const payloadHash = await sha256(JSON.stringify(Object.keys(payload).sort().reduce((o, k) => (o[k] = payload[k], o), {})));
    try {
      await env.ACCOUNTS_DB.prepare("DELETE FROM account_login_events WHERE expires_at < ?").bind(now).run();
      await env.ACCOUNTS_DB.prepare("INSERT INTO account_login_events (payload_hash, created_at, expires_at) VALUES (?, ?, ?)")
        .bind(payloadHash, now, now + TELEGRAM_MAX_AGE).run();
    } catch {
      return json({ error: "این درخواست ورود قبلاً استفاده شده؛ دوباره از تلگرام وارد شو." }, 409);
    }

    const existing = await env.ACCOUNTS_DB.prepare(
      "SELECT user_id FROM identity_links WHERE provider = 'telegram' AND provider_subject = ?"
    ).bind(identity.id).first();
    const userId = existing?.user_id || crypto.randomUUID();
    if (!existing) {
      await env.ACCOUNTS_DB.prepare("INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)")
        .bind(userId, now, now).run();
      await env.ACCOUNTS_DB.prepare(
        "INSERT INTO identity_links (id, user_id, provider, provider_subject, verified_at, created_at) VALUES (?, ?, 'telegram', ?, ?, ?)"
      ).bind(crypto.randomUUID(), userId, identity.id, now, now).run();
    }
    const displayName = [identity.firstName, identity.lastName].filter(Boolean).join(" ").slice(0, 120);
    await env.ACCOUNTS_DB.prepare(
      `INSERT INTO user_profiles (user_id, display_name, username, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, username = excluded.username, updated_at = excluded.updated_at`
    ).bind(userId, displayName, identity.username, now).run();

    const token = randomToken();
    await env.ACCOUNTS_DB.prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(await sha256(token), userId, now, now + SESSION_TTL).run();
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  const user = await getAccountUser(request, env);
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
          });
        } catch {}
      }
    }
    matches.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(matches.slice(0, 100));
  }
  return json({ error: "not found" }, 404);
}

export { SESSION_COOKIE, SESSION_TTL, sha256 };
