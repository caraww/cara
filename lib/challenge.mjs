/* challenge.mjs — چالش طراحی هفتگی cara.
   عمومی:  GET /api/challenge · POST /api/challenge/entries · DELETE /api/challenge/entries/:id · POST /api/challenge/entries/:id/vote
   ادمین:  GET|POST /api/admin/challenges  (با ADMIN_TOKEN؛ بررسی‌اش با adminGuard از index.js می‌آد)
   قانون‌ها: ورود با تلگرام لازمه، هر کاربر یک طرح و یک رأی برای هر طرح، فقط نام مستعار نمایش داده می‌شه،
   و طرح‌ها تا تأیید ادمین عمومی نیستن. */
import { getAccountUser, requestIsSameOrigin } from "./accounts.mjs";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const clean = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const nowSec = () => Math.floor(Date.now() / 1000);
const parseColors = (text) => { try { const a = JSON.parse(text || "[]"); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };
const parseDesign = (text) => { try { return JSON.parse(text); } catch { return null; } };
const toSec = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v > 1e11 ? v / 1000 : v);
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? Math.floor(t / 1000) : NaN;
};
const isOpen = (c, t = nowSec()) => !!c && c.status === "active" && c.starts_at <= t && c.ends_at >= t;

const publicChallenge = (c, t = nowSec()) => c && ({
  id: c.id, title: c.title, theme: c.theme, rules: c.rules, allowedColors: parseColors(c.allowed_colors),
  prizePercent: c.prize_percent, startsAt: c.starts_at, endsAt: c.ends_at, status: c.status, open: isOpen(c, t),
});

async function currentChallenge(db, t) {
  const open = await db.prepare("SELECT * FROM challenges WHERE status = 'active' AND starts_at <= ? AND ends_at >= ? ORDER BY starts_at DESC LIMIT 1").bind(t, t).first();
  if (open) return { challenge: open, upcoming: null };
  const upcoming = await db.prepare("SELECT * FROM challenges WHERE status = 'active' AND starts_at > ? ORDER BY starts_at ASC LIMIT 1").bind(t).first();
  const last = await db.prepare("SELECT * FROM challenges WHERE status = 'closed' OR (status = 'active' AND ends_at < ?) ORDER BY ends_at DESC LIMIT 1").bind(t).first();
  return { challenge: last || null, upcoming: upcoming || null };
}

const ENTRY_SELECT = `SELECT e.id, e.title, e.nickname, e.design_json, e.status, e.user_id, e.created_at,
    (SELECT COUNT(*) FROM challenge_votes v WHERE v.entry_id = e.id) AS votes,
    (SELECT 1 FROM challenge_votes v WHERE v.entry_id = e.id AND v.user_id = ?) AS voted
  FROM challenge_entries e`;

async function publicState(request, env) {
  const db = env.ACCOUNTS_DB, t = nowSec();
  const user = await getAccountUser(request, env);
  const { challenge, upcoming } = await currentChallenge(db, t);
  let entries = [];
  if (challenge) {
    const rows = await db.prepare(`${ENTRY_SELECT} WHERE e.challenge_id = ? AND (e.status IN ('approved', 'winner') OR e.user_id = ?)
      ORDER BY (e.status = 'winner') DESC, votes DESC, e.created_at ASC LIMIT 80`).bind(user ? user.id : "", challenge.id, user ? user.id : "").all();
    entries = (rows.results || []).map((r) => ({
      id: r.id, title: r.title, nickname: r.nickname, design: parseDesign(r.design_json), votes: Number(r.votes) || 0,
      voted: !!r.voted, winner: r.status === "winner", mine: !!user && r.user_id === user.id,
      ...(user && r.user_id === user.id ? { status: r.status } : {}),
    }));
  }
  const w = await db.prepare(`SELECT e.id, e.title, e.nickname, e.design_json, c.title AS challenge_title FROM challenge_entries e
    JOIN challenges c ON c.id = e.challenge_id WHERE e.status = 'winner' ORDER BY c.ends_at DESC LIMIT 12`).all();
  return {
    now: t, loggedIn: !!user, challenge: publicChallenge(challenge, t), upcoming: publicChallenge(upcoming, t), entries,
    winners: (w.results || []).map((r) => ({ id: r.id, title: r.title, nickname: r.nickname, challengeTitle: r.challenge_title, design: parseDesign(r.design_json) })),
  };
}

