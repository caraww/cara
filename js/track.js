/* Public order tracking page. Shows status, fulfillment and postal tracking only. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const STATUS = {
    pending: "در انتظار پرداخت",
    paid: "پرداخت شده",
    review: "در حال بررسی",
    failed: "پرداخت ناموفق",
  };
  const FUL = { new: "آماده‌ی شروع بافت", weaving: "در حال بافت", shipped: "ارسال شده" };
  const msg = $("trackMsg");
  const result = $("trackResult");
  const input = $("trackToken");
  if (!input) return;

  function say(text, error) {
    msg.textContent = text || "";
    msg.style.color = error ? "#c93a2b" : "";
  }

  function render(order) {
    result.hidden = false;
    const rows = [
      ["کد سفارش", order.code],
      ["وضعیت پرداخت", STATUS[order.status] || order.status],
      ["وضعیت آماده‌سازی", FUL[order.fulfillment] || order.fulfillment],
      ["سفارش", order.what],
      ["تاریخ ثبت", order.createdAt ? new Date(order.createdAt).toLocaleDateString("fa-IR", { dateStyle: "long" }) : "—"],
    ];
    if (order.tracking) rows.push(["کد رهگیری پست", order.tracking]);
    if (order.gift && order.gift.wrap) rows.push(["بسته‌بندی", "هدیه"]);
    $("trackStatus").innerHTML = rows
      .map(([label, value]) => `<div class="row"><span>${label}</span><b dir="auto">${String(value).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</b></div>`)
      .join("");
    document.querySelectorAll(".track-step").forEach((step) => {
      const key = step.dataset.step;
      const on = key === "paid" ? order.status === "paid" || order.fulfillment !== "new" : key === "weaving" ? order.fulfillment === "weaving" || order.fulfillment === "shipped" : order.fulfillment === "shipped";
      step.classList.toggle("on", on);
    });
    const note = $("trackNote");
    if (order.status === "pending") note.textContent = "پرداخت این سفارش هنوز تأیید نشده است. اگر مبلغی کم شده، چند دقیقه بعد دوباره سر بزن.";
    else if (order.fulfillment === "shipped") note.textContent = "سفارشت تحویل پست شده. با کد رهگیری می‌توانی وضعیت مرسوله را از سایت پست بگیری.";
    else if (order.fulfillment === "weaving") note.textContent = "سفارشت در حال بافت است؛ حداکثر تا یک هفته آماده و ارسال می‌شود.";
    else note.textContent = "سفارشت ثبت شده و به‌زودی وارد مرحله‌ی بافت می‌شود.";
  }

  async function load(token) {
    token = String(token || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(token)) { say("کد پیگیری باید ۶۴ حرف انگلیسی و عدد باشد.", true); return; }
    say("دارم وضعیت را می‌گیرم…");
    try {
      const response = await fetch("/api/track?t=" + encodeURIComponent(token), { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { say(data.error || "این لینک پیگیری معتبر نیست یا منقضی شده.", true); result.hidden = true; return; }
      say("");
      render(data.order);
      try { history.replaceState(null, "", location.pathname + "?t=" + token); } catch {}
    } catch {
      say("اتصال برقرار نشد؛ دوباره امتحان کن.", true);
    }
  }

  $("trackForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    load(input.value);
  });

  const fromUrl = new URLSearchParams(location.search).get("t");
  if (fromUrl) { input.value = fromUrl; load(fromUrl); }
})();
