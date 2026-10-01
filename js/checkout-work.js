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
  const digits = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
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
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation(); /* جلوی منطق الگوی checkout.js رو می‌گیره */
    err.hidden = true;
    const f = Object.fromEntries(new FormData(form));
    const customer = {};
    for (const k of ["firstName", "lastName", "phone", "address"]) customer[k] = String(f[k] || "").trim();
    customer.phone = digits(customer.phone);
    if (!customer.firstName || !customer.lastName || !customer.address) return showErr("اسم، فامیلی و آدرس رو کامل بنویس.");
    if (!/^09\d{9}$/.test(customer.phone)) return showErr("شماره موبایل باید شبیه 09123456789 باشه.");
    if (pay) pay.disabled = true;
    try {
      const r = await fetch("/api/create-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: id, customer }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.paymentUrl) return (location.href = j.paymentUrl);
      showErr(j.error || "یه مشکل پیش اومد، دوباره امتحان کن.");
    } catch {
      showErr("اتصال برقرار نشد، دوباره امتحان کن.");
    }
    if (pay) pay.disabled = false;
  }, true);

  fetch("/api/work?id=" + encodeURIComponent(id))
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((w) => {
      work = w;
      if (document.readyState === "loading") addEventListener("DOMContentLoaded", render); else render();
    })
    .catch(() => showErr("این دستبند پیدا نشد؛ از گالری دوباره انتخابش کن."));
})();
