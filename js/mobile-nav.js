(() => {
  const header = document.querySelector("header.top");
  const nav = header?.querySelector("nav");
  if (!header || !nav || header.querySelector(".menu-toggle")) return;

  if (!nav.id) nav.id = "cara-main-nav";
  if (!nav.hasAttribute("aria-label")) nav.setAttribute("aria-label", "منوی اصلی");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.setAttribute("aria-controls", nav.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "باز کردن منو");
  toggle.innerHTML = '<span aria-hidden="true">☰</span>';

  const close = ({ restoreFocus = false } = {}) => {
    if (!header.classList.contains("menu-open")) return;
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "باز کردن منو");
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    const open = !header.classList.contains("menu-open");
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    if (open) nav.querySelector("a")?.focus();
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  // A disclosure menu should not remain visually expanded after keyboard focus leaves it.
  header.addEventListener("focusout", (event) => {
    if (!header.contains(event.relatedTarget)) close();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!header.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close({ restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) close();
  });

  nav.before(toggle);
  header.classList.add("has-mobile-menu");
})();
