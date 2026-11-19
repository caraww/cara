import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { handleChallengeRequest } from "../lib/challenge.mjs";
import { sha256 } from "../lib/accounts.mjs";

/* تست روی SQLite واقعی (node:sqlite). Node 20 توی CI اینو نداره؛ اون‌جا تست‌ها skip می‌شن. */
let DatabaseSync = null;
try { ({ DatabaseSync } = await import("node:sqlite")); } catch {}
const skip = !DatabaseSync && "node:sqlite نیست (Node >= 22.5 لازمه)";

const root = new URL("../", import.meta.url);
const sql = (f) => fs.readFileSync(new URL("migrations/" + f, root), "utf8");

function makeD1() {
  const db = new DatabaseSync(":memory:");
  for (const f of ["0001_accounts.sql", "0002_account_sessions.sql", "0005_challenges.sql"]) db.exec(sql(f));
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    first: async () => db.prepare(q).get(...args) ?? null,
    all: async () => ({ results: db.prepare(q).all(...args) }),
    run: async () => { const r = db.prepare(q).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
    _run: () => db.prepare(q).run(...args),
  });
  return { raw: db, prepare: (q) => stmt(q), batch: async (list) => { list.forEach((s) => s._run()); return list.map(() => ({ success: true })); } };
}

const BASE = "https://caraw.ir";
const env0 = () => ({ ACCOUNTS_DB: makeD1(), BASE_URL: BASE });
const opts = {
  rateLimit: async () => true,
  cleanPattern: (p) => (p && Array.isArray(p.data) && p.data.length ? { width: p.data[0].length, height: p.data.length, data: p.data, counts: p.counts || {}, total: 1 } : null),
  mintCode: async () => "CARA-ABCD1234",
  isValidColor: (c) => /^DB\d+$/.test(c),
  adminGuard: async (req) => (req.headers.get("Authorization") === "Bearer admin" ? null : new Response("{}", { status: 401 })),
};
async function login(env, id) {
  const raw = (id + "0".repeat(64)).slice(0, 64).replace(/[^a-f0-9]/g, "a");
  const now = Math.floor(Date.now() / 1000);
  env.ACCOUNTS_DB.raw.prepare("INSERT OR IGNORE INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)").run(id, now, now);
  env.ACCOUNTS_DB.raw.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").run(await sha256(raw), id, now, now + 3600, now);
  return "__Host-cara_session=" + raw;
}
const call = (env, method, path, { cookie, body, admin, origin = BASE } = {}) => handleChallengeRequest(
  new Request(BASE + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(origin && method !== "GET" ? { Origin: origin } : {}), ...(admin ? { Authorization: "Bearer admin" } : {}), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
  env, new URL(BASE + path), opts);
const design = (colors = ["DB0010"]) => ({ data: [colors, colors], counts: Object.fromEntries(colors.map((c) => [c, 2])) });
const hour = 3600;
const now = () => Math.floor(Date.now() / 1000);
async function seedChallenge(env, extra = {}) {
  const r = await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "create", title: "چالش آبی", theme: "اقیانوس", allowedColors: ["DB0010", "DB0725"], startsAt: now() - hour, endsAt: now() + hour, status: "active", ...extra } });
  return (await r.json()).id;
}

test("admin endpoints are closed without the admin token", { skip }, async () => {
  const env = env0();
  assert.equal((await call(env, "GET", "/api/admin/challenges")).status, 401);
  assert.equal((await call(env, "POST", "/api/admin/challenges", { body: { action: "create" } })).status, 401);
});

test("admin creates a challenge and validates its fields", { skip }, async () => {
  const env = env0();
  const bad = await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "create", title: "x", startsAt: 5, endsAt: 1 } });
  assert.equal(bad.status, 400);
  const id = await seedChallenge(env);
  const list = await (await call(env, "GET", "/api/admin/challenges", { admin: true })).json();
  assert.equal(list.length, 1); assert.equal(list[0].id, id); assert.equal(list[0].open, true);
  const pub = await (await call(env, "GET", "/api/challenge")).json();
  assert.equal(pub.challenge.title, "چالش آبی"); assert.deepEqual(pub.challenge.allowedColors, ["DB0010", "DB0725"]); assert.equal(pub.loggedIn, false);
});

test("submitting needs login, same origin, a valid title/nickname and allowed colors", { skip }, async () => {
  const env = env0(); await seedChallenge(env);
  const body = { title: "موج", nickname: "سارا", design: design() };
  assert.equal((await call(env, "POST", "/api/challenge/entries", { body })).status, 401);
  const cookie = await login(env, "u1");
  assert.equal((await call(env, "POST", "/api/challenge/entries", { cookie, body, origin: "https://evil.example" })).status, 403);
  assert.equal((await call(env, "POST", "/api/challenge/entries", { cookie, body: { ...body, nickname: "" } })).status, 400);
  const off = await call(env, "POST", "/api/challenge/entries", { cookie, body: { ...body, design: design(["DB0010", "DB9999"]) } });
  assert.equal(off.status, 400); assert.deepEqual((await off.json()).disallowed, ["DB9999"]);
  assert.equal((await call(env, "POST", "/api/challenge/entries", { cookie, body })).status, 201);
});

