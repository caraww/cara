/* Public reviews for gallery works.
   Any visitor can submit a review; submissions stay pending until an admin
   approves them. Verified-purchase reviews from the legacy flow are still
   shown alongside guest reviews. */

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
  if (/(?:https?:\/\/|www\.)/i.test(body)) return { ok: false, error: "لینک در متن نظر مجاز نیست." };
  const author = cleanText(input.author, 60) || "مهمان کارا";
  return { ok: true, value: { workId, rating, body, author } };
}

export function orderContainsWork(order, workId) {
  if (!order || !workId) return false;
  if (order.work && String(order.work.id) === String(workId)) return true;
  if (Array.isArray(order.items)) {
    return order.items.some((item) => item && String(item.workId || "") === String(workId));
  }
  return false;
}

async function publicReviews(env, workId) {
  const [verified, guests] = await Promise.all([
    env.ACCOUNTS_DB.prepare(
      "SELECT id, rating, body, author_name, created_at FROM reviews WHERE work_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 50",
    ).bind(workId).all(),
    env.ACCOUNTS_DB.prepare(
      "SELECT id, rating, body, author_name, created_at FROM guest_reviews WHERE work_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 50",
    ).bind(workId).all(),
  ]);
  const rows = [...(verified.results || []), ...(guests.results || [])]
    .sort((a, b) => Number(b.created_at) - Number(a.created_at))
    .slice(0, 50)
    .map((row) => ({
      id: row.id,
      rating: Number(row.rating) || 0,
      body: row.body || "",
      author: row.author_name || "مهمان کارا",
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
    if (rateLimit && !(await rateLimit(env, "reviews:write:" + ip, 5, 10 * 60 * 1000))) {
      return json({ error: "تعداد تلاش‌ها زیاده؛ کمی بعد دوباره امتحان کن." }, 429);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات نظر معتبر نیست." }, 400); }
    if (cleanText(body?.website, 200)) return json({ error: "درخواست معتبر نیست." }, 400);
    const checked = validateReview(body);
    if (!checked.ok) return json({ error: checked.error }, 400);
    const { workId, rating, body: text, author } = checked.value;
    const now = Math.floor(Date.now() / 1000);
    try {
      await env.ACCOUNTS_DB.prepare(
        `INSERT INTO guest_reviews (id, work_id, rating, body, author_name, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
        .bind(crypto.randomUUID(), workId, rating, text, author, now, now)
        .run();
    } catch (error) {
      console.error("guest review insert failed", String(error).slice(0, 200));
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
      const read = (table) => {
        const sql = filter === "all"
          ? `SELECT id, work_id, rating, body, author_name, status, created_at FROM ${table} ORDER BY created_at DESC LIMIT 500`
          : `SELECT id, work_id, rating, body, author_name, status, created_at FROM ${table} WHERE status = ? ORDER BY created_at DESC LIMIT 500`;
        const stmt = filter === "all" ? env.ACCOUNTS_DB.prepare(sql) : env.ACCOUNTS_DB.prepare(sql).bind(filter);
        return stmt.all();
      };
      const [verified, guests] = await Promise.all([read("reviews"), read("guest_reviews")]);
      const reviews = [
        ...(verified.results || []).map((row) => ({ ...row, source: "verified" })),
        ...(guests.results || []).map((row) => ({ ...row, id: "guest:" + row.id, source: "guest" })),
      ].sort((a, b) => Number(b.created_at) - Number(a.created_at)).slice(0, 500);
      return json({ reviews });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
      const rawId = cleanText(body && body.id, 64);
      const guest = rawId.startsWith("guest:");
      const id = guest ? rawId.slice("guest:".length) : rawId;
      const action = String((body && body.action) || "");
      const next = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
      if (!/^[0-9a-f-]{36}$/i.test(id) || !next) return json({ error: "درخواست معتبر نیست." }, 400);
      const table = guest ? "guest_reviews" : "reviews";
      await env.ACCOUNTS_DB.prepare(`UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`)
        .bind(next, Math.floor(Date.now() / 1000), id)
        .run();
      return json({ ok: true, status: next });
    }
    return json({ error: "method not allowed" }, 405);
  }

  return null;
}
