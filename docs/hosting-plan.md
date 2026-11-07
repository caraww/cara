# Hosting and edge-delivery plan

**Status:** architecture proposal only. No DNS, Cloudflare, GitHub Pages, Worker route, cache rule, or response-header setting is changed by this document.

## Current architecture verified in the repository

- The public storefront is static content served by GitHub Pages.
- Cloudflare Worker routes in wrangler.jsonc cover caraw.ir/api/* and www.caraw.ir/api/*; the rest of the site is intended to remain on the static origin.
- The Worker JSON helper sends Cache-Control: no-store.
- The service worker uses network-first for navigations and cache-first for static styles, scripts, images, and fonts. It deliberately excludes /api/* and /admin paths.
- The canonical site URL in page metadata is https://caraw.ir/.

Keep GitHub Pages as the static origin and keep the Worker limited to /api/* unless a separately reviewed architecture change is approved.

## Proposed edge policy

| Request class | Proposed Cloudflare behavior | Reason |
|---|---|---|
| Versioned CSS, JS, fonts, images | Cache at edge for a long period; browser max-age can be long only when URLs are versioned | These are static assets and current HTML already uses query-string version values in several places |
| Unversioned static assets | Shorter edge/browser TTL; revalidate where possible | Avoid stale content when a query version is absent |
| HTML documents | Bypass edge cache initially, or use a very short TTL with explicit revalidation | Keep deploys visible quickly and avoid caching checkout/admin shells unexpectedly |
| /api/* | Bypass cache; preserve Worker no-store responses | Orders, prices, payment state, and game state are dynamic |
| /admin* and any future /track endpoint | Bypass cache | Avoid caching personalized or token-bearing responses |
| POST, PUT, PATCH, DELETE | Never cache | State-changing requests |

Do not assume a query string is ignored by the cache key. Test the actual Cache Rule behavior with URLs that differ only by ?v= before relying on it.

## Response-header plan

Introduce headers in a separate, reversible phase:

- Strict-Transport-Security only after confirming HTTPS works for the apex and every intended subdomain. Start with a conservative max-age; do not enable includeSubDomains or preload until all subdomains are verified.
- X-Content-Type-Options: nosniff.
- Referrer-Policy: strict-origin-when-cross-origin.
- Permissions-Policy: disable browser capabilities the site does not use, after checking current pages.
- Content-Security-Policy-Report-Only first. Existing HTML contains inline scripts/styles and external trust-seal content, so an enforcing CSP could break checkout, admin, or the homepage. Collect reports and inventory required sources before enforcing it.

Avoid adding duplicate or contradictory headers at both GitHub Pages and Cloudflare. Decide which layer owns each header and verify the final response with curl/browser devtools.

## Rollout sequence

1. Capture current response headers and cache behavior for /, index.html, versioned and unversioned assets, /api/config, /api/works, /api/admin/orders, and checkout.html.
2. Save a baseline for page load, Lighthouse mobile metrics, and key user flows.
3. Add one Cache Rule at a time, beginning with clearly versioned static assets.
4. Verify cache status, cache key, query-string handling, and invalidation after a harmless test asset update.
5. Add security headers in Report-Only / non-enforcing mode and inspect browser console plus reports.
6. Test checkout page loading, payment creation/callback, admin authentication, gallery ordering, builder, upload, and PWA refresh/offline behavior.
7. Promote only rules that pass the checks; retain screenshots/exported settings for rollback.

## Rollback

Disable or delete only the newly introduced rule. Keep the existing DNS proxy/origin arrangement and GitHub Pages deployment intact. Do not change nameservers, DNS records, Worker routes, or production secrets as part of this plan.

## Acceptance criteria

- Static assets cache as intended and a versioned URL returns the new content.
- HTML and all dynamic/API/admin paths do not serve stale or personalized cached responses.
- No API response is cached; Worker no-store remains effective.
- No CSP enforcement is enabled before report review.
- Checkout, payment return, admin, gallery, builder, upload, and PWA flows still work.
- Before/after response headers and mobile performance are recorded.
