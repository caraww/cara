import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const { verifyTelegramLogin, sha256, SESSION_TTL } = await import("../lib/accounts.mjs");

async function signedPayload(fields, token = "test-bot-token") {
  const data = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const key = await webcrypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hash = [...new Uint8Array(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))]
    .map((v) => v.toString(16).padStart(2, "0")).join("");
  return { ...fields, hash };
}

test("Telegram signed login payload is accepted and normalized", async () => {
  const payload = await signedPayload({
    id: "123456789", first_name: "Cara", last_name: "Customer",
    username: "cara_user", auth_date: "2000000000",
  });
  const identity = await verifyTelegramLogin(payload, "test-bot-token", 2000000000);
  assert.deepEqual(identity, { id: "123456789", firstName: "Cara", lastName: "Customer", username: "cara_user" });
});

test("Telegram login rejects tampered or malformed payloads", async () => {
  const payload = await signedPayload({ id: "123456789", first_name: "Cara", auth_date: "2000000000" });
  payload.first_name = "Impersonator";
  assert.equal(await verifyTelegramLogin(payload, "test-bot-token", 2000000000), null);
  assert.equal(await verifyTelegramLogin({ id: "not-a-number", auth_date: "2000000000", hash: "0".repeat(64) }, "test-bot-token", 2000000000), null);
});

test("Telegram login rejects stale and future-dated authentication", async () => {
  const stale = await signedPayload({ id: "123456789", auth_date: "1999999000" });
  const future = await signedPayload({ id: "123456789", auth_date: "2000000100" });
  assert.equal(await verifyTelegramLogin(stale, "test-bot-token", 2000000000), null);
  assert.equal(await verifyTelegramLogin(future, "test-bot-token", 2000000000), null);
});

test("session token hashes are SHA-256 hex and sessions have bounded lifetime", async () => {
  const digest = await sha256("opaque-session-token");
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(SESSION_TTL, 30 * 24 * 60 * 60);
});
