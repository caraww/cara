/* hero-wow.js — tilt and pause controls for the current homepage hero. */
(() => {
  const hero = document.querySelector(".cn-hero");
  const stage = hero && hero.querySelector(".cara-bracelet-lineup");
  if (!hero || !stage) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => hero.classList.toggle("is-off", !entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (calm || touch) return;

  let raf = 0;
  let nx = 0;
  let ny = 0;

  const applyTilt = () => {
    raf = 0;
    stage.style.setProperty("--rx", (nx * 7).toFixed(2) + "deg");
    stage.style.setProperty("--ry", (-ny * 5).toFixed(2) + "deg");
  };

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    nx = (event.clientX - rect.left) / rect.width - 0.5;
    ny = (event.clientY - rect.top) / rect.height - 0.5;
    if (!raf) raf = requestAnimationFrame(applyTilt);
  });

  hero.addEventListener("pointerleave", () => {
    nx = 0;
    ny = 0;
    if (raf) cancelAnimationFrame(raf);
    applyTilt();
  });

  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
  }, { once: true });
})();
