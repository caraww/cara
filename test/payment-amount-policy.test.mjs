import test from "node:test";
import assert from "node:assert/strict";
import { verifiedAmountMatches } from "../lib/payment-policy.mjs";

test("verified payment amount must exactly match the server order total", () => {
  assert.equal(verifiedAmountMatches({ amount: 4900000 }, 4900000), true);
  assert.equal(verifiedAmountMatches({ amount: "4900000" }, 4900000), true);
});

test("a missing or non-numeric amount fails closed", () => {
  assert.equal(verifiedAmountMatches({ result: 100 }, 4900000), false);
  assert.equal(verifiedAmountMatches({ amount: null }, 4900000), false);
  assert.equal(verifiedAmountMatches({ amount: "abc" }, 4900000), false);
});

test("a mismatched amount is rejected", () => {
  assert.equal(verifiedAmountMatches({ amount: 10000 }, 4900000), false);
  assert.equal(verifiedAmountMatches({ amount: 0 }, 4900000), false);
});
