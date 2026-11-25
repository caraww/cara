import test from "node:test";
import assert from "node:assert/strict";
import { handleAccountRequest } from "../lib/accounts.mjs";

function memoryDb() {
  const users = new Map(), credentials = new Map(), profiles = new Map(), sessions = new Map();
  const run = (sql, args) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT user_id FROM local_credentials WHERE login_id")) {
      const row = credentials.get(args[0]);
      return row ? { user_id: row.user_id } : null;
    }
    if (s.startsWith("SELECT c.user_id, c.password_hash, u.status")) {
      const row = credentials.get(args[0]);
      if (!row) return null;
      return { ...row, status: users.get(row.user_id)?.status };
    }
    if (s.startsWith("INSERT INTO users")) {
      users.set(args[0], { id: args[0], status: "active" });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("INSERT INTO local_credentials")) {
      credentials.set(args[1], { user_id: args[0], login_id: args[1], password_hash: args[2] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("INSERT INTO user_profiles")) {
      profiles.set(args[0], { user_id: args[0], display_name: args[1], phone: args[2] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("INSERT INTO sessions")) {
      sessions.set(args[0], { user_id: args[1] });
      return { meta: { changes: 1 } };
    }
    throw new Error("unexpected SQL: " + s);
  };
  const prepare = (sql) => {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return run(sql, args); },
      async run() { return run(sql, args); },
      async all() { return { results: [] }; },
    };
    return statement;
  };
  return { prepare, batch: async (statements) => { for (const statement of statements) await statement.run(); }, users, credentials, profiles, sessions };
}

const request = (path, body) => ({
  method: "POST",
  headers: { get: (name) => (name === "Origin" ? "https://caraw.ir" : name === "Content-Type" ? "application/json" : null) },
  json: async () => body,
});
const url = (path) => new URL("https://caraw.ir" + path);

test("a visitor can register locally and then log in with the same password", async () => {
  const env = { BASE_URL: "https://caraw.ir", ACCOUNTS_DB: memoryDb() };
  const registered = await handleAccountRequest(
    request("/api/auth/register", { name: "سارا", identifier: "Sara@Example.com", password: "correct horse battery" }),
    env, url("/api/auth/register"), null, null,
  );
  assert.equal(registered.status, 201);
  assert.match(registered.headers.get("Set-Cookie"), /__Host-cara_session=[a-f0-9]{64}/);
  assert.equal(env.ACCOUNTS_DB.credentials.get("sara@example.com").login_id, "sara@example.com");

  const loggedIn = await handleAccountRequest(
    request("/api/auth/login", { identifier: "sara@example.com", password: "correct horse battery" }),
    env, url("/api/auth/login"), null, null,
  );
  assert.equal(loggedIn.status, 200);
  assert.match(loggedIn.headers.get("Set-Cookie"), /__Host-cara_session=/);
});

test("local login rejects a wrong password and duplicate registration", async () => {
  const env = { BASE_URL: "https://caraw.ir", ACCOUNTS_DB: memoryDb() };
  const payload = { name: "سارا", identifier: "09123456789", password: "correct horse battery" };
  assert.equal((await handleAccountRequest(request("/api/auth/register", payload), env, url("/api/auth/register"), null, null)).status, 201);
  assert.equal((await handleAccountRequest(request("/api/auth/register", payload), env, url("/api/auth/register"), null, null)).status, 409);
  const wrong = await handleAccountRequest(
    request("/api/auth/login", { identifier: "09123456789", password: "wrong password" }),
    env, url("/api/auth/login"), null, null,
  );
  assert.equal(wrong.status, 401);
});
