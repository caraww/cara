import test from "node:test";
import assert from "node:assert/strict";

const credentials = {
  DIGIPAY_CLIENT_ID: "client-id",
  DIGIPAY_CLIENT_SECRET: "client-secret",
  DIGIPAY_USERNAME: "merchant-user",
  DIGIPAY_PASSWORD: "merchant-password",
  DIGIPAY_BASE: "https://uat.mydigipay.info/digipay/api",
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("DigiPay requests a token with Basic auth and multipart form fields", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1
      ? response({ access_token: "test-token", expires_in: 3600 })
      : response({ result: { status: 1 } }, 400);
  };
  try {
    const api = await import("../lib/digipay.mjs?auth-contract");
    assert.equal(api.digipayConfigured(credentials), true);
    await api.digipayVerify(credentials, { trackingCode: "track-1", providerId: "order-1", type: 11 });
    assert.equal(calls[0].url, credentials.DIGIPAY_BASE + "/oauth/token");
    assert.match(calls[0].init.headers.Authorization, /^Basic /);
    assert.ok(calls[0].init.body instanceof FormData);
    assert.equal(calls[0].init.body.get("username"), credentials.DIGIPAY_USERNAME);
    assert.equal(calls[0].init.body.get("password"), credentials.DIGIPAY_PASSWORD);
    assert.equal(calls[0].init.body.get("grant_type"), "password");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DigiPay ticket uses the documented UPG endpoint, headers and rial amount", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return response({ access_token: "test-token", expires_in: 3600 });
    return response({ redirectUrl: "https://uatweb.mydigipay.info/pay/test", ticket: "ticket-1", result: { status: 0 } });
  };
  try {
    const api = await import("../lib/digipay.mjs?ticket-contract");
    const result = await api.digipayCreateTicket(credentials, {
      amountRial: 250000,
      phone: "09123456789",
      providerId: "order-uuid",
      callbackUrl: "https://caraw.ir/api/digipay-callback",
    });
    assert.equal(result.ok, true);
    assert.equal(calls[1].url, credentials.DIGIPAY_BASE + "/tickets/business?type=11");
    assert.equal(calls[1].init.headers.Authorization, "Bearer test-token");
    assert.equal(calls[1].init.headers.Agent, "WEB");
    assert.equal(calls[1].init.headers["Digipay-Version"], "2022-02-02");
    assert.deepEqual(JSON.parse(calls[1].init.body), {
      amount: 250000,
      cellNumber: "09123456789",
      providerId: "order-uuid",
      callbackUrl: "https://caraw.ir/api/digipay-callback",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DigiPay verify sends trackingCode and providerId in body and requires a verified amount", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return response({ access_token: "test-token", expires_in: 3600 });
    return response({
      trackingCode: "track-1",
      providerId: "order-1",
      amount: "250000",
      rrn: "rrn-1",
      result: { status: 0 },
    });
  };
  try {
    const api = await import("../lib/digipay.mjs?verify-contract");
    const result = await api.digipayVerify(credentials, {
      trackingCode: "track-1",
      providerId: "order-1",
      type: 0,
    });
    assert.equal(calls[1].url, credentials.DIGIPAY_BASE + "/purchases/verify?type=0");
    assert.deepEqual(JSON.parse(calls[1].init.body), {
      trackingCode: "track-1",
      providerId: "order-1",
    });
    assert.equal(result.result, 100);
    assert.equal(result.amount, 250000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DigiPay verify never reports paid when the response omits the amount", async () => {
  const originalFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count += 1;
    if (count === 1) return response({ access_token: "test-token", expires_in: 3600 });
    return response({ result: { status: 0 } });
  };
  try {
    const api = await import("../lib/digipay.mjs?verify-amount-required");
    const result = await api.digipayVerify(credentials, {
      trackingCode: "track-1",
      providerId: "order-1",
      type: 11,
    });
    assert.equal(result.result, -1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
