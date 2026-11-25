/* Client IP for rate limits. When the storefront proxies /api/* through the
   Iranian host, Cloudflare sees the host IP as CF-Connecting-IP; the host's
   X-Real-IP header carries the actual visitor. Only trust X-Real-IP when
   Cloudflare confirms the request came from the host, so a direct visitor
   cannot spoof the header to bypass rate limits. */
const PROXY_IP = "88.135.68.30";

export function clientIp(request) {
  const cf = String(request.headers.get("CF-Connecting-IP") || "").trim();
  const real = String(request.headers.get("X-Real-IP") || "").split(",")[0].trim();
  if (real && (!cf || cf === PROXY_IP)) return real;
  if (cf) return cf;
  const forwarded = String(request.headers.get("X-Forwarded-For") || "").split(",")[0].trim();
  return forwarded || "unknown";
}
