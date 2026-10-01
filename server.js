/* سرور cara بدون هیچ پکیج اضافه (فقط Node). پرداخت با درگاه سپال (sepal.ir).
   اجرا:  node server.js   (Node 18 به بالا) */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* خواندن .env (یا _env اگه اسمش رو عوض نکردی) */
for (const name of [".env", "_env"]) {
  const f = path.join(__dirname, name);
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^(["'])(.*)\1$/, "$2");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
  break;
}

let palettePath = path.join(__dirname, "js", "palette.js");
if (!fs.existsSync(palettePath))
  palettePath = path.join(__dirname, "palette.js");
const { CARA_PALETTE, CARA_LIMITS: L } = require(palettePath);

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.SEPAL_API_KEY || "test";
const SANDBOX =
  API_KEY === "5028824063"; /* کلید test فقط روی سندباکس کار می‌کند */
const PRICE_PER_BEAD = Number(process.env.PRICE_PER_BEAD) || 1500; /* تومان */
const BASE_FEE = Number(process.env.BASE_FEE) || 150000; /* تومان */
const WORK_PRICE =
  Number(process.env.WORK_PRICE) ||
  0; /* قیمت پیش‌فرض سفارش مستقیم یه دستبند گالری (تومان) */
const SEPAL = "https://sepal.ir";
/* آدرسی که سپال بعد از پرداخت کاربر رو بهش برمی‌گردونه. روی هاست واقعی BASE_URL رو دامنه‌ی خودت بذار. */
const BASE_URL = (process.env.BASE_URL || "https://caraw.ir")
  .replace(/\/+$/, "")
  .replace(/^(?!https?:\/\/)/, "https://");
const CALLBACK_URL = `${BASE_URL}/api/payment-callback`;
const ok = (j) =>
  !!j && (j.status === true || j.status === 1 || j.status === "1");

const ORDERS_DIR = path.join(__dirname, "orders");
fs.mkdirSync(ORDERS_DIR, { recursive: true });
const orders = new Map();
for (const f of fs.readdirSync(ORDERS_DIR)) {
  if (!f.endsWith(".json")) continue;
  try {
    const o = JSON.parse(fs.readFileSync(path.join(ORDERS_DIR, f), "utf8"));
    orders.set(o.id, o);
  } catch {}
}
const save = (o) => {
  orders.set(o.id, o);
  fs.writeFileSync(
    path.join(ORDERS_DIR, o.id + ".json"),
    JSON.stringify(o, null, 2),
  );
};
const byPaymentNumber = (pn) =>
  [...orders.values()].find((o) => o.paymentNumber && o.paymentNumber === pn);

/* کارهای گالری: tools/build-works.js فایل data/works.json رو می‌سازه */
function findWork(id) {
  try {
    const list = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "works.json"), "utf8"),
    );
    return list.find((w) => w.id === String(id)) || null;
  } catch {
    return null;
  }
}

const VALID = new Set(CARA_PALETTE.map((p) => p.code));
const digits = (s) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

/* الگو را از صفر اعتبارسنجی می‌کنیم؛ به هیچ چیزی که مرورگر فرستاده اعتماد نداریم */
function cleanPattern(p) {
  if (!p || !Array.isArray(p.data)) return null;
  const h = p.data.length;
  if (h < 1 || h > L.MAX_H || !Array.isArray(p.data[0])) return null;
  const w = p.data[0].length;
  if (w < 1 || w > L.MAX_W) return null;
  const counts = {};
  let total = 0;
  const data = [];
  for (const row of p.data) {
    if (!Array.isArray(row) || row.length !== w) return null;
    data.push(
      row.map((c) => {
        if (c == null) return null;
        if (!VALID.has(c)) throw new Error("bad color");
        total++;
        counts[c] = (counts[c] || 0) + 1;
        return c;
      }),
    );
  }
  return total ? { width: w, height: h, data, counts, total } : null;
}