async function submitEntry(request, env, o) {
  if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
  const user = await getAccountUser(request, env);
  if (!user) return json({ error: "برای شرکت توی چالش اول با تلگرام وارد شو." }, 401);
  if (!(await o.rateLimit(env, "chal:entry:" + user.id, 10, 3600 * 1000))) return json({ error: "خیلی سریع شد؛ چند دقیقه‌ی دیگه دوباره امتحان کن." }, 429);
  let body; try { body = await request.json(); } catch { return json({ error: "اطلاعات معتبر نیست." }, 400); }
  const title = clean(body && body.title, 60), nickname = clean(body && body.nickname, 30);
  if (title.length < 2) return json({ error: "برای طرحت یه اسم بنویس (حداقل ۲ حرف)." }, 400);
  if (nickname.length < 2) return json({ error: "یه نام مستعار بنویس؛ فقط همین اسم به بقیه نشون داده می‌شه." }, 400);
  const raw = body && body.design;
  const design = raw ? o.cleanPattern(raw) : null;
  if (!design || design.width > 40 || design.height > 200 || new TextEncoder().encode(JSON.stringify(design)).length > 32000)
    return json({ error: "طرح معتبر نیست یا از اندازه‌ی مجاز بزرگ‌تره." }, 400);
  const db = env.ACCOUNTS_DB, t = nowSec();
  const challenge = await db.prepare("SELECT * FROM challenges WHERE status = 'active' AND starts_at <= ? AND ends_at >= ? ORDER BY starts_at DESC LIMIT 1").bind(t, t).first();
  if (!challenge) return json({ error: "الان چالش بازی در جریان نیست." }, 409);
  const allowed = parseColors(challenge.allowed_colors);
  if (allowed.length) {
    const bad = Object.keys(design.counts || {}).filter((c) => !allowed.includes(c));
    if (bad.length) return json({ error: "این طرح رنگ‌های خارج از لیست چالش داره.", disallowed: bad }, 400);
  }
  const existing = await db.prepare("SELECT id, status FROM challenge_entries WHERE challenge_id = ? AND user_id = ?").bind(challenge.id, user.id).first();
  if (existing && existing.status === "winner") return json({ error: "طرح برنده رو دیگه نمی‌شه عوض کرد." }, 409);
  const id = existing ? existing.id : crypto.randomUUID();
  const stmts = [];
  if (existing) stmts.push(db.prepare("DELETE FROM challenge_votes WHERE entry_id = ?").bind(id));
  stmts.push(db.prepare(`INSERT INTO challenge_entries (id, challenge_id, user_id, title, nickname, design_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    ON CONFLICT(challenge_id, user_id) DO UPDATE SET title = excluded.title, nickname = excluded.nickname,
      design_json = excluded.design_json, status = 'pending', updated_at = excluded.updated_at`)
    .bind(id, challenge.id, user.id, title, nickname, JSON.stringify(design), t, t));
  await db.batch(stmts);
  return json({ ok: true, id, status: "pending", replaced: !!existing }, existing ? 200 : 201);
}

