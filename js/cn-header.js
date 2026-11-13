/* cn-header.js — منوی جدید صفحه‌ی اصلی cara
   جای js/mobile-nav.js و اسکریپت منوی داخل index.html می‌شینه.
   (mobile-nav.js رو پاک نکن؛ صفحه‌های دیگه هنوز لازمش دارن.) */
(() => {
  "use strict";

  const header = document.querySelector(".cn-header");
  if (!header) return;

  const toggle = header.querySelector(".cn-toggle");
  const nav = header.querySelector("#cnNav");
  const links = [...header.querySelectorAll(".cn-nav a")];
  const root = document.documentElement;
  const wide = window.matchMedia("(min-width: 900px)");

  /* ---------- باز و بسته شدن منو (موبایل) ---------- */
  const isOpen = () => header.classList.contains("is-open");

  const setOpen = (open) => {
    header.classList.toggle("is-open", open);
    root.classList.toggle("cn-lock", open && !wide.matches);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    }
  };

  if (toggle) toggle.addEventListener("click", () => setOpen(!isOpen()));
  if (nav) {
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
  }
  document.addEventListener("click", (e) => {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      if (toggle) toggle.focus();
    }
  });
  const onWideChange = () => setOpen(false);
  if (wide.addEventListener) wide.addEventListener("change", onWideChange);
  else if (wide.addListener) wide.addListener(onWideChange);

  /* ---------- لینک فعال ---------- */
  const norm = (p) => p.replace(/index\.html$/, "");
  const here = norm(location.pathname);

  const mark = (active) => {
    links.forEach((a) => {
      const on = a === active;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  };

  // صفحه‌ی دیگه (گالری، بازی، حساب کاربری...)
  const pageLink = links.find((a) => !a.hash && norm(a.pathname) === here);
  if (pageLink) mark(pageLink);

  // صفحه‌ی اصلی: بخشی که الان وسط صفحه‌ست
  const spy = links
    .filter((a) => a.hash && norm(a.pathname) === here)
    .map((a) => ({ a, el: document.querySelector(a.hash) }))
    .filter((x) => x.el);

  if (spy.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const hit = spy.find((x) => x.el === en.target);
          if (hit) mark(hit.a);
        });
      },
      { rootMargin: "-35% 0px -60% 0px" }
    );
    spy.forEach((x) => io.observe(x.el));
  }

  /* ---------- سایه‌ی هدر بعد از اسکرول ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 8);
      if (spy.length && y < 120) mark(null); // بالای صفحه، هیچ لینکی فعال نباشه
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
