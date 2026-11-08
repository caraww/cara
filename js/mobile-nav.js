(() => {
  const header = document.querySelector(".top");
  const nav = header?.querySelector("nav");
  if (!header || !nav || header.querySelector(".menu-toggle")) return;

  const spacer = document.createElement("div");
  spacer.className = "mobile-nav-spacer";
  spacer.setAttribute("aria-hidden", "true");
  header.after(spacer);

  const syncSpacer = () => {
    const open = header.classList.contains("menu-open");
    spacer.style.height = open ? `${Math.ceil(nav.getBoundingClientRect().height + 12)}px` : "0px";
  };

  if (!nav.id) nav.id = "cara-main-nav";
  if (!nav.hasAttribute("aria-label")) nav.setAttribute("aria-label", "منوی اصلی");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.setAttribute("aria-controls", nav.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "باز کردن منو");
  toggle.innerHTML = '<span aria-hidden="true">☰</span>';
  toggle.addEventListener("click", () => {
    const open = !header.classList.contains("menu-open");
    header.classList.toggle("menu-open", open);
    syncSpacer();
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    if (open) nav.querySelector("a")?.focus();
  });

  const close = ({ restoreFocus = false } = {}) => {
    if (!header.classList.contains("menu-open")) return;
    header.classList.remove("menu-open");
    syncSpacer();
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "باز کردن منو");
    if (restoreFocus) toggle.focus();
  };

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!header.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close({ restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) close();
    else if (header.classList.contains("menu-open")) syncSpacer();
  });

  nav.before(toggle);
  header.classList.add("has-mobile-menu");
})();