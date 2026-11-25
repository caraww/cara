#!/usr/bin/env node
/* اسکرین‌شات ساده برای بازبینی چشمی در سه عرض؛ به Playwright نیاز ندارد.
   اگر Chromium روی سیستم نباشد، با پیام روشن رد می‌شود (در CI سبک است).
   اجرا: npm run visual:check  (سرور را خودش روی پورت موقت بالا می‌آورد) */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.VISUAL_PORT || 43333);
const base = `http://127.0.0.1:${port}`;
const out = process.env.VISUAL_OUT || path.join(os.tmpdir(), "cara-visual");
const pages = [
  ["home", "/"],
  ["gallery", "/gallery.html"],
  ["sale", "/sale.html"],
  ["product", `/bracelet/${encodeURIComponent("قلب-طلا")}.html`],
  ["checkout", "/checkout.html"],
];
const viewports = [
  ["mobile", 390, 844],
  ["tablet", 900, 1200],
  ["desktop", 1440, 900],
];

function chromium() {
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"]) {
    const found = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return "";
}

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${base}/api/config`);
      if (res.ok || res.status === 204) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

(async () => {
  const bin = chromium();
  if (!bin) {
    console.log("visual:check skipped — Chromium/Chrome not found");
    return;
  }
  fs.mkdirSync(out, { recursive: true });
  const server = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), BASE_URL: base },
    stdio: "ignore",
  });
  try {
    await waitForServer();
    for (const [name, url] of pages) {
      for (const [label, width, height] of viewports) {
        const file = path.join(out, `${name}-${label}.png`);
        const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cara-chrome-"));
        const run = spawnSync(bin, [
          "--headless=old",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--hide-scrollbars",
          "--timeout=5000",
          `--user-data-dir=${profile}`,
          `--window-size=${width},${height}`,
          `--screenshot=${file}`,
          `${base}${url}`,
        ], { stdio: "ignore", timeout: 30000 });
        fs.rmSync(profile, { recursive: true, force: true });
        if (run.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size === 0) {
          console.warn(`visual:check failed for ${name}/${label}`);
        } else {
          console.log(`✓ ${name}-${label}.png`);
        }
      }
    }
    console.log(`visual screenshots: ${out}`);
  } finally {
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
