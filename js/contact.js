/* contact.js — یک دکمه‌ی ثابت تماس که منوی اینستاگرام/تلفن را باز می‌کند.
   دو دکمه‌ی جدا روی موبایل جلوی کارت‌ها و فرم‌ها می‌افتاد؛ این نسخه فقط یک FAB دارد. */
(() => {
  if (document.getElementById("cara-contact")) return;
  const path = location.pathname;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/css/contact.css?v=20261125-fab";
  document.head.appendChild(stylesheet);

  const box = document.createElement("div");
  box.id = "cara-contact";
  box.innerHTML = `<div class="cara-contact__menu" id="cara-contact-menu" role="group" aria-label="راه‌های تماس" hidden>
<a href="https://instagram.com/_.caraw" target="_blank" rel="noopener" aria-label="پیام در اینستاگرام" class="cara-contact-instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></a>
<a href="tel:+989352528201" aria-label="تماس تلفنی" class="cara-contact-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></a>
</div>
<button class="cara-contact-toggle" type="button" aria-expanded="false" aria-controls="cara-contact-menu" aria-label="راه‌های تماس"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.2-.6L3 21l1.7-4.6A8.4 8.4 0 1 1 21 11.5z"/><path d="M8 10h8M8 14h5"/></svg></button>`;
  if (!/admin/.test(path)) document.body.appendChild(box);

  const toggle = box.querySelector(".cara-contact-toggle");
  const menu = box.querySelector(".cara-contact__menu");
  const setOpen = (open, restoreFocus) => {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    box.classList.toggle("is-open", open);
    if (open) menu.querySelector("a")?.focus();
    else if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener("click", () => setOpen(menu.hidden));
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      e.stopPropagation();
      setOpen(false, true);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !box.contains(e.target)) setOpen(false);
  });
  box.addEventListener("focusout", (e) => {
    if (!menu.hidden && !box.contains(e.relatedTarget)) setOpen(false);
  });

  // نماد اعتماد الکترونیکی از دامنه‌ی بیرونی می‌آید؛ اگر لود نشد جای خالی نماند.
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
