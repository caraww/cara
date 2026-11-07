# Zibal relay URL and callback contract

**Status:** documentation and sandbox test plan only. The PHP relay files are hosted outside this repository and are not available here for inspection. No live payment request, secret rotation, or payment-code change is authorized by this document.

## Components and separate credentials

There are two distinct relay credentials. Do not reuse or confuse them:

- ZIBAL_RELAY_KEY: sent by the Worker as the X-Relay-Key header when it calls a Node-style relay.
- RELAY_SECRET: shared HMAC-SHA256 secret used to sign the short-lived browser payment ticket and the relay's signed callback payload.

ZIBAL_MERCHANT is the merchant value used in the Zibal JSON request. Secrets must remain in Worker/host secret stores and must never be committed to this repository or copied into logs.

## Worker-to-relay API observed in index.js

The Worker builds the API base from ZIBAL_BASE (defaulting to the Zibal gateway). For an API operation named request, verify, or inquiry, it sends:

- Method: POST
- URL: {ZIBAL_BASE}/v1/{operation}
- Headers: Content-Type: application/json, Accept: application/json, and X-Relay-Key when ZIBAL_RELAY_KEY is configured
- Body: JSON containing merchant plus the operation-specific fields
- Timeout: 15 seconds

The Node relay in tools/zibal-relay.js accepts POST /v1/request, /v1/verify, and /v1/inquiry, requires a matching X-Relay-Key, rejects bodies larger than 100 KB, forwards to https://gateway.zibal.ir, and uses a 15-second upstream timeout.

### Configuration discrepancy to resolve before changing anything

The committed wrangler.jsonc currently sets ZIBAL_BASE to https://relay.caraw.ir/relay.php. The Worker appends /v1/{operation}, which produces a path shaped like /relay.php/v1/request. The checked-in Node relay instead expects /v1/request at the host root, with no /relay.php prefix.

This may be intentional if the externally hosted PHP endpoint implements that path, but the PHP files are not in this repository, so that cannot be confirmed. Do not change ZIBAL_BASE or replace the PHP endpoint until the deployed route is verified and a sandbox test succeeds.

## Worker-to-pay.php browser ticket

The Worker creates an order in ORDERS, then returns a paymentUrl pointing to RELAY_PAY_URL (default https://relay.caraw.ir/pay.php) with query parameters d and sig.

- d is base64url-encoded JSON.
- sig is the lowercase hexadecimal HMAC-SHA256 of the exact d string using RELAY_SECRET.
- The current payload fields are o (order UUID), a (amount in rial), m (customer mobile), x (description), and e (Unix expiry time).
- The ticket expiry is 15 minutes after creation.
- The amount is converted from toman to rial before it is placed in a.

The browser is redirected to pay.php. The PHP endpoint must validate the HMAC and expiry before using the ticket. It must not trust a client-supplied amount, mobile, order ID, or description that is not inside a valid signed ticket.

## Callback contract expected by the Worker

The Worker callback route is /api/payment-callback. The default callback URL is {BASE_URL}/api/payment-callback unless CALLBACK_URL overrides it.

The Worker accepts a signed callback when d and sig are supplied as query or form fields:

- sig must equal HMAC-SHA256(RELAY_SECRET, exact d string), compared safely.
- d must decode as base64url JSON.
- Required payload fields: o (existing order UUID) and e (future expiry).
- Optional settlement fields consumed by the Worker include t (gateway track ID), a (verified amount in rial), r (reference number), and c (masked card number).
- The Worker settles the order as paid only after signature, expiry, order existence, and settlement checks pass. Unsigned callbacks do not change an order.

The PHP callback handler is expected to verify the payment with Zibal before constructing this signed payload. The exact PHP request/response and redirect implementation must be confirmed against the deployed PHP files before any code changes.

## Sandbox test plan — no production payment

1. Use a Zibal sandbox merchant and test-only RELAY_SECRET / ZIBAL_RELAY_KEY values in non-production environments.
2. Confirm the configured ZIBAL_BASE resolves to the expected route and that POST /v1/request reaches the relay.
3. Confirm missing/wrong X-Relay-Key is rejected and a valid key is accepted.
4. Confirm oversized bodies are rejected and upstream timeouts return a bounded error.
5. Create a sandbox order and verify that the d ticket has the expected fields, a rial amount, and an expiry no more than 15 minutes ahead.
6. Test a modified d, modified sig, expired ticket, unknown order UUID, wrong verified amount, and duplicate callback.
7. Confirm a valid callback changes the order once, duplicate valid callbacks are idempotent, and unsigned callbacks never mark an order paid.
8. Verify the customer is returned to checkout with the expected result without exposing secrets or the full signed payload in logs.
9. Test relay outage and timeout behavior without using a real merchant or a real charge.

## Operational boundaries

- pay.php, relay.php, and callback.php are external host files; their deployed content and web-server configuration remain unverified.
- The Worker and PHP endpoints must use the same RELAY_SECRET, while the Node relay's X-Relay-Key uses ZIBAL_RELAY_KEY.
- Never paste secret values into issues, PRs, source files, test fixtures, or diagnostic screenshots.
- This document does not change payment logic, callbacks, order state, gateway configuration, DNS, or Cloudflare.
