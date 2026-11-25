/* Verified-purchase reviews for gallery works.
   Public reads only return approved rows. Writes require a signed-in user AND a paid
   order that contains the same work ID. Admin moderation is behind ADMIN_TOKEN. */

import { clientIp } from "./client-ip.mjs";

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const cleanText = (value, max = 600) =>
  String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const sameOrigin = (request, env) => {
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
  } catch {
    return false;
  }
};

export function validateReview(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "اطلاعات نظر معتبر نیست." };
  }
  const workId = cleanText(input.workId, 80);
  if (!workId) return { ok: false, error: "این دستبند پیدا نشد." };
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "امتیاز باید بین ۱ تا ۵ باشد." };
  }
  const body = cleanText(input.body, 600);
  if (body.length < 10) return { ok: false, error: "متن نظر حداقل ۱۰ حرف باشد." };
  return { ok: true, value: { workId, rating, body } };
}

export function orderContainsWork(order, workId) {
  if (!order || !workId) return false;
  if (order.work && String(order.work.id) === String(workId)) return true;
  if (Array.isArray(order.items)) {
    return order.items.some((item) => item && String(item.workId || "") === String(workId));
  }
  return false;
}

async function paidOrderFor(env, userId, workId) {
  const { results } = await env.ACCOUNTS_DB.prepare(
    "SELECT id, order_json FROM orders WHERE user_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 100",
  )
    .bind(String(userId))
    .all();
  for (const row of results || []) {
    try {
      const order = JSON.parse(row.order_json);
      if (orderContainsWork(order, workId)) return String(row.id);
    } catch {}
  }
  return null;
}

async function publicReviews(env, workId) {
  const { results } = await env.ACCOUNTS_DB.prepare(
    "SELECT id, rating, body, author_name, created_at FROM reviews WHERE work_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 50",
  )
    .bind(workId)
    .all();
  const rows = (results || []).map((row) => ({
    id: row.id,
    rating: Number(row.rating) || 0,
    body: row.body || "",
    author: row.author_name || "خریدار کارا",
    createdAt: Number(row.created_at) || 0,
  }));
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / count) * 10) / 10 : 0;
  const distribution = [1, 2, 3, 4, 5].map((star) => ({ star, count: rows.filter((row) => row.rating === star).length }));
  return { workId, summary: { count, average, distribution }, reviews: rows };
}

export async function handleReviewRequest(request, env, url, options = {}) {
  const path = url.pathname;
  if (path !== "/api/reviews" && path !== "/api/admin/reviews") return null;
  if (!env.ACCOUNTS_DB) return json({ error: "بخش نظرات فعلاً فعال نیست." }, 503);
  const rateLimit = options.rateLimit;
  const ip = clientIp(request);

  if (path === "/api/reviews" && request.method === "GET") {
    if (rateLimit && !(await rateLimit(env, "reviews:read:" + ip, 60, 60 * 1000))) {
      return json({ error: "تعداد درخواست زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    }
    const workId = cleanText(url.searchParams.get("work"), 80);
    if (!workId) return json({ error: "این دستبند پیدا نشد." }, 400);
    return json(await publicReviews(env, workId));
  }

  if (path === "/api/reviews" && request.method === "POST") {
    if (!sameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
    const user = await options.getAccountUser(request, env);
    if (!user) return json({ error: "برای ثبت نظر اول با تلگرام وارد شو." }, 401);
    if (rateLimit && !(await rateLimit(env, "reviews:write:" + ip, 8, 10 * 60 * 1000))) {
      return json({ error: "تعداد تلاش‌ها زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات نظر معتبر نیست." }, 400); }
    const checked = validateReview(body);
    if (!checked.ok) return json({ error: checked.error }, 400);
    const { workId, rating, body: text } = checked.value;
    const orderId = await paidOrderFor(env, user.id, workId);
    if (!orderId) return json({ error: "فقط کسی که همین دستبند را خریده می‌تواند نظر بدهد." }, 403);
    const now = Math.floor(Date.now() / 1000);
    const author = cleanText(user.display_name, 60) || "خریدار کارا";
    try {
      await env.ACCOUNTS_DB.prepare(
        `INSERT INTO reviews (id, work_id, user_id, order_id, rating, body, author_name, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
         ON CONFLICT(work_id, user_id, order_id) DO UPDATE SET
           rating = excluded.rating, body = excluded.body, author_name = excluded.author_name,
           status = 'pending', updated_at = excluded.updated_at`,
      )
        .bind(crypto.randomUUID(), workId, String(user.id), orderId, rating, text, author, now, now)
        .run();
    } catch (error) {
      console.error("review insert failed", String(error).slice(0, 200));
      return json({ error: "ثبت نظر انجام نشد؛ دوباره امتحان کن." }, 500);
    }
    return json({ ok: true, status: "pending" }, 201);
  }

  /* Admin moderation. index.js passes an adminGuard that already checked the token. */
  if (path === "/api/admin/reviews") {
    if (options.adminGuard) {
      const gate = await options.adminGuard(request);
      if (gate) return gate;
    }
    if (request.method === "GET") {
      const status = cleanText(url.searchParams.get("status"), 12) || "pending";
      const allowed = new Set(["pending", "approved", "rejected", "all"]);
      const filter = allowed.has(status) ? status : "pending";
      const sql = filter === "all"
        ? "SELECT id, work_id, rating, body, author_name, status, created_at FROM reviews ORDER BY created_at DESC LIMIT 500"
        : "SELECT id, work_id, rating, body, author_name, status, created_at FROM reviews WHERE status = ? ORDER BY created_at DESC LIMIT 500";
      const stmt = filter === "all" ? env.ACCOUNTS_DB.prepare(sql) : env.ACCOUNTS_DB.prepare(sql).bind(filter);
      const { results } = await stmt.all();
      return json({ reviews: results || [] });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
      const id = cleanText(body && body.id, 64);
      const action = String((body && body.action) || "");
      const next = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
      if (!id || !next) return json({ error: "درخواست معتبر نیست." }, 400);
      await env.ACCOUNTS_DB.prepare("UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?")
        .bind(next, Math.floor(Date.now() / 1000), id)
        .run();
      return json({ ok: true, status: next });
    }
    return json({ error: "method not allowed" }, 405);
  }

  return null;
}