test("entries stay private until approved; the owner sees their own pending entry", { skip }, async () => {
  const env = env0(); await seedChallenge(env);
  const c1 = await login(env, "u1"), c2 = await login(env, "u2");
  const { id } = await (await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "موج", nickname: "سارا", design: design() } })).json();
  const guest = await (await call(env, "GET", "/api/challenge")).json();
  assert.equal(guest.entries.length, 0);
  const mine = await (await call(env, "GET", "/api/challenge", { cookie: c1 })).json();
  assert.equal(mine.entries.length, 1); assert.equal(mine.entries[0].mine, true); assert.equal(mine.entries[0].status, "pending");
  assert.equal((await (await call(env, "GET", "/api/challenge", { cookie: c2 })).json()).entries.length, 0);
  await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "review", entryId: id, status: "approved" } });
  const pub = await (await call(env, "GET", "/api/challenge")).json();
  assert.equal(pub.entries.length, 1); assert.equal(pub.entries[0].nickname, "سارا");
  assert.equal("userId" in pub.entries[0] || "user_id" in pub.entries[0], false);
});

test("one entry per user: resubmitting replaces it, goes back to pending and clears votes", { skip }, async () => {
  const env = env0(); await seedChallenge(env);
  const c1 = await login(env, "u1"), c2 = await login(env, "u2");
  const first = await (await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "یک", nickname: "سارا", design: design() } })).json();
  await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "review", entryId: first.id, status: "approved" } });
  assert.equal((await (await call(env, "POST", `/api/challenge/entries/${first.id}/vote`, { cookie: c2 })).json()).votes, 1);
  const again = await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "دو", nickname: "سارا", design: design() } });
  const r = await again.json(); assert.equal(again.status, 200); assert.equal(r.id, first.id); assert.equal(r.replaced, true);
  const mine = await (await call(env, "GET", "/api/challenge", { cookie: c1 })).json();
  assert.equal(mine.entries.length, 1); assert.equal(mine.entries[0].title, "دو"); assert.equal(mine.entries[0].votes, 0); assert.equal(mine.entries[0].status, "pending");
});

test("voting: login required, no self-vote, toggles on/off, only on approved entries", { skip }, async () => {
  const env = env0(); await seedChallenge(env);
  const c1 = await login(env, "u1"), c2 = await login(env, "u2");
  const { id } = await (await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "موج", nickname: "سارا", design: design() } })).json();
  const url = `/api/challenge/entries/${id}/vote`;
  assert.equal((await call(env, "POST", url, { cookie: c2 })).status, 404);               // still pending
  await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "review", entryId: id, status: "approved" } });
  assert.equal((await call(env, "POST", url)).status, 401);
  assert.equal((await call(env, "POST", url, { cookie: c1 })).status, 403);               // own entry
  assert.deepEqual(await (await call(env, "POST", url, { cookie: c2 })).json(), { ok: true, voted: true, votes: 1 });
  assert.deepEqual(await (await call(env, "POST", url, { cookie: c2 })).json(), { ok: true, voted: false, votes: 0 });
});

test("winner flow: prize code is minted once and only for winners; votes close with the challenge", { skip }, async () => {
  const env = env0(); const cid = await seedChallenge(env);
  const c1 = await login(env, "u1"), c2 = await login(env, "u2");
  const { id } = await (await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "موج", nickname: "سارا", design: design() } })).json();
  const prize = () => call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "prize", entryId: id } });
  assert.equal((await prize()).status, 409);
  await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "review", entryId: id, status: "winner" } });
  const p1 = await (await prize()).json(); assert.equal(p1.code, "CARA-ABCD1234"); assert.equal(p1.validDays, 7);
  assert.equal((await (await prize()).json()).existing, true);
  await call(env, "POST", "/api/admin/challenges", { admin: true, body: { action: "set-status", id: cid, status: "closed" } });
  assert.equal((await call(env, "POST", `/api/challenge/entries/${id}/vote`, { cookie: c2 })).status, 409);
  assert.equal((await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "دوباره", nickname: "سارا", design: design() } })).status, 409);
  const pub = await (await call(env, "GET", "/api/challenge")).json();
  assert.equal(pub.winners.length, 1); assert.equal(pub.winners[0].nickname, "سارا"); assert.equal(pub.challenge.open, false);
  const detail = await (await call(env, "GET", `/api/admin/challenges?id=${cid}`, { admin: true })).json();
  assert.equal(detail.entries[0].prizeCode, "CARA-ABCD1234");
});

test("owners can withdraw their entry (not once it has won)", { skip }, async () => {
  const env = env0(); await seedChallenge(env);
  const c1 = await login(env, "u1");
  const { id } = await (await call(env, "POST", "/api/challenge/entries", { cookie: c1, body: { title: "موج", nickname: "سارا", design: design() } })).json();
  assert.equal((await call(env, "DELETE", `/api/challenge/entries/${id}`, { cookie: await login(env, "u2") })).status, 404);
  assert.equal((await call(env, "DELETE", `/api/challenge/entries/${id}`, { cookie: c1 })).status, 200);
  assert.equal((await (await call(env, "GET", "/api/challenge", { cookie: c1 })).json()).entries.length, 0);
});

test("Worker wiring: challenge handler runs before accounts and admin routes use the admin guard", () => {
  const w = fs.readFileSync(new URL("index.js", root), "utf8");
  assert.ok(w.indexOf("handleChallengeRequest(request, env, url") > 0);
  assert.match(w, /adminGuard: async \(req\) => \{\s*const gate = await adminGate\(req, env\); if \(gate\) return gate;\s*return authed\(req, env\)/);
});