async function sepal(endpoint, body) {
  const r = await fetch(
    `${SEPAL}/api/${SANDBOX ? "sandbox/" : ""}${endpoint}.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    },
  );
  return r.json();
}

/* ابزارهای HTTP */
const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};
const redirect = (res, to) => {
  res.writeHead(302, { Location: to });
  res.end();
};
function readBody(req, limit = 300 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function parseBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  if ((req.headers["content-type"] || "").includes("json"))
    return JSON.parse(raw);
  return Object.fromEntries(new URLSearchParams(raw));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
const PAGES = new Set(["index", "builder", "upload", "gallery", "checkout"]);

function sendFile(res, file) {
  res.writeHead(200, {
    "Content-Type":
      MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
}
/* فقط css/ js/ img/ و صفحه‌های html عمومی‌اند؛ server.js و orders/ و .env بیرون نمی‌آیند */
function serveStatic(p, res) {
  const m = p.match(/^\/(css|js|img)\/(.+)$/);
  if (!m) return false;
  const rel = path.normalize(m[2]);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const ext = path.extname(rel).toLowerCase();
  if (!MIME[ext]) return false;
  /* اول توی پوشه‌ی خودش، اگه نبود کنار server.js (برای وقتی که فایل‌ها هنوز مرتب نشده‌اند) */
  for (const f of [
    path.join(__dirname, m[1], rel),
    path.join(__dirname, path.basename(rel)),
  ]) {
    if (path.basename(f) === "server.js") continue;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      sendFile(res, f);
      return true;
    }
  }
  return false;
}

async function createPayment(req, res) {
  try {
    const body = await parseBody(req);
    const c = (body && body.customer) || {};
    const customer = {
      firstName: String(c.firstName || "")
        .trim()
        .slice(0, 60),
      lastName: String(c.lastName || "")
        .trim()
        .slice(0, 60),
      phone: digits(c.phone || "").trim(),
      address: String(c.address || "")
        .trim()
        .slice(0, 500),
    };
    if (!customer.firstName || !customer.lastName || !customer.address)
      return json(res, 400, { error: "اسم، فامیلی و آدرس رو کامل بنویس." });
    if (!/^09\d{9}$/.test(customer.phone))
      return json(res, 400, {
        error: "شماره موبایل باید شبیه 09123456789 باشه.",
      });
    /* قیمت همیشه روی سرور حساب می‌شود؛ سپال مبلغ را به ریال می‌گیرد */
    let pattern = null,
      work = null,
      priceToman;
    if (body.workId) {
      /* سفارش مستقیم یه دستبند گالری، بدون استودیو و پالت */
      const w = findWork(body.workId);
      if (!w) return json(res, 400, { error: "این دستبند پیدا نشد." });
      priceToman = Math.round(w.price || WORK_PRICE);
      if (!priceToman)
        return json(res, 503, { error: "قیمت این دستبند هنوز تعیین نشده." });
      work = {
        id: w.id,
        file: w.file,
        title: w.title,
        src: w.src,
        price: priceToman,
      };
    } else {
      if (!PRICE_PER_BEAD)
        return json(res, 503, {
          error: "قیمت هنوز تنظیم نشده، بعداً امتحان کن.",
        });
      try {
        pattern = cleanPattern(body.pattern);
      } catch {
        pattern = null;
      }
      if (!pattern)
        return json(res, 400, {
          error: "الگو معتبر نیست. دوباره توی استودیو بازش کن.",
        });
      priceToman = Math.round(BASE_FEE + pattern.total * PRICE_PER_BEAD);
    }
    const order = {
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
      sandbox: SANDBOX,
      priceToman,
      customer,
      ...(work ? { work } : { pattern }),
    };
    save(order);

    const j = await sepal("request", {
      apiKey: API_KEY,
      amount: priceToman * 10,
      callbackUrl: CALLBACK_URL,
      invoiceNumber: order.id.slice(0, 8),
      payerName: `${customer.firstName} ${customer.lastName}`,
      payerMobile: customer.phone,
    });
    if (ok(j) && j.paymentNumber) {
      order.paymentNumber = String(j.paymentNumber);
      save(order);
      return json(res, 200, {
        paymentUrl: `${SEPAL}${SANDBOX ? "/sandbox/payment" : "/payment"}/${order.paymentNumber}`,
      });
    }
    order.status = "failed";
    order.error = j && j.message;
    save(order);
    console.error("sepal request failed:", j, {
      sandbox: SANDBOX,
      callbackUrl: CALLBACK_URL,
    });
    json(res, 502, {
      error: "درگاه درخواست رو قبول نکرد، یه کم بعد دوباره امتحان کن.",
    });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "یه مشکل پیش اومد، دوباره امتحان کن." });
  }
}

/* آدرس بازگشت از درگاه. همین آدرس را باید توی پنل سپال ثبت کنی. */
async function paymentCallback(req, res, url) {
  const back = (result, order) =>
    redirect(
      res,
      `/checkout.html?result=${result}${order ? "&order=" + order.id : ""}`,
    );
  try {
    let body = {};
    if (req.method === "POST") {
      try {
        body = await parseBody(req);
      } catch {}
    }
    const pn = String(
      url.searchParams.get("paymentNumber") || body.paymentNumber || "",
    );
    const order = pn && byPaymentNumber(pn);
    if (!order) {
      console.error("callback without known paymentNumber:", req.url, body);
      return back("failed");
    }
    if (order.status === "paid") return back("success", order);

    const v = await sepal("verify", {
      apiKey: API_KEY,
      paymentNumber: order.paymentNumber,
    });
    if (order.status === "paid")
      return back("success", order); /* کال‌بک هم‌زمان قبلاً تأییدش کرده */
    order.verify = v;
    if (ok(v)) {
      order.status = "paid";
      order.paidAt = new Date().toISOString();
      save(order);
      return back("success", order);
    }
    order.status = "failed";
    save(order);
    console.error("sepal verify failed:", v);
    back("failed", order);
  } catch (e) {
    console.error(e);
    back("failed");
  }
}

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://caraw.ir");
      let p;
      try {
        p = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400);
        return res.end();
      }

      if (p === "/api/config" && req.method === "GET")
        return json(res, 200, {
          pricePerBead: PRICE_PER_BEAD,
          baseFee: BASE_FEE,
        });
      if (p === "/api/work" && req.method === "GET") {
        const w = findWork(url.searchParams.get("id"));
        if (!w) return json(res, 404, { error: "not found" });
        return json(res, 200, {
          id: w.id,
          title: w.title,
          src: w.src,
          price: Math.round(w.price || WORK_PRICE) || 0,
        });
      }
      if (p === "/api/create-payment" && req.method === "POST")
        return createPayment(req, res);
      if (p === "/api/payment-callback") return paymentCallback(req, res, url);

      if (req.method === "GET" || req.method === "HEAD") {
        const page =
          p === "/" ? "index" : (p.match(/^\/([a-z]+)\.html$/) || [])[1];
        if (page && PAGES.has(page))
          return sendFile(res, path.join(__dirname, page + ".html"));
        if (serveStatic(p, res)) return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  })
  .listen(PORT, () => {
    console.log(`cara روی ${BASE_URL} (پورت ${PORT})`);
    console.log(`آدرس بازگشت درگاه: ${CALLBACK_URL}`);
    if (SANDBOX)
      console.warn("⚠ حالت آزمایشی (سندباکس): پرداخت‌ها واقعی نیستن.");
    if (!PRICE_PER_BEAD)
      console.warn(
        "⚠ PRICE_PER_BEAD تنظیم نشده؛ تا وقتی ست نشه پرداخت کار نمی‌کنه.",
      );
  });
