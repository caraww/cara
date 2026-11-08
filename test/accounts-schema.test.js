const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "migrations/0001_accounts.sql"), "utf8");

test("account schema separates identity, sessions, saved designs, and carts", () => {
  for (const table of [
    "users",
    "identity_links",
    "sessions",
    "designs",
    "carts",
    "cart_items",
    "order_access_tokens",
  ]) {
    assert.match(schema, new RegExp("CREATE TABLE IF NOT EXISTS " + table + "\\b"));
  }
});

test("provider identities are verified and globally unique per provider", () => {
  assert.match(schema, /provider IN \('telegram', 'bale'\)/);
  assert.match(schema, /provider_subject TEXT NOT NULL/);
  assert.match(schema, /verified_at INTEGER NOT NULL/);
  assert.match(schema, /UNIQUE \(provider, provider_subject\)/);
});

test("sessions and order access tokens store hashes, expiry, and revocation metadata", () => {
  assert.match(schema, /token_hash TEXT PRIMARY KEY[\s\S]*?length\(token_hash\) = 64/);
  assert.match(schema, /expires_at INTEGER NOT NULL/);
  assert.match(schema, /revoked_at INTEGER/);
  assert.match(schema, /CHECK \(expires_at > created_at\)/);
});

test("guest and account carts have exclusive ownership and bounded quantities", () => {
  assert.match(schema, /user_id IS NOT NULL AND guest_id IS NULL/);
  assert.match(schema, /user_id IS NULL AND guest_id IS NOT NULL/);
  assert.match(schema, /quantity BETWEEN 1 AND 20/);
  assert.match(schema, /UNIQUE \(cart_id, item_key\)/);
  assert.match(schema, /json_valid\(snapshot_json\)/);
});

test("account migration does not redefine payment or existing ORDERS storage", () => {
  assert.doesNotMatch(schema, /DROP TABLE|ALTER TABLE|UPDATE orders|DELETE FROM orders/i);
  assert.match(schema, /Existing ORDERS KV records and the payment lifecycle are intentionally untouched/);
});
