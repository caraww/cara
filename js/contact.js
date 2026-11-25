/* contact.js — دکمه‌ی ثابت تماس/اینستاگرام (همه‌ی صفحه‌ها به‌جز admin)
   سفارش‌دهنده‌ها اغلب قبل از پرداخت می‌خوان با یه آدم حرف بزنن؛ این دکمه راهش رو کوتاه می‌کنه.
   یادآور طرح/سبد توی js/recovery.js است؛ این‌جا تکرارش نکن. */
(() => {
  if (document.getElementById("cara-contact")) return;
  const path = location.pathname;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/css/contact.css";
  document.head.appendChild(stylesheet);
  const box = document.createElement("div"); box.id = "cara-contact";
  box.innerHTML = `<a href="https://instagram.com/_.caraw" target="_blank" rel="noopener" aria-label="پیام در اینستاگرام" class="cara-contact-instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></a>
<a href="tel:+989352528201" aria-label="تماس تلفنی" class="cara-contact-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></a>`;
  if (!/admin/.test(path)) document.body.appendChild(box);

  // نماد اعتماد الکترونیکی از دامنه‌ی بیرونی می‌آید؛ اگر لود نشد (ادبلاک، شبکه‌ی کند
  // یا خطای خود نماد) جای خالی نماند: همان قاب با نشان محلی و لینک استعلام پر می‌شود.
  const seal = document.querySelector(".sf__seal img");
  if (seal) {
    const useFallback = () => {
      if (seal.naturalWidth || seal.dataset.fb) return;
      seal.dataset.fb = "1";
      seal.src = "/img/enamad-fallback.svg?v=1";
      seal.alt = "نماد اعتماد الکترونیکی؛ برای استعلام کلیک کن";
    };
    seal.addEventListener("error", useFallback);
  }
})();
