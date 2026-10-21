/* checkout.js — فقط صفحه‌ی سفارش (checkout.html)
   ترتیب لود: palette.js ← checkout.js ← decor.js
   داخلش (به همین ترتیب اجرا می‌شن):
     ۰) ابزارهای مشترک (تبدیل ارقام فارسی، اصلاح شماره موبایل)
     ۱) کد تخفیف: پر شدن خودکار از بازی + بررسی زنده
     ۲) سفارش مستقیم یه دستبند از گالری (checkout.html?work=...)
     ۳) سفارش الگوی خودت از استودیو + برگشت از درگاه */

/* ==================================================================
   ابزارهای مشترک سفارش (قبلاً دو بار توی checkout-work و checkout نوشته شده بود)
   ================================================================== */
const digits = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const phoneFix = (s) => { s = digits(String(s)).replace(/[\s\-()]/g, ""); s = s.replace(/^(\+98|0098|98)(?=9\d{9}$)/, "0"); return /^9\d{9}$/.test(s) ? "0" + s : s; }; /* +98912…، 0098912…، 912… همه به 0912… */

/* ==================================================================
   ۱) کد تخفیف (قبلاً checkout-discount.js)
   ================================================================== */
try {
/* فیلد کد تخفیف صفحه‌ی سفارش: پر کردن خودکار از بازی، بررسی زنده‌ی کد. قبل از checkout.js لود بشه. */
(() => {
  const input = document.querySelector('input[name="discountCode"]'), note = document.getElementById("dcNote");
  if (!input || !note) return;
  if (new URLSearchParams(location.search).get("result") === "success") { try { localStorage.removeItem("cara-discount"); } catch (e) {} return; }
  try { const s = localStorage.getItem("cara-discount"); if (s && !input.value) input.value = s; } catch (e) {}
  let t, pct = 10;
  async function check() {
    const v = input.value.trim();
    if (!v) { note.textContent = ""; return; }
    try {
      const j = await (await fetch("/api/game/code?c=" + encodeURIComponent(v))).json();
      if (j.error) { note.textContent = j.error; note.style.color = ""; return; } /* مثلاً محدودیت تعداد درخواست */
      note.textContent = j.valid ? `✓ کد معتبره؛ ${Number(pct).toLocaleString("fa-IR")}٪ تخفیف موقع رفتن به درگاه اعمال می‌شه.` : "این کد معتبر نیست یا قبلاً استفاده شده.";
      note.style.color = j.valid ? "" : "#c93a2b";
    } catch (e) {}
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(check, 400); });
  check();
  /* درصد تخفیف از سرور (همون DISCOUNT توی Worker) */
  fetch("/api/game/config").then((r) => r.json()).then((c) => { if (c.percent && c.percent !== pct) { pct = c.percent; check(); } }).catch(() => {});
})();
} catch (e) { console.error('checkout:discount', e); }

/* ==================================================================
   ۲) سفارش مستقیم از گالری (قبلاً checkout-work.js)
   ================================================================== */
try {
/* سفارش مستقیم یه دستبند از گالری: checkout.html?work=<id>
   بدون استودیو و پالت؛ فقط اطلاعات تحویل می‌گیره و با workId پرداخت می‌سازه.
   باید قبل از js/checkout.js لود بشه. */
(function () {
  const q = new URLSearchParams(location.search);
  const id = q.get("work");
  if (!id || q.get("result")) return; /* برگشت از درگاه رو خود checkout.js نشون می‌ده */

  const $ = (s) => document.querySelector(s);
  const form = $("#form"), err = $("#err"), pay = $("#pay");
  if (!form) return;
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NUM = /^[\s0-9۰-۹.\-_)]+$/; /* عنوان‌های فقط‌عددی نشون داده نمی‌شن */
  const showErr = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: "center", behavior: "smooth" }); };
  let work = null;

  function render() {
    if (!work) return;
    const r = $("#result"); if (r) r.hidden = true;
    const fc = $("#formCard"), sc = $("#sumCard");
    if (fc) fc.hidden = false;
    if (sc) {
      sc.hidden = false;
      const h = sc.querySelector("h2"); if (h) h.textContent = "دستبند انتخابی";
      $("#sum").innerHTML =
        `<div style="display:flex;gap:18px;align-items:center;margin-bottom:12px">` +
        `<img src="/${esc(work.src)}" alt="" style="width:130px;height:130px;object-fit:contain;border-radius:14px;background:#ece6f2;padding:8px">` +
        `<div>${work.title && !NUM.test(work.title) ? `<b>${esc(work.title)}</b>` : ""}<div class="muted" style="font-size:16px">دقیقاً همین دستبند برات بافته می‌شه.</div></div></div>` +
        `<div class="stat"><span>قیمت</span><strong>${fa(work.price)} تومان</strong></div>`;
    }
    if (pay) pay.textContent = `پرداخت ${fa(work.price)} تومان`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation(); /* جلوی منطق الگوی checkout.js رو می‌گیره */
    err.hidden = true;
    const f = Object.fromEntries(new FormData(form));
    const customer = {};
    for (const k of ["firstName", "lastName", "phone", "address"]) customer[k] = String(f[k] || "").trim();
    customer.phone = phoneFix(customer.phone);
    if (!customer.firstName || !customer.lastName || !customer.address) return showErr("اسم، فامیلی و آدرس رو کامل بنویس.");
    if (!/^09\d{9}$/.test(customer.phone)) return showErr("شماره موبایل باید شبیه 09123456789 باشه.");
    if (pay) pay.disabled = true;
    try {
      const r = await fetch("/api/create-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: id, customer, discountCode: String(f.discountCode || "").trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.paymentUrl) return (location.href = j.paymentUrl);
      showErr(j.error || `یه مشکل پیش اومد، دوباره امتحان کن. (کد ${r.status})`);
    } catch {
      showErr("اتصال برقرار نشد، دوباره امتحان کن.");
    }
    if (pay) pay.disabled = false;
  }, true);

  fetch("/api/work?id=" + encodeURIComponent(id))
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((w) => {
      work = w;
      if (document.readyState === "loading") addEventListener("DOMContentLoaded", render); else render();
    })
    .catch((s) => showErr("این دستبند پیدا نشد؛ از گالری دوباره انتخابش کن." + (s ? ` (کد ${s})` : "")));
})();
} catch (e) { console.error('checkout:work', e); }

