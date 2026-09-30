/* گالری: دکمه‌ی «همین دستبند رو سفارش بده» + مخفی کردن اسم‌هایی که فقط عدد هستن (۱، ۲، ۳ …) */
(function () {
  const works = (window.CARA && window.CARA.works) || [];
  const btn = document.getElementById("lbOrder");
  const img = document.getElementById("lbImg");
  const lb = document.getElementById("lb");
  const key = (u) => { try { return decodeURIComponent(new URL(u, location.href).pathname); } catch { return u || ""; } };

  /* عکسِ بازشده توی نمایش بزرگ رو به اثر مربوطه وصل می‌کنه و لینک سفارش مستقیم رو می‌سازه */
  function sync() {
    if (!btn || !img) return;
    const k = key(img.getAttribute("src") || img.src);
    const w = works.find((x) => key(x.src) === k || key(x.thumb) === k);
    if (w) { btn.href = "checkout.html?work=" + encodeURIComponent(w.id); btn.hidden = false; }
    else btn.hidden = true;
  }
  if (img) new MutationObserver(sync).observe(img, { attributes: true, attributeFilter: ["src"] });
  if (lb) new MutationObserver(sync).observe(lb, { attributes: true, attributeFilter: ["open"] });
  sync();

  /* اسم‌هایی که فقط عدد هستن نشون داده نمی‌شن (خود build-works.js هم دیگه عنوان عددی نمی‌سازه) */
  const NUM = /^[\s0-9۰-۹.\-_)]+$/;
  const KEEP = "button,a,input,small,#wkCount,.wk-count,#lbNum";
  function hideNums(root) {
    root.querySelectorAll("*").forEach((el) => {
      if (el.children.length || el.matches(KEEP)) return;
      const t = el.textContent.trim();
      if (t && NUM.test(t)) el.style.display = "none";
    });
  }
  const grid = document.getElementById("wkGrid");
  if (grid) { hideNums(grid); new MutationObserver(() => hideNums(grid)).observe(grid, { childList: true, subtree: true }); }
  const lbTitle = document.getElementById("lbTitle");
  if (lbTitle) new MutationObserver(() => {
    lbTitle.style.display = NUM.test(lbTitle.textContent.trim() || "x") ? "none" : "";
  }).observe(lbTitle, { childList: true, characterData: true, subtree: true });
})();
