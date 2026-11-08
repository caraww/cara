/* Homepage hero: rotate through real bracelet work from the cara gallery. */
(() => {
  const root = document.getElementById("heroShowcase");
  const slidesRoot = document.getElementById("heroShowcaseSlides");
  const dotsRoot = document.getElementById("heroShowcaseDots");
  const title = document.getElementById("heroShowcaseTitle");
  const count = document.getElementById("heroShowcaseCount");
  if (!root || !slidesRoot || !dotsRoot || !title || !count) return;

  const works = (window.CARA && Array.isArray(window.CARA.works)) ? window.CARA.works : [];
  const preferred = ["آبشار رنگی", "اردک تک تک", "طاووس"];
  const selected = preferred.map((name) =>
    works.find((work) => work.id === name || work.title === name)
  ).filter((work) => work && work.src);
  const items = selected.length === 3 ? selected : works.filter((work) => work && work.src && !work.noOrder).slice(0, 3);
  if (!items.length) return;

  let active = 0, startX = 0, startY = 0, pointerId = null, autoplay = 0, paused = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = [], dots = [];

  items.forEach((work, index) => {
    const slide = document.createElement("figure");
    slide.className = "hero-showcase__slide";
    slide.dataset.motion = String(index % 3);
    slide.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = work.src;
    image.alt = "دستبند منجوقی " + (work.title || work.id || "");
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    if (index === 0) image.fetchPriority = "high";
    image.addEventListener("error", () => {
      slide.classList.add("is-broken");
      image.alt = "تصویر این دستبند در دسترس نیست";
    }, { once: true });
    slide.append(image);
    slidesRoot.append(slide);
    slides.push(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-showcase__dot";
    dot.setAttribute("aria-label", "نمایش دستبند " + (work.title || work.id || (index + 1)));
    dot.addEventListener("click", () => show(index, true));
    dotsRoot.append(dot);
    dots.push(dot);
  });

  function show(next, userInitiated = false) {
    active = (next + items.length) % items.length;
    slides.forEach((slide, index) => {
      const isActive = index === active;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    dots.forEach((dot, index) => {
      const isActive = index === active;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
    title.textContent = items[active].title || items[active].id || "دستبند cara";
    count.textContent = (active + 1).toLocaleString("fa-IR") + " از " + items.length.toLocaleString("fa-IR");
    if (userInitiated) restartAutoplay();
  }

  function next() { show(active + 1); }
  function previous() { show(active - 1); }
  function stopAutoplay() {
    if (autoplay) window.clearInterval(autoplay);
    autoplay = 0;
  }
  function restartAutoplay() {
    stopAutoplay();
    if (!reducedMotion && !paused && !document.hidden && items.length > 1) {
      autoplay = window.setInterval(next, 6800);
    }
  }

  root.querySelector(".hero-showcase__arrow--prev")?.addEventListener("click", previous);
  root.querySelector(".hero-showcase__arrow--next")?.addEventListener("click", next);
  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); next(); }
    if (event.key === "ArrowRight") { event.preventDefault(); previous(); }
  });
  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
  });
  root.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    pointerId = null;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    if (dx < 0) show(active + 1, true);
    else show(active - 1, true);
  });
  root.addEventListener("pointercancel", () => { pointerId = null; });
  root.addEventListener("mouseenter", () => { paused = true; stopAutoplay(); });
  root.addEventListener("mouseleave", () => { paused = false; restartAutoplay(); });
  root.addEventListener("focusin", () => { paused = true; stopAutoplay(); });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) { paused = false; restartAutoplay(); }
  });
  document.addEventListener("visibilitychange", restartAutoplay);

  show(0);
  restartAutoplay();
})();
