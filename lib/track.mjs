/* Public order tracking with high-entropy, hashed, expiring tokens.
   The raw token is returned once (to the customer or admin) and is never stored. */

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const hex = (bytes) => [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
const sha256 = async (value) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
export const TOKEN_RE = /^[a-f0-9]{64}$/;

export function newOrderToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

export function publicOrderView(order) {
  if (!order || !order.id) return null;
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({ title: String(item.title || "").slice(0, 80), quantity: Number(item.quantity) || 1 }))
    : [];
  const what =
    order.kind === "cart"
      ? items.map((item) => item.title).filter(Boolean).join("، ").slice(0, 120) ||
        `${items.reduce((sum, item) => sum + item.quantity, 0)} قلم`
      : order.kind === "work"
        ? String((order.work && (order.work.title || order.work.id)) || "دستبند گالری").slice(0, 80)
        : order.pattern
          ? `الگوی دلخواه ${order.pattern.width}×${order.pattern.height}`
          : "سفارش کارا";
  return {
    code: String(order.id).slice(0, 8),
    status: String(order.status || "pending"),
    fulfillment: String(order.fulfillment || "new"),
    tracking: typeof order.tracking === "string" && order.tracking ? order.tracking.slice(0, 60) : null,
    createdAt: order.createdAt || null,
    paidAt: order.paidAt || null,
    kind: order.kind || "pattern",
    workId: order.work && order.work.id ? String(order.work.id).slice(0, 80) : null,
    what,
    itemCount: items.length,
    items,
    gift: order.gift ? { wrap: !!order.gift.wrap } : null,
  };
}

export async function issueOrderToken(env, orderId, ttlDays = 180) {
  if (!env || !env.ACCOUNTS_DB || !orderId) return null;
  const token = newOrderToken();
  const now = Math.floor(Date.now() / 1000);
  const expires = now + Math.max(1, Number(ttlDays) || 180) * 24 * 60 * 60;
  try {
    await env.ACCOUNTS_DB.prepare(
      "UPDATE order_access_tokens SET revoked_at = ? WHERE order_id = ? AND revoked_at IS NULL",
    ).bind(now, String(orderId)).run();
    await env.ACCOUNTS_DB.prepare(
      "INSERT INTO order_access_tokens (token_hash, order_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    ).bind(await sha256(token), String(orderId), now, expires).run();
    return token;
  } catch (error) {
    console.error("track token issue failed", String(orderId), String(error).slice(0, 160));
    return null;
  }
}

async function lookup(env, token) {
  const hash = await sha256(token);
  const row = await env.ACCOUNTS_DB.prepare(
    "SELECT order_id, expires_at, revoked_at FROM order_access_tokens WHERE token_hash = ?",
  ).bind(hash).first();
  if (!row || row.revoked_at) return null;
  if (Number(row.expires_at) <= Math.floor(Date.now() / 1000)) return null;
  return row;
}

export async function handleTrackRequest(request, env, url, options = {}) {
  if (url.pathname !== "/api/track" && url.pathname !== "/api/admin/track") return null;
  if (!env.ACCOUNTS_DB) return json({ error: "پیگیری سفارش فعلاً فعال نیست." }, 503);
  const rateLimit = options.rateLimit;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (url.pathname === "/api/track" && request.method === "GET") {
    if (rateLimit && !(await rateLimit(env, "track:" + ip, 30, 60 * 1000))) {
      return json({ error: "تعداد درخواست زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    }
    const token = String(url.searchParams.get("t") || "").toLowerCase();
    if (!TOKEN_RE.test(token)) return json({ error: "لینک پیگیری معتبر نیست." }, 404);
    const row = await lookup(env, token);
    if (!row) return json({ error: "لینک پیگیری معتبر نیست یا منقضی شده." }, 404);
    const order = await options.getOrder(env, row.order_id);
    if (!order) return json({ error: "این سفارش پیدا نشد." }, 404);
    return json({ ok: true, order: publicOrderView(order) });
  }

  if (url.pathname === "/api/admin/track") {
    if (options.adminGuard) {
      const gate = await options.adminGuard(request);
      if (gate) return gate;
    }
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
    const id = String((body && body.id) || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "شناسه‌ی سفارش معتبر نیست." }, 400);
    const order = await options.getOrder(env, id);
    if (!order) return json({ error: "این سفارش پیدا نشد." }, 404);
    const token = await issueOrderToken(env, id);
    if (!token) return json({ error: "ساخت لینک پیگیری انجام نشد." }, 500);
    const site = String(env.BASE_URL || "https://caraw.ir").replace(/\/+$/, "");
    return json({ ok: true, url: `${site}/track.html?t=${token}` });
  }

  return null;
}
