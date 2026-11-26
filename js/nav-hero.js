/* nav-hero.js — منوی موبایل + حالت «solid» هدر بعد از اسکرول (فقط index.html).
   جایگزین mobile-nav.js و اسکریپت inline قدیمی منو. */
(() => {
  const header = document.querySelector("[data-sh]");
  const toggle = header?.querySelector(".sh__toggle");
  const nav = header?.querySelector(".sh__nav");
  if (!header || !toggle || !nav) return;

  const setOpen = (open, restoreFocus = false) => {
    header.classList.toggle("is-open", open);
    document.body.classList.toggle("cara-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    if (!open && restoreFocus) toggle.focus();
  };
  const alwaysSolid = header.dataset.sh === "solid";
  const onScroll = () => { if (!alwaysSolid) header.classList.toggle("is-solid", scrollY > 20); };
  const normalizePath = (value) => value.replace(/\/index\.html$/, "/");
  const origin = typeof location !== "undefined" ? location.origin : "https://caraw.ir";
  const currentPath = normalizePath(typeof location !== "undefined" ? location.pathname : "/");
  nav.querySelectorAll("a[href]").forEach((link) => {
    if (link.getAttribute("href").startsWith("#")) return;
    const target = normalizePath(new URL(link.href, origin).pathname);
    if (target === currentPath) link.setAttribute("aria-current", "page");
  });

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  header.addEventListener("focusout", (e) => { if (!header.contains(e.relatedTarget)) setOpen(false); });
  document.addEventListener("pointerdown", (e) => { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && header.classList.contains("is-open")) setOpen(false, true); });
  addEventListener("resize", () => { if (innerWidth > 850) setOpen(false); }, { passive: true });
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
