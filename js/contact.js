/* contact.js — دکمه‌ی ثابت تماس/اینستاگرام + یادآور الگوی ذخیره‌شده (همه‌ی صفحه‌ها به‌جز admin)
   سفارش‌دهنده‌ها اغلب قبل از پرداخت می‌خوان با یه آدم حرف بزنن؛ این دکمه راهش رو کوتاه می‌کنه. */
(() => {
  if (document.getElementById("cara-contact")) return;
  const path = location.pathname, onCheckout = /checkout/.test(path);
  const st = document.createElement("style");
  st.textContent = `#cara-contact{position:fixed;left:14px;bottom:14px;z-index:40;display:flex;flex-direction:column;gap:10px}
#cara-contact a{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.28);transition:transform .2s}
#cara-contact a:hover{transform:scale(1.08)}#cara-contact svg{width:24px;height:24px}
#cara-remind{position:fixed;right:14px;bottom:14px;z-index:40;max-width:min(330px,calc(100vw - 100px));padding:12px 16px;border-radius:16px;background:#1d1527;color:#f3e2b4;font:600 15px/1.7 Vazirmatn,Tahoma,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.35)}
#cara-remind a{color:#fff;text-decoration:underline;text-underline-offset:4px;margin-inline-start:6px}#cara-remind button{all:unset;cursor:pointer;margin-inline-start:10px;opacity:.7}
@media(max-width:820px){#cara-contact{bottom:84px}#cara-remind{bottom:84px}}`;
  document.head.appendChild(st);
  const box = document.createElement("div"); box.id = "cara-contact";
  box.innerHTML = `<a href="https://instagram.com/_.caraw" target="_blank" rel="noopener" aria-label="پیام در اینستاگرام" style="background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></a>
<a href="tel:+989352528201" aria-label="تماس تلفنی" style="background:#2e9b5a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></a>`;
  if (!/admin/.test(path)) document.body.appendChild(box);

  /* یادآور: الگوی نیمه‌کاره توی localStorage هست ولی سفارش نداده */
  try {
    if (onCheckout || /builder|upload|admin|name-bracelet/.test(path) || sessionStorage.getItem("cara-remind-off")) return;
    const p = JSON.parse(localStorage.getItem("cara-pattern") || "null");
    const n = p && Array.isArray(p.data) ? p.data.flat().filter(Boolean).length : 0;
    if (!n) return;
    const d = document.createElement("div"); d.id = "cara-remind"; d.setAttribute("role", "status");
    d.innerHTML = `الگوی نیمه‌کاره‌ت هنوز ذخیره‌ست (${n.toLocaleString("fa-IR")} منجوق) <a href="/builder.html">ادامه بده</a><button type="button" aria-label="بستن">✕</button>`;
    d.querySelector("button").onclick = () => { d.remove(); try { sessionStorage.setItem("cara-remind-off", "1"); } catch {} };
    setTimeout(() => document.body.appendChild(d), 2500);
  } catch {}
})();
