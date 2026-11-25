import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReview, orderContainsWork } from "../lib/reviews.mjs";
import { publicOrderView, TOKEN_RE, newOrderToken } from "../lib/track.mjs";
import { requestIsSameOrigin } from "../lib/accounts.mjs";

test("review validation accepts a normal verified-purchase payload", () => {
  const out = validateReview({ workId: "قلب-طلا", rating: 5, body: "خیلی خوش‌دست و تمیز بافته شده بود." });
  assert.equal(out.ok, true);
  assert.equal(out.value.rating, 5);
  assert.equal(out.value.workId, "قلب-طلا");
});

test("review validation rejects bad ratings, short bodies and missing work IDs", () => {
  assert.equal(validateReview({ workId: "x", rating: 0, body: "متن کافی برای نظر" }).ok, false);
  assert.equal(validateReview({ workId: "x", rating: 6, body: "متن کافی برای نظر" }).ok, false);
  assert.equal(validateReview({ workId: "x", rating: 4, body: "کوتاه" }).ok, false);
  assert.equal(validateReview({ workId: "", rating: 4, body: "متن کافی برای نظر" }).ok, false);
});

test("review validation strips control characters and caps body length", () => {
  const out = validateReview({ workId: "w", rating: 3, body: "\u0000" + "ا".repeat(700) });
  assert.equal(out.ok, true);
  assert.equal(out.value.body.length, 600);
  assert.ok(!out.value.body.includes("\u0000"));
});

test("paid order must contain the same work ID", () => {
  assert.equal(orderContainsWork({ work: { id: "قلب-طلا" } }, "قلب-طلا"), true);
  assert.equal(orderContainsWork({ items: [{ workId: "قلب-طلا" }] }, "قلب-طلا"), true);
  assert.equal(orderContainsWork({ items: [{ workId: "اسب" }] }, "قلب-طلا"), false);
  assert.equal(orderContainsWork({ pattern: {} }, "قلب-طلا"), false);
});

test("public tracking view never exposes customer PII", () => {
  const view = publicOrderView({
    id: "12345678-1234-1234-1234-123456789abc",
    status: "paid",
    fulfillment: "weaving",
    tracking: "12345678901234567890",
    createdAt: "2026-11-21T10:00:00.000Z",
    customer: { firstName: "سارا", lastName: "احمدی", phone: "09120000000", address: "تهران" },
    pattern: { width: 15, height: 80 },
    gift: { wrap: true, message: "تولدت مبارک" },
  });
  assert.equal(view.code, "12345678");
  assert.equal(view.fulfillment, "weaving");
  assert.equal(view.gift.wrap, true);
  const text = JSON.stringify(view);
  assert.ok(!text.includes("سارا"));
  assert.ok(!text.includes("0912"));
  assert.ok(!text.includes("تهران"));
  assert.ok(!text.includes("تولدت مبارک"));
});

test("same-origin checks follow BASE_URL including local development ports", () => {
  const request = (origin) => ({ headers: { get: (name) => (name === "Origin" ? origin : null) } });
  assert.equal(requestIsSameOrigin(request("https://caraw.ir"), { BASE_URL: "https://caraw.ir" }), true);
  assert.equal(requestIsSameOrigin(request("https://www.caraw.ir"), { BASE_URL: "https://caraw.ir" }), true);
  assert.equal(requestIsSameOrigin(request("http://localhost:8787"), { BASE_URL: "http://localhost:8787" }), true);
  assert.equal(requestIsSameOrigin(request("https://evil.example"), { BASE_URL: "https://caraw.ir" }), false);
  assert.equal(requestIsSameOrigin(request(""), { BASE_URL: "https://caraw.ir" }), false);
});

test("tracking tokens are 64 lowercase hex characters", () => {
  const token = newOrderToken();
  assert.match(token, TOKEN_RE);
  assert.notEqual(token, newOrderToken());
});

test("guest reviews accept an optional display name and reject links", () => {
  const named = validateReview({ workId: "w", rating: 5, body: "بافت خیلی تمیزی داشت و زود رسید.", author: "سارا" });
  assert.equal(named.ok, true);
  assert.equal(named.value.author, "سارا");
  const anonymous = validateReview({ workId: "w", rating: 4, body: "رنگ‌ها دقیقاً مثل عکس بود." });
  assert.equal(anonymous.ok, true);
  assert.equal(anonymous.value.author, "مهمان کارا");
  assert.equal(validateReview({ workId: "w", rating: 5, body: "برای دیدن کارها به https://spam.example برو" }).ok, false);
});

test("guest review storage and UI do not require an account", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const migration = fs.readFileSync(path.join(root, "migrations/0010_guest_reviews.sql"), "utf8");
  const api = fs.readFileSync(path.join(root, "lib/reviews.mjs"), "utf8");
  const client = fs.readFileSync(path.join(root, "js/reviews.js"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS guest_reviews/);
  assert.match(migration, /status IN \('pending', 'approved', 'rejected'\)/);
  assert.match(api, /INSERT INTO guest_reviews/);
  assert.match(api, /guest_reviews WHERE work_id = \? AND status = 'approved'/);
  assert.doesNotMatch(client, /api\/account\/me|account\.html|با تلگرام وارد شو/);
  assert.match(client, /review-author/);
  assert.match(client, /هر کسی می‌تواند نظر بدهد/);
});
