# API rate-limit policy proposal

**Status:** policy proposal only. No rate-limit code, Durable Object binding, Worker setting, or payment behavior is changed here.

## Current implementation observed

The shared rateLimit function in game-worker.js delegates to a Durable Object when GAME is available. It currently returns true (allows the request) if the binding is missing or if the Durable Object call throws. This is fail-open behavior.

Current route limits visible in index.js:

| Route / action | Current limit | Key |
|---|---:|---|
| POST /api/create-payment | 10 per 10 minutes | Client IP |
| Discount-code validation during payment creation | 30 per minute | Client IP |
| /api/admin/orders | 120 per 10 minutes | Client IP |
| Game endpoints | Additional Durable Object counters and one-code-per-day constraints | Game token / IP / code |

The admin page submits its token to /api/admin/orders; there is no separate browser-facing admin-login API route in the current Worker. The admin limit is applied before token validation.

## Proposed per-endpoint policy

| Route / action | Proposed behavior | If limiter is unavailable |
|---|---|---|
| Admin authentication attempts and admin mutations | Keep a strict pre-auth IP limit; consider 10 failed attempts per 10 minutes, plus a separate authenticated-action budget | Fail closed with 503/429; do not silently disable protection |
| Discount-code checks / reservations | Keep a bounded per-IP attempt budget and the existing atomic Durable Object reservation/use checks | Fail closed; do not validate or reserve a discount code when the limiter is unavailable |
| Payment creation | Retain a customer-friendly limit close to the current 10 per 10 minutes; add a small bounded emergency fallback and an operational alert | Best-effort fallback only, with a clear cap and alert; document that isolate-local fallback is not a distributed guarantee |
| Game rounds and code issuance | Preserve the Durable Object atomic counters, one-code-per-game and one-code-per-IP/day rules | Fail closed for prize/code issuance; practice mode can remain available without a discount code |
| Read-only public catalog/config endpoints | Apply modest per-IP protection if abuse appears in logs; do not block ordinary gallery browsing | Return a controlled 503/429 only when necessary; avoid broad site-wide lockouts |

The suggested 10 failed admin attempts is a proposal, not a current setting. Any change must account for legitimate shared IPs and include a safe recovery path for the site owner.

## Implementation requirements before rollout

- Separate limits by route and action; do not apply one blanket threshold to the whole site.
- Use the Cloudflare client IP header only at the trusted edge. Do not accept a client-provided forwarding header as the source of identity.
- Use atomic Durable Object counters for security-sensitive reservations and one-time actions.
- Return HTTP 429 with Retry-After for exhausted budgets; return 503 when a required security control is unavailable.
- Do not log raw tokens, passwords, phone numbers, payment payloads, or full IP addresses. Prefer a short-lived keyed hash for correlation.
- Set explicit TTL/cleanup for limiter state and alert on repeated Durable Object failures.
- Keep payment creation available under the documented bounded fallback; do not let a limiter outage silently disable all checkout without an operator-visible signal.
- Ensure a limiter outage cannot permit discount-code reuse, duplicate order settlement, or bypass of admin authentication.

## Required tests

- Exactly-at-limit and one-over-limit requests for every route.
- Window reset and Retry-After behavior.
- Missing GAME binding and simulated Durable Object exceptions.
- Concurrent discount-code reservation and duplicate callback handling.
- Multiple users behind a shared NAT.
- Payment creation during a limiter outage and verification that the fallback cap and alert are applied.
- Admin bad-token attempts followed by a valid token and safe recovery.

## Rollback

Revert the endpoint-specific policy code only after confirming the previous limiter configuration and logs are understood. Never remove atomic discount-code reservation or payment idempotency checks as a rollback shortcut.
