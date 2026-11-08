const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "migrations/0001_accounts.sql"), "utf8");
const auth = fs.readFileSync(path.join(root, "migrations/0002_account_sessions.sql"), "utf8");
const handler = fs.readFileSync(path.join(root, "lib/accounts.mjs"), "utf8");

test("account schema separates identity, sessions, saved designs, and carts", () => {
  for (const table of ["users", "identity_links", "sessions", "designs", "carts", "cart_items", "order_access_tokens"]) {
    assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS " + table));
  }
});

test("provider identities are verified and globally unique per provider", () => {
  assert.ok(schema.includes("provider IN ('telegram', 'bale')"));
  assert.ok(schema.includes("provider_subject TEXT NOT NULL"));
  assert.ok(schema.includes("verified_at INTEGER NOT NULL"));
  assert.ok(schema.includes("UNIQUE (provider, provider_subject)"));
});

test("sessions and order access tokens store hashes, expiry, and revocation metadata", () => {
  assert.ok(schema.includes("length(token_hash) = 64"));
  assert.ok(schema.includes("expires_at INTEGER NOT NULL"));
  assert.ok(schema.includes("revoked_at INTEGER"));
  assert.ok(schema.includes("CHECK (expires_at > created_at)"));
});

test("guest and account carts have exclusive ownership and bounded quantities", () => {
  assert.ok(schema.includes("user_id IS NOT NULL AND guest_id IS NULL"));
  assert.ok(schema.includes("user_id IS NULL AND guest_id IS NOT NULL"));
  assert.ok(schema.includes("quantity BETWEEN 1 AND 20"));
  assert.ok(schema.includes("UNIQUE (cart_id, item_key)"));
  assert.ok(schema.includes("json_valid(snapshot_json)"));
});

test("account migrations do not redefine payment or existing ORDERS storage", () => {
  assert.doesNotMatch(schema + auth, /DROP TABLE|ALTER TABLE|UPDATE orders|DELETE FROM orders/i);
  assert.ok(schema.includes("Existing ORDERS KV records and the payment lifecycle are intentionally untouched"));
});

test("account login replay protection and minimal profile metadata are persisted", () => {
  assert.ok(auth.includes("CREATE TABLE IF NOT EXISTS account_login_events"));
  assert.ok(auth.includes("payload_hash TEXT PRIMARY KEY"));
  assert.ok(auth.includes("CREATE TABLE IF NOT EXISTS user_profiles"));
});

test("account API uses Telegram HMAC, fresh auth_date, hashed cookies, CSRF origin checks, and user-scoped design deletes", () => {
  assert.ok(handler.includes('name: "HMAC", hash: "SHA-256"'));
  assert.ok(handler.includes("TELEGRAM_MAX_AGE"));
  assert.ok(handler.includes("HttpOnly; Secure; SameSite=Lax"));
  assert.ok(handler.includes("requestIsSameOrigin"));
  assert.ok(handler.includes("DELETE FROM designs WHERE id = ? AND user_id = ?"));
});
