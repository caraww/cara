/* Client IP for rate limits. When the storefront proxies /api/* through the
   Iranian host, Cloudflare sees the host IP as CF-Connecting-IP; the host's
   X-Real-IP header carries the actual visitor. Fall back to Cloudflare's
   header for requests that reach the Worker directly. */
export function clientIp(request) {
  const real = String(request.headers.get("X-Real-IP") || "").trim();
  if (real) return real;
  const cf = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (cf) return cf;
  const forwarded = String(request.headers.get("X-Forwarded-For") || "").split(",")[0].trim();
  return forwarded || "unknown";
}
