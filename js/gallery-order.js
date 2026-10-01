/* گالری: قیمت + دکمه‌ی «سفارش» روی هر کارت و توی نمایش بزرگ + مخفی کردن اسم‌هایی که فقط عدد هستن.
   قیمت‌ها از /api/works (Worker) می‌آد؛ پرداخت همیشه با قیمت سمت سرور انجام می‌شه. */
(function () {
  const works = (window.CARA && window.CARA.works) || [];
  const btn = document.getElementById("lbOrder");
  const priceEl = document.getElementById("lbPrice");
  const img = document.getElementById("lbImg");
  const lb = document.getElementById("lb");
  const grid = document.getElementById("wkGrid");
  const key = (u) => { try { return decodeURIComponent(new URL(u, location.href).pathname); } catch { return u || ""; } };
  const fmt = (n) => Number(n).toLocaleString("fa-IR") + " تومان";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const prices = {}; /* id → قیمت (تومان) */

  /* عکسِ بازشده توی نمایش بزرگ رو به اثر مربوطه وصل می‌کنه، لینک سفارش و قیمت رو می‌سازه */
  function sync() {
    if (!btn || !img) return;
    const k = key(img.getAttribute("src") || img.src);
    const w = works.find((x) => key(x.src) === k || key(x.thumb) === k);
    if (w) {
      btn.href = "checkout.html?work=" + encodeURIComponent(w.id);
      btn.hidden = false;
      if (priceEl) { priceEl.textContent = prices[w.id] ? fmt(prices[w.id]) : ""; priceEl.hidden = !prices[w.id]; }
    } else {
      btn.hidden = true;
      if (priceEl) priceEl.hidden = true;
    }
  }
  if (img) new MutationObserver(sync).observe(img, { attributes: true, attributeFilter: ["src"] });
  if (lb) new MutationObserver(sync).observe(lb, { attributes: true, attributeFilter: ["open"] });
  sync();

  /* قیمت و دکمه‌ی سفارش روی هر کارت گرید */
  function decorateCards() {
    if (!grid) return;
    grid.querySelectorAll(".wk-card").forEach((card) => {
      if (card.querySelector(".wk-order")) return;
      const id = card.dataset.id, p = prices[id];
      if (!p) return;
      const box = document.createElement("div");
      box.className = "wk-order";
      box.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px";
      box.innerHTML = `<b>${fmt(p)}</b><a class="btn dark sm" href="checkout.html?work=${encodeURIComponent(id)}">سفارش</a>`;
      box.querySelector("a").addEventListener("click", (e) => e.stopPropagation()); /* لایت‌باکس باز نشه */
      (card.querySelector("figcaption") || card).appendChild(box);
    });
  }
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true, subtree: true });
  fetch("/api/works")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((list) => { list.forEach((w) => { prices[w.id] = w.price; }); decorateCards(); sync(); })
    .catch(() => {});

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
  if (grid) { hideNums(grid); new MutationObserver(() => hideNums(grid)).observe(grid, { childList: true, subtree: true }); }
  const lbTitle = document.getElementById("lbTitle");
  if (lbTitle) new MutationObserver(() => {
    lbTitle.style.display = NUM.test(lbTitle.textContent.trim() || "x") ? "none" : "";
  }).observe(lbTitle, { childList: true, characterData: true, subtree: true });
})();
