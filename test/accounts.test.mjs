import test from "node:test";
import assert from "node:assert/strict";

const { hashPassword, verifyPassword, normalizeLoginId, sha256, normalizePhone, SESSION_TTL } = await import("../lib/accounts.mjs");

test("local passwords are salted, hashed, and verified in constant-time form", async () => {
  const first = await hashPassword("correct horse battery");
  const second = await hashPassword("correct horse battery");
  assert.match(first, /^pbkdf2-sha256\$210000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.notEqual(first, second, "each password gets a fresh salt");
  assert.equal(await verifyPassword("correct horse battery", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("correct horse battery", "not-a-hash"), false);
  assert.equal(await verifyPassword("correct horse battery", "pbkdf2-sha256$1$00$" + "0".repeat(64)), false);
});

test("local login identifiers accept normalized email or Iranian phone", () => {
  assert.equal(normalizeLoginId("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeLoginId("09123456789"), "+989123456789");
  assert.equal(normalizeLoginId("۰۹۱۲۳۴۵۶۷۸۹"), "+989123456789");
  assert.equal(normalizeLoginId("not-an-email"), null);
  assert.equal(normalizeLoginId("user@example"), null);
  assert.equal(normalizeLoginId(""), null);
});

test("session token hashes are SHA-256 hex and sessions have bounded lifetime", async () => {
  const digest = await sha256("opaque-session-token");
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(SESSION_TTL, 30 * 24 * 60 * 60);
});

test("Iranian phone numbers are normalized to E.164", () => {
  assert.equal(normalizePhone("09123456789"), "+989123456789");
  assert.equal(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹"), "+989123456789");
  assert.equal(normalizePhone("+989123456789"), "+989123456789");
  assert.equal(normalizePhone("00989123456789"), "+989123456789");
  assert.equal(normalizePhone("9123456789"), "+989123456789");
  assert.equal(normalizePhone("+98 (0) 912-345-6789"), "+989123456789");
  assert.equal(normalizePhone("  ۰۰۹۸ ۹۱۲ ۳۴۵ ۶۷۸۹  "), "+989123456789");
  assert.equal(normalizePhone("٠٩١٢٣٤٥٦٧٨٩"), "+989123456789");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone(""), null);
});
