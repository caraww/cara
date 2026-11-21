/* صحنه‌ی دستبندهای هیرو: عکس‌های واقعی در یک دسته‌ی کارت که آرام می‌چرخد.
   فلش‌ها، نقطه‌ها، کلیدهای جهت و سوایپ؛ با prefers-reduced-motion چرخش خودکار قطع می‌شود. */
(() => {
  const stage = document.getElementById("heroStage");
  if (!stage) return;
  const cards = Array.from(stage.querySelectorAll(".hx__card"));
  const dots = Array.from(stage.querySelectorAll(".hx__dot"));
  const prev = stage.querySelector(".hx__arrow--prev");
  const next = stage.querySelector(".hx__arrow--next");
  if (cards.length < 2) return;

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wrap = (i) => ((i % cards.length) + cards.length) % cards.length;
  let active = 0;
  let paused = false;
  let timer = 0;

  function render() {
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === active);
      card.classList.toggle("is-next", i === wrap(active + 1));
      card.classList.toggle("is-prev", i === wrap(active - 1));
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === active);
      if (i === active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function restart() {
    clearInterval(timer);
    if (calm.matches || paused) return;
    timer = setInterval(() => {
      if (!paused && !document.hidden) {
        active = wrap(active + 1);
        render();
      }
    }, 5600);
  }

  function go(index) {
    active = wrap(index);
    render();
    restart();
  }

  if (next) next.addEventListener("click", () => go(active + 1));
  if (prev) prev.addEventListener("click", () => go(active - 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => go(i)));

  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(active + 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(active - 1);
    }
  });

  let startX = null;
  stage.addEventListener("touchstart", (event) => { startX = event.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? active + 1 : active - 1);
  });

  /* کج شدن ملایم دسته‌ی کارت‌ها با حرکت موس (روی لمس و حالت کم‌تحرک غیرفعال) */
  const ring = stage.querySelector(".hx__ring");
  const fine = window.matchMedia("(pointer: fine)");
  if (ring && fine.matches) {
    let raf = 0;
    let tiltX = 0;
    let tiltY = 0;
    const applyTilt = () => {
      raf = 0;
      ring.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
      ring.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
    };
    stage.addEventListener("pointermove", (event) => {
      if (calm.matches) return;
      const box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;
      tiltX = ((event.clientX - box.left) / box.width - 0.5) * 10;
      tiltY = -((event.clientY - box.top) / box.height - 0.5) * 8;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    stage.addEventListener("pointerleave", () => {
      tiltX = 0;
      tiltY = 0;
      if (raf) cancelAnimationFrame(raf);
      applyTilt();
    });
  }

  const hold = () => { paused = true; clearInterval(timer); };
  const release = () => { paused = false; restart(); };
  stage.addEventListener("pointerenter", hold);
  stage.addEventListener("pointerleave", release);
  stage.addEventListener("focusin", hold);
  stage.addEventListener("focusout", release);
  calm.addEventListener("change", restart);

  render();
  restart();
})();
