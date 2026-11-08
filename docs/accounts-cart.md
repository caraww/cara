# Accounts, guest cart, and order tracking — design

**Status:** account foundation and first login/dashboard implementation are in progress on a feature branch. Telegram login verification, secure sessions, saved designs, and account-scoped order history are implemented in code; this is not yet merged or deployed.

## Goals and constraints

- Let a visitor design a bracelet and keep it as a guest without creating an account.
- Allow an account holder to save designs and a cart across devices.
- Let a guest merge their local cart/designs into an account after signing in.
- Provide a safe /track page for checking an order without exposing private customer details.
- Support Telegram and Bale as possible sign-in providers.
- Do not depend on paid SMS or phone-number OTP.
- Preserve the current checkout and payment lifecycle. Account/cart work must not rewrite payment state transitions or price calculation.

## D1 versus KV

| Capability | Cloudflare D1 | Workers KV |
|---|---|---|
| Relational users, carts, cart items, sessions, ownership | Strong fit | Poor fit; records are denormalized |
| Transactions and uniqueness constraints | SQL transactions and constraints | No multi-key transaction |
| Queries and filtering | SQL joins and indexes | Key lookups; limited querying |
| Read performance / global distribution | Regional database access | Globally distributed, eventually consistent |
| Best role in this design | Source of truth for accounts and carts; potential future order index | Cache, short-lived non-authoritative lookup, or existing ephemeral data where eventual consistency is acceptable |

Recommendation: use D1 for user identity links, sessions, saved designs, and cart rows. Keep KV for cache-like or existing game/temporary data. Do not migrate the current ORDERS KV or change payment settlement as part of the first account release; evaluate order migration separately with a tested dual-read/rollback plan.

## Identity provider design

Use a provider adapter rather than coupling accounts to one vendor:

- Telegram: use the official Telegram Login / authentication mechanism and validate its signed payload on the server. Validate freshness and prevent replay.
- Bale: support only an official documented identity/OAuth or signed-login mechanism. If the deployed Bale product does not provide a verifiable user identity flow, keep it as a future provider rather than trusting a plain username or an unverified bot message.
- Do not use SMS OTP as a fallback. Keep guest checkout available when a provider is unavailable.
- Store provider name plus the provider's stable subject ID; do not use a mutable username as the account primary key.
- Link a second provider only after the user is already authenticated to the account and has completed the second provider's verification.

## Suggested data model

- users: internal UUID, created_at, updated_at, status.
- identity_links: user_id, provider, provider_subject, verified_at; unique(provider, provider_subject).
- sessions: hashed opaque session token, user_id, created_at, expires_at, revoked_at, last_seen_at.
- designs: user_id, design JSON or immutable design reference, title, created_at, updated_at.
- carts: user_id or guest_id, currency, updated_at.
- cart_items: cart_id, item type, design/work reference, quantity, snapshot metadata, created_at, updated_at.
- order_access_tokens: order_id, token_hash, created_at, expires_at, revoked_at.

Do not store raw session or public tracking tokens. Store a cryptographic hash and compare in constant time where appropriate.

## Guest-to-account merge rules

1. Keep guest designs and cart in local storage until the server confirms a successful merge.
2. On sign-in, send only validated design/cart payloads to the server; enforce size, dimensions, allowed color codes, and item-count limits.
3. Merge idempotently using a stable cart-item key (for example, item type + normalized design hash + work ID).
4. Combine duplicate quantities only within configured limits. Preserve distinct designs as distinct cart items.
5. If an account already has a conflicting saved design with the same ID but different content, create a new server ID rather than overwriting the account's saved work.
6. Never merge guest cart data into an existing order, payment, discount reservation, or order status.
7. Delete guest local data only after the server confirms the merge and returns the canonical account cart.
8. If merge fails, keep the guest cart untouched and show a recoverable error.

## /track public order lookup

- Use a cryptographically random, high-entropy public token unrelated to the sequential order code or customer phone.
- Store only a hash of the token, with expiry and revocation metadata.
- Return the token only over HTTPS after order creation or in an authenticated account session. Avoid putting it in analytics, referrer-bearing third-party links, or application logs.
- Show only minimal order status, fulfillment status, and postal tracking code when available. Never show full address, phone, payment details, internal notes, or another customer's design.
- Apply strict rate limits, generic not-found responses, noindex, no-store, and no third-party analytics on the token-bearing page.
- Support token revocation and rotation. A customer who loses the token can use their authenticated account or request a new one through a separately verified support process.
- Do not treat a public token as permission to modify or cancel an order.

## Phased delivery

1. Build and test D1 schema and provider-verification adapter in a preview environment.
2. Implement account sessions with secure cookies, CSRF protection for state-changing requests, expiry, and revocation.
3. Add saved designs and guest-to-account merge without changing checkout.
4. Add account order history as a read-only view of existing orders.
5. Add /track with hashed public tokens and strict privacy controls.
6. Consider moving authoritative order records from KV to D1 only in a separate migration project with reconciliation, backup, dual-read tests, and rollback.

## Acceptance criteria

- Guest checkout still works with no account and no paid SMS.
- Telegram/Bale login verifies a cryptographic provider response; unverified usernames are never accepted as identity.
- Guest merge is idempotent and never overwrites account designs or order/payment records.
- Users can see only their own account orders.
- /track reveals no address, phone, internal note, or payment secret.
- Existing checkout, pricing, discount reservation, callback, and order lifecycle tests continue to pass.


## Implementation status — account foundation

- D1 migrations `0001_accounts.sql` and `0002_account_sessions.sql` create users, verified provider identity links, hashed sessions, saved designs, guest/account carts, cart items, hashed order-access tokens, Telegram replay protection, and minimal profile metadata.
- A Node regression test checks the schema's core security and ownership constraints.
- The preview D1 database has successfully applied migration `0001_accounts.sql`. Migration `0002_account_sessions.sql` is pending until the feature branch is reviewed and merged; no production D1 binding or production deployment is enabled.
- Existing checkout, payment settlement, and the ORDERS KV namespace remain unchanged.
- Telegram authentication uses the official Login Widget HMAC verification, a five-minute freshness window, replay-digest storage, rate limiting, and opaque HttpOnly/Secure/SameSite session cookies. The Worker needs `TELEGRAM_BOT_USERNAME` as a variable and a bot configured for the site domain in BotFather; `TELEGRAM_BOT_TOKEN` remains a secret.
- Account UI includes Telegram sign-in, saved-design preview/reopen/delete, and read-only history for orders created while signed in. Existing orders are not automatically linked because Telegram does not prove ownership of the checkout phone number.
- Bale login, guest-cart merge, profile editing, account-linked legacy orders, and public order tracking remain separate follow-up work. Bale is intentionally not enabled without a documented, verifiable identity flow.