async function deleteEntry(request, env, id) {
  if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
  const user = await getAccountUser(request, env);
  if (!user) return json({ error: "اول وارد شو." }, 401);
  const row = await env.ACCOUNTS_DB.prepare("SELECT status FROM challenge_entries WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!row) return json({ error: "طرح پیدا نشد." }, 404);
  if (row.status === "winner") return json({ error: "برای حذف طرح برنده با ما تماس بگیر." }, 409);
  await env.ACCOUNTS_DB.prepare("DELETE FROM challenge_entries WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}

async function toggleVote(request, env, id, o) {
  if (!requestIsSameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
  const user = await getAccountUser(request, env);
  if (!user) return json({ error: "برای رأی دادن اول با تلگرام وارد شو." }, 401);
  if (!(await o.rateLimit(env, "chal:vote:" + user.id, 60, 3600 * 1000))) return json({ error: "خیلی سریع شد؛ کمی بعد دوباره امتحان کن." }, 429);
  const db = env.ACCOUNTS_DB, t = nowSec();
  const entry = await db.prepare(`SELECT e.id, e.user_id, c.status AS cstatus, c.starts_at, c.ends_at FROM challenge_entries e
    JOIN challenges c ON c.id = e.challenge_id WHERE e.id = ? AND e.status IN ('approved', 'winner')`).bind(id).first();
  if (!entry) return json({ error: "طرح پیدا نشد." }, 404);
  if (!isOpen({ status: entry.cstatus, starts_at: entry.starts_at, ends_at: entry.ends_at }, t)) return json({ error: "رأی‌گیری این چالش بسته شده." }, 409);
  if (entry.user_id === user.id) return json({ error: "به طرح خودت نمی‌تونی رأی بدی." }, 403);
  const had = await db.prepare("SELECT 1 AS x FROM challenge_votes WHERE entry_id = ? AND user_id = ?").bind(id, user.id).first();
  if (had) await db.prepare("DELETE FROM challenge_votes WHERE entry_id = ? AND user_id = ?").bind(id, user.id).run();
  else await db.prepare("INSERT INTO challenge_votes (entry_id, user_id, created_at) VALUES (?, ?, ?)").bind(id, user.id, t).run();
  const n = await db.prepare("SELECT COUNT(*) AS n FROM challenge_votes WHERE entry_id = ?").bind(id).first();
  return json({ ok: true, voted: !had, votes: Number(n && n.n) || 0 });
}

/* ===== ادمین ===== */
async function adminList(env, url) {
  const db = env.ACCOUNTS_DB, id = url.searchParams.get("id");
  if (id) {
    const c = await db.prepare("SELECT * FROM challenges WHERE id = ?").bind(id).first();
    if (!c) return json({ error: "چالش پیدا نشد." }, 404);
    const rows = await db.prepare(`SELECT e.id, e.title, e.nickname, e.design_json, e.status, e.prize_code, e.created_at,
        (SELECT COUNT(*) FROM challenge_votes v WHERE v.entry_id = e.id) AS votes,
        p.display_name, p.username, t.provider_subject AS telegram_id
      FROM challenge_entries e LEFT JOIN user_profiles p ON p.user_id = e.user_id
      LEFT JOIN identity_links t ON t.user_id = e.user_id AND t.provider = 'telegram'
      WHERE e.challenge_id = ? ORDER BY (e.status = 'pending') DESC, votes DESC, e.created_at ASC LIMIT 300`).bind(id).all();
    return json({
      challenge: { ...publicChallenge(c), draft: c.status === "draft" },
      entries: (rows.results || []).map((r) => ({
        id: r.id, title: r.title, nickname: r.nickname, design: parseDesign(r.design_json), status: r.status, votes: Number(r.votes) || 0,
        prizeCode: r.prize_code || null, createdAt: r.created_at,
        contact: { displayName: r.display_name || "", username: r.username || null, telegramId: r.telegram_id || null },
      })),
    });
  }
  const rows = await db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM challenge_entries e WHERE e.challenge_id = c.id) AS entries,
      (SELECT COUNT(*) FROM challenge_entries e WHERE e.challenge_id = c.id AND e.status = 'pending') AS pending
    FROM challenges c ORDER BY c.starts_at DESC LIMIT 100`).all();
  return json((rows.results || []).map((c) => ({ ...publicChallenge(c), entries: Number(c.entries) || 0, pending: Number(c.pending) || 0 })));
}

function readFields(b, isValidColor) {
  const title = clean(b.title, 80), theme = clean(b.theme, 160), rules = String(b.rules || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 1000);
  const startsAt = toSec(b.startsAt), endsAt = toSec(b.endsAt);
  const colors = Array.isArray(b.allowedColors) ? [...new Set(b.allowedColors.map(String))] : [];
  const percent = Math.round(Number(b.prizePercent == null ? 20 : b.prizePercent));
  if (title.length < 3) return { error: "عنوان چالش حداقل ۳ حرف باشه." };
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return { error: "تاریخ شروع و پایان معتبر نیست (پایان باید بعد از شروع باشه)." };
  if (colors.length > 40 || colors.some((c) => !isValidColor(c))) return { error: "یکی از رنگ‌های انتخاب‌شده توی پالت cara نیست." };
  if (!(percent >= 5 && percent <= 50)) return { error: "درصد جایزه باید بین ۵ تا ۵۰ باشه." };
  return { title, theme, rules, startsAt, endsAt, colors, percent };
}

async function adminAction(request, env, o) {
  let b; try { b = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const db = env.ACCOUNTS_DB, t = nowSec(), action = String(b && b.action || "");
  if (action === "create" || action === "update") {
    const f = readFields(b, o.isValidColor); if (f.error) return json({ error: f.error }, 400);
    const status = ["draft", "active", "closed"].includes(b.status) ? b.status : "draft";
    if (action === "create") {
      const id = crypto.randomUUID();
      await db.prepare(`INSERT INTO challenges (id, title, theme, rules, allowed_colors, prize_percent, starts_at, ends_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, f.title, f.theme, f.rules, JSON.stringify(f.colors), f.percent, f.startsAt, f.endsAt, status, t, t).run();
      return json({ ok: true, id }, 201);
    }
    const id = String(b.id || "").trim();
    if (!id) return json({ error: "شناسه‌ی چالش معتبر نیست." }, 400);
    const exists = await db.prepare("SELECT id FROM challenges WHERE id = ?").bind(id).first();
    if (!exists) return json({ error: "چالش پیدا نشد." }, 404);
    const r = await db.prepare(`UPDATE challenges SET title = ?, theme = ?, rules = ?, allowed_colors = ?, prize_percent = ?, starts_at = ?, ends_at = ?, status = ?, updated_at = ? WHERE id = ?`)
      .bind(f.title, f.theme, f.rules, JSON.stringify(f.colors), f.percent, f.startsAt, f.endsAt, status, t, id).run();
    return json({ ok: true, changed: Number(r.meta && r.meta.changes || 0) });
  }
  if (action === "delete") {
    const id = String(b.id || "").trim();
    if (!id) return json({ error: "شناسه‌ی چالش معتبر نیست." }, 400);
    const existing = await db.prepare("SELECT id FROM challenges WHERE id = ?").bind(id).first();
    if (!existing) return json({ error: "چالش پیدا نشد." }, 404);
    // با حذف چالش، طرح‌ها و رأی‌های وابسته هم به‌واسطه‌ی ON DELETE CASCADE پاک می‌شوند.
    await db.prepare("DELETE FROM challenges WHERE id = ?").bind(id).run();
    return json({ ok: true, deleted: true });
  }
  if (action === "set-status") {
    if (!["draft", "active", "closed"].includes(b.status)) return json({ error: "وضعیت نامعتبر." }, 400);
    const r = await db.prepare("UPDATE challenges SET status = ?, updated_at = ? WHERE id = ?").bind(b.status, t, String(b.id || "")).run();
    return json({ ok: true, changed: Number(r.meta && r.meta.changes || 0) });
  }
  if (action === "review") {
    if (!["pending", "approved", "rejected", "winner"].includes(b.status)) return json({ error: "وضعیت نامعتبر." }, 400);
    const r = await db.prepare("UPDATE challenge_entries SET status = ?, updated_at = ? WHERE id = ?").bind(b.status, t, String(b.entryId || "")).run();
    return json({ ok: true, changed: Number(r.meta && r.meta.changes || 0) });
  }
  if (action === "prize") {
    const e = await db.prepare(`SELECT e.id, e.status, e.prize_code, c.prize_percent FROM challenge_entries e JOIN challenges c ON c.id = e.challenge_id WHERE e.id = ?`).bind(String(b.entryId || "")).first();
    if (!e) return json({ error: "طرح پیدا نشد." }, 404);
    if (e.status !== "winner") return json({ error: "اول این طرح رو «برنده» کن." }, 409);
    if (e.prize_code) return json({ ok: true, code: e.prize_code, percent: e.prize_percent, existing: true, validDays: 7 });
    const code = await o.mintCode(env, e.prize_percent);
    await db.prepare("UPDATE challenge_entries SET prize_code = ?, updated_at = ? WHERE id = ?").bind(code, t, e.id).run();
    return json({ ok: true, code, percent: e.prize_percent, validDays: 7 });
  }
  return json({ error: "action نامعتبر." }, 400);
}

/* o: { rateLimit, cleanPattern, mintCode, isValidColor, adminGuard } */
export async function handleChallengeRequest(request, env, url, o) {
  const p = url.pathname, m = request.method;
  if (p !== "/api/challenge" && !p.startsWith("/api/challenge/") && p !== "/api/admin/challenges") return null;
  if (!env.ACCOUNTS_DB) return json({ error: "پایگاه داده در دسترس نیست." }, 503);
  if (p === "/api/admin/challenges") {
    const denied = await o.adminGuard(request); if (denied) return denied;
    try {
      if (m === "GET") return await adminList(env, url);
      if (m === "POST") return await adminAction(request, env, o);
      return json({ error: "method not allowed" }, 405);
    } catch (e) {
      console.error("[challenge-admin] request failed:", e);
      return json({ error: "خطای سرور در مدیریت چالش", detail: String(e && e.message || e).slice(0, 300) }, 500);
    }
  }
  if (p === "/api/challenge" && m === "GET") return json(await publicState(request, env));
  if (p === "/api/challenge/entries" && m === "POST") return submitEntry(request, env, o);
  let mt = p.match(/^\/api\/challenge\/entries\/([0-9a-f-]{36})$/i);
  if (mt && m === "DELETE") return deleteEntry(request, env, mt[1]);
  mt = p.match(/^\/api\/challenge\/entries\/([0-9a-f-]{36})\/vote$/i);
  if (mt && m === "POST") return toggleVote(request, env, mt[1], o);
  return json({ error: "not found" }, 404);
}
