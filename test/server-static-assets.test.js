const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const root = path.join(__dirname, "..");

async function waitForServer(base) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${base}/api/config`);
      if (res.ok || res.status === 204) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server did not start");
}

test("local fallback server serves media, fonts, and generated pages", async (t) => {
  const port = 43219;
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), BASE_URL: base },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));
  await waitForServer(base);

  const gif = await fetch(`${base}/img/black-friday.gif`);
  assert.equal(gif.status, 200);
  assert.equal(gif.headers.get("content-type"), "image/gif");

  const font = await fetch(`${base}/fonts/vazirmatn-var.woff2`);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get("content-type"), "font/woff2");

  const page = await fetch(`${base}/bracelet/${encodeURIComponent("قلب-طلا")}.html`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") || "", /^text\/html/);

  const sale = await fetch(`${base}/sale.html`);
  assert.equal(sale.status, 200);
  assert.match(sale.headers.get("content-type") || "", /^text\/html/);

  const manifest = await fetch(`${base}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type") || "", /^application\/manifest\+json/);

  const serviceWorker = await fetch(`${base}/sw.js`);
  assert.equal(serviceWorker.status, 200);
  assert.match(serviceWorker.headers.get("content-type") || "", /^text\/javascript/);

  const blogIndex = await fetch(`${base}/blog/`);
  assert.equal(blogIndex.status, 200);
  assert.match(blogIndex.headers.get("content-type") || "", /^text\/html/);

  const malformed = await fetch(`${base}/%E0%A4%A`);
  assert.equal(malformed.status, 400, "malformed percent-encoding must be a 400, not a crash");
  const nul = await fetch(`${base}/%00`);
  assert.equal(nul.status, 400, "null bytes must be rejected");
});
