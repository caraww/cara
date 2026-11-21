/* Product page preview toggle: flat product photo / on-wrist photo. */
(function () {
  "use strict";
  const main = document.getElementById("pgMainImage");
  const toggle = document.querySelector(".pg-view-toggle");
  if (!main || !toggle) return;
  const note = document.getElementById("pgViewNote");
  const flat = main.getAttribute("src");
  const second = document.querySelector(".pg-thumbs img");
  if (!second) return;
  const wrist = second.getAttribute("src");
  const buttons = [...toggle.querySelectorAll("[data-pg-view]")];
  const set = (view) => {
    const onWrist = view === "wrist";
    main.src = onWrist ? wrist : flat;
    main.alt = onWrist ? "دستبند منجوقی کارا روی مچ" : main.alt.replace(" روی مچ", "");
    if (note) note.hidden = !onWrist;
    buttons.forEach((button) => {
      const active = button.dataset.pgView === view;
      button.classList.toggle("is-on", active);
      button.setAttribute("aria-pressed", String(active));
    });
    window.CARA && window.CARA.track && window.CARA.track("product_view", { view });
  };
  buttons.forEach((button) => button.addEventListener("click", () => set(button.dataset.pgView)));
  set("flat");
})();
