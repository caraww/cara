/* hero-wow.js — تیلت ملایم دستبند با حرکت ماوس + ایستادن انیمیشن وقتی هیرو دیده نمی‌شه */
(() => {
  const hero = document.querySelector(".hero.hero2");
  const prod = hero && hero.querySelector(".prod");
  if (!hero || !prod) return;

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => hero.classList.toggle("is-off", !e.isIntersecting), { threshold: 0 }).observe(hero);
  }

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(pointer: coarse)").matches;
  if (calm || touch) return;

  let raf = 0, nx = 0, ny = 0;
  const apply = () => {
    raf = 0;
    prod.style.setProperty("--rx", (nx * 7).toFixed(2) + "deg");
    prod.style.setProperty("--ry", (-ny * 5).toFixed(2) + "deg");
  };
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    nx = (e.clientX - r.left) / r.width - 0.5;
    ny = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  hero.addEventListener("pointerleave", () => { nx = ny = 0; apply(); });
})();
