import test from "node:test";
import assert from "node:assert/strict";
import { handleReviewRequest } from "../lib/reviews.mjs";

function db(guestRows = []) {
  const inserted = [];
  return {
    inserted,
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) { statement.args = args; return statement; },
        async run() { inserted.push({ sql: sql.replace(/\s+/g, " ").trim(), args: statement.args }); return { meta: { changes: 1 } }; },
        async all() {
          if (sql.includes("FROM guest_reviews")) return { results: guestRows };
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

const request = (body) => ({
  method: "POST",
  headers: { get: (name) => (name === "Origin" ? "https://caraw.ir" : null) },
  json: async () => body,
});

test("any visitor can submit a review without a session or paid order", async () => {
  const env = { BASE_URL: "https://caraw.ir", ACCOUNTS_DB: db() };
  const response = await handleReviewRequest(
    request({ workId: "قلب-طلا", rating: 5, body: "بافتش خیلی تمیز بود و سریع رسید.", author: "سارا" }),
    env, new URL("https://caraw.ir/api/reviews"), { rateLimit: null },
  );
  assert.equal(response.status, 201);
  const insert = env.ACCOUNTS_DB.inserted[0];
  assert.match(insert.sql, /INSERT INTO guest_reviews/);
  assert.equal(insert.args[1], "قلب-طلا");
  assert.equal(insert.args[4], "سارا");
});

test("the public review list includes approved guest reviews", async () => {
  const env = {
    BASE_URL: "https://caraw.ir",
    ACCOUNTS_DB: db([{ id: "g1", rating: 4, body: "قشنگ بود.", author_name: "مهمان کارا", created_at: 100 }]),
  };
  const response = await handleReviewRequest(
    { method: "GET", headers: { get: () => null } },
    env, new URL("https://caraw.ir/api/reviews?work=قلب-طلا"), { rateLimit: null },
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.summary.count, 1);
  assert.equal(data.reviews[0].author, "مهمان کارا");
});
