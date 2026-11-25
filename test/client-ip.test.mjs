import test from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/client-ip.mjs";

const req = (headers) => new Request("https://api.caraw.ir/api/config", { headers });

test("clientIp prefers the host proxy's X-Real-IP over Cloudflare's host address", () => {
  assert.equal(clientIp(req({ "X-Real-IP": "5.6.7.8", "CF-Connecting-IP": "88.135.68.30" })), "5.6.7.8");
});

test("clientIp falls back to CF-Connecting-IP for direct Worker requests", () => {
  assert.equal(clientIp(req({ "CF-Connecting-IP": "9.9.9.9" })), "9.9.9.9");
});

test("clientIp ignores a spoofed X-Real-IP on direct Worker requests", () => {
  assert.equal(clientIp(req({ "X-Real-IP": "1.2.3.4", "CF-Connecting-IP": "9.9.9.9" })), "9.9.9.9");
});

test("clientIp falls back to the first X-Forwarded-For address", () => {
  assert.equal(clientIp(req({ "X-Forwarded-For": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
});

test("clientIp returns unknown when no address header exists", () => {
  assert.equal(clientIp(req({})), "unknown");
});
