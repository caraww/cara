/* فقط اگه زیبال آی‌پی ثابت می‌خواد (Cloudflare Worker آی‌پی ثابت نداره).
   این فایل رو روی یه سرور (VPS) با آی‌پی ثابت اجرا کن و آی‌پی اون سرور رو توی تنظیمات درگاه زیبال ثبت کن.
   فقط درخواست‌های /v1/request و /v1/verify رو به زیبال می‌رسونه و بدون رمز جواب نمی‌ده.

   اجرا (Node 18 به بالا، بدون هیچ پکیج):   RELAY_KEY=یه-رمز-بلند node zibal-relay.js
   جلوش یه HTTPS بذار (مثلاً Caddy یا nginx با دامنه‌ی relay.caraw.ir که به پورت 8787 وصل بشه).
   بعد روی Worker:   npx wrangler secret put ZIBAL_RELAY_KEY   (همون رمز)
                     و توی wrangler.jsonc، بخش vars:  "ZIBAL_BASE": "https://relay.caraw.ir" */
const http = require("http");
const crypto = require("crypto");
const KEY = process.env.RELAY_KEY || "";
const PORT = Number(process.env.PORT) || 8787;
if (KEY.length < 16) { console.error("RELAY_KEY باید حداقل ۱۶ کاراکتر باشه."); process.exit(1); }
const same = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

http.createServer(async (req, res) => {
  const ok = req.method === "POST" && /^\/v1\/(request|verify|inquiry)$/.test(req.url) && same(req.headers["x-relay-key"] || "", KEY);
  if (!ok) { res.writeHead(403); return res.end(); }
  let body = "";
  for await (const c of req) { body += c; if (body.length > 1e5) { res.writeHead(413); return res.end(); } }
  try {
    const r = await fetch("https://gateway.zibal.ir" + req.url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(15000),
    });
    res.writeHead(r.status, { "Content-Type": "application/json" });
    res.end(await r.text());
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ result: -1, message: "relay: " + String(e).slice(0, 120) }));
  }
}).listen(PORT, () => console.log("zibal relay روی پورت " + PORT));