/* ==================================================================
   ۳) سفارش الگو و برگشت از درگاه (قبلاً checkout.js)
   ================================================================== */
try {
(() => {
  const C = CARA, $ = (id) => document.getElementById(id), p = C.loadPattern(), q = new URLSearchParams(location.search);
  const showErr = (t) => { const e = $("err"); e.textContent = t; e.hidden = !t; if (t) e.scrollIntoView({ behavior: "smooth", block: "center" }); };

  /* بارش مهره برای پرداخت موفق */
  function burst() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
    document.body.appendChild(cv);
    const g = cv.getContext("2d"), W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const ps = Array.from({ length: 90 }, () => ({ x: W / 2 + (Math.random() - 0.5) * 180, y: H * 0.35, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 11 - 3, c: C.palette[(Math.random() * C.palette.length) | 0].hex }));
    let t = 0;
    (function f() { g.clearRect(0, 0, W, H); ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; C.drawBead(g, p.x, p.y, 14, 11, p.c); }); if (++t < 170) requestAnimationFrame(f); else cv.remove(); })();
  }
  const res = q.get("result");
  if (res) {
    const box = $("result"); box.hidden = false;
    box.innerHTML = res === "success" ? `<p class="ok">پرداختت انجام شد ✓ سفارشت ثبت شد. کد پیگیریت: <b dir="ltr">${(q.get("order") || "").replace(/[^0-9a-f-]/gi, "").slice(0, 8)}</b></p>`
      : `<p class="err">${res === "canceled" ? "پرداخت لغو شد." : "پرداخت انجام نشد."} الگوت هنوز ذخیره‌ست، دوباره امتحان کن.</p>`;
    if (res === "success") { $("formCard").hidden = true; $("sumCard").hidden = true; burst(); }
  }

  const workMode = q.get("work") && !res; /* سفارش مستقیم از گالری: checkout-work.js مدیریتش می‌کنه */
  let total = 0;
  if (workMode) {
    /* خلاصه‌ی سفارش رو checkout-work.js پر می‌کنه */
  } else if (p) {
    total = p.data.flat().filter(Boolean).length;
    const cw = Math.max(4, Math.min(10, Math.floor(160 / p.width))), ch = Math.round(cw / C.L.BEAD_ASPECT);
    $("sum").innerHTML = `<canvas id="mini"></canvas><dl><dt>ابعاد</dt><dd>${C.faNum(p.width)} × ${C.faNum(p.height)}</dd><dt>تعداد منجوق</dt><dd>${C.faNum(total)}</dd><dt>هزینه</dt><dd id="price">…</dd></dl>`;
    const mini = $("mini"); mini.width = p.width * cw; mini.height = p.height * ch;
    C.drawPattern(mini.getContext("2d"), p.data, cw, ch);
    fetch("/api/config").then((r) => r.json()).then((cfg) => {
      $("price").textContent = cfg.pricePerBead ? `${C.faNum(Math.round(cfg.baseFee + total * cfg.pricePerBead))} تومان` : "بعد از بررسی بهت خبر می‌دم";
    }).catch(() => { $("price").textContent = "—"; });
  } else {
    $("sum").innerHTML = `<p>هنوز الگویی نساختی. <a class="btn sm dark" href="builder.html">ساخت الگو</a></p>`;
  }

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault(); showErr("");
    if (workMode) return;
    const f = e.currentTarget, fd = Object.fromEntries(new FormData(f));
    fd.phone = phoneFix(fd.phone);
    if (!p || !total) return showErr("اول یه الگو بساز و چندتا منجوق بچین.");
    if (!fd.firstName.trim() || !fd.lastName.trim() || !fd.address.trim()) return showErr("اسم، فامیلی و آدرس رو کامل بنویس.");
    if (!/^09\d{9}$/.test(fd.phone)) return showErr("شماره موبایل باید شبیه 09123456789 باشه.");
    const btn = $("pay"); btn.disabled = true; btn.textContent = "دارم می‌برمت به درگاه…";
    try {
      const r = await fetch("/api/create-payment", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: fd, discountCode: String(fd.discountCode || "").trim(), pattern: { width: p.width, height: p.height, data: p.data } }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.paymentUrl) return (location.href = j.paymentUrl);
      showErr(j.error || "وصل شدن به درگاه نشد، یه کم بعد دوباره امتحان کن.");
    } catch { showErr("به سرور وصل نشدم."); }
    btn.disabled = false; btn.textContent = "ادامه و پرداخت";
  });
})();
} catch (e) { console.error('checkout:main', e); }
