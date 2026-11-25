/* contact.js — یک دکمه‌ی ثابت تماس که منوی اینستاگرام/تلفن را باز می‌کند.
   دو دکمه‌ی جدا روی موبایل جلوی کارت‌ها و فرم‌ها می‌افتاد؛ این نسخه فقط یک FAB دارد. */
(() => {
  if (document.getElementById("cara-contact")) return;
  const path = location.pathname;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/css/contact.css?v=20261125-fab3";
  document.head.appendChild(stylesheet);

  const box = document.createElement("div");
  box.id = "cara-contact";
  box.innerHTML = `<div class="cara-contact__menu" id="cara-contact-menu" role="group" aria-label="راه‌های تماس" hidden>
<a href="https://instagram.com/_.caraw" target="_blank" rel="noopener" aria-label="پیام در اینستاگرام" class="cara-contact-instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></a>
<a href="tel:+989352528201" aria-label="تماس تلفنی" class="cara-contact-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></a>
</div>
<button class="cara-contact-toggle" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="cara-contact-menu" aria-label="تماس با من">
<span class="cara-contact-toggle__icon cara-contact-toggle__icon--open" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3.6h3.2l1.6 4-2 1.2a11.4 11.4 0 0 0 4.9 4.9l1.2-2 4 1.6v3.2a2.2 2.2 0 0 1-2.4 2.2C10.1 18.1 3.9 11.9 3.4 6a2.2 2.2 0 0 1 2.2-2.4Z" fill="currentColor" fill-opacity=".12"/><path d="M6.6 3.6h3.2l1.6 4-2 1.2a11.4 11.4 0 0 0 4.9 4.9l1.2-2 4 1.6v3.2a2.2 2.2 0 0 1-2.4 2.2C10.1 18.1 3.9 11.9 3.4 6a2.2 2.2 0 0 1 2.2-2.4Z"/><path d="M15.2 4.2a5.6 5.6 0 0 1 4.6 4.6M15.7 7.5a2.4 2.4 0 0 1 1.7 1.7"/></svg></span>
<span class="cara-contact-toggle__icon cara-contact-toggle__icon--close" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span>
<span class="cara-contact-toggle__label">تماس با من</span>
</button>`;
  if (!/admin/.test(path)) document.body.appendChild(box);

  const toggle = box.querySelector(".cara-contact-toggle");
  const menu = box.querySelector(".cara-contact__menu");
  const label = box.querySelector(".cara-contact-toggle__label");
  const setOpen = (open, restoreFocus) => {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "بستن تماس با من" : "تماس با من");
    if (label) label.textContent = open ? "بستن" : "تماس با من";
    box.classList.toggle("is-open", open);
    if (open) menu.querySelector("a")?.focus();
    else if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(menu.hidden);
  });
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
    if (menu.hidden || box.contains(e.relatedTarget)) return;
    /* On touch, relatedTarget can be null and the click on the toggle lands after
       focusout. Defer the check so the toggle can finish closing the menu first. */
    setTimeout(() => {
      if (!menu.hidden && !box.contains(document.activeElement)) setOpen(false);
    }, 0);
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
