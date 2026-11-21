/* Non-intrusive design/cart recovery reminder. No personal data leaves the browser. */
(function () {
  "use strict";
  if (window.__CARA_RECOVERY_INITIALIZED__) return;
  window.__CARA_RECOVERY_INITIALIZED__ = true;
  const path = location.pathname;
  if (/\/(?:builder|cart|checkout|admin|customers|track)\.html$/.test(path)) return;
  const DISMISS_KEY = "cara-recovery-dismissed";
  const DISMISS_SIG = "cara-recovery-dismissed-sig";
  const DAY = 24 * 60 * 60 * 1000;
  let dismissed = 0, dismissedSig = "";
  try {
    dismissed = Number(localStorage.getItem(DISMISS_KEY)) || 0;
    dismissedSig = localStorage.getItem(DISMISS_SIG) || "";
  } catch {}

  function pattern() {
    try {
      const p = JSON.parse(localStorage.getItem("cara-pattern") || "null");
      if (!p || !Array.isArray(p.data) || !p.data.length) return null;
      const total = p.data.reduce((sum, row) => sum + (Array.isArray(row) ? row.filter(Boolean).length : 0), 0);
      if (!total) return null;
      if (p.savedAt && Date.now() - new Date(p.savedAt).getTime() > 30 * DAY) return null;
      return { total, width: p.width, height: p.height, savedAt: p.savedAt || "" };
    } catch { return null; }
  }
  const design = pattern();
  let count = 0;
  try { count = Number(localStorage.getItem("cara-cart-count")) || 0; } catch {}
  if (!design && !count) return;

  /* بستن یادآور فقط تا وقتی طرح/سبد عوض نشده معتبر است */
  const sig = design ? `d:${design.width}x${design.height}:${design.total}:${design.savedAt || ""}` : `c:${count}`;
  if (Date.now() - dismissed < 3 * DAY && sig === dismissedSig) return;

  const box = document.createElement("aside");
  box.className = "recovery";
  box.dataset.caraRecovery = "1";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.innerHTML = design
    ? `<div class="recovery__text"><b>طرحت هنوز منتظره</b><span><bdi dir="ltr">${Number(design.width).toLocaleString("fa-IR")} × ${Number(design.height).toLocaleString("fa-IR")}</bdi> · ${design.total.toLocaleString("fa-IR")} منجوق ذخیره شده</span></div><a href="/builder.html">ادامه طراحی</a><button type="button" aria-label="بستن یادآوری">×</button>`
    : `<div class="recovery__text"><b>سبدت منتظرت است</b><span>${count.toLocaleString("fa-IR")} کالا در سبد خرید ذخیره شده</span></div><a href="/cart.html">دیدن سبد</a><button type="button" aria-label="بستن یادآوری">×</button>`;
  box.querySelector("button").addEventListener("click", () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      localStorage.setItem(DISMISS_SIG, sig);
    } catch {}
    box.remove();
  });
  box.querySelector("a").addEventListener("click", () => {
    window.CARA && window.CARA.track && window.CARA.track("recovery_open", { kind: design ? "design" : "cart" });
  });
  document.body.appendChild(box);
  window.CARA && window.CARA.track && window.CARA.track("recovery_view", { kind: design ? "design" : "cart" });
})();
