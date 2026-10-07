(() => {
  const C = CARA, $ = (id) => document.getElementById(id), p = C.loadPattern(), q = new URLSearchParams(location.search);
  const digits = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
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
    fd.phone = digits(fd.phone.trim());
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
