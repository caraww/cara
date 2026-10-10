/* پالت موبایل: دکمه‌ی «رنگ‌ها» توی نوار پایین، پنل پایین‌آمدنی. بعد از studio-pro.js لود شه. */
(function () {
  var mq = window.matchMedia("(max-width: 760px)");
  var aside = document.querySelector(".builder > aside:first-child");
  var bar = document.getElementById("mbBar");
  var pal = document.getElementById("palette");
  if (!aside || !bar || !pal) return;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mb-color";
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<i></i><span>رنگ‌ها</span>';
  bar.insertBefore(btn, bar.firstChild);
  var scrim = document.createElement("div");
  scrim.className = "mb-scrim";
  document.body.appendChild(scrim);

  /* سرتیتر پنل: بستن + «باز بمونه» */
  var h2 = aside.querySelector("h2");
  var hd = document.createElement("div");
  hd.className = "mb-hd";
  if (h2) { aside.insertBefore(hd, h2); hd.appendChild(h2); } else { aside.insertBefore(hd, aside.firstChild); }
  var pin = document.createElement("button");
  pin.type = "button";
  pin.className = "mb-pin";
  pin.textContent = "باز بمونه";
  var KEY = "cara-pal-pin", pinned = false;
  try { pinned = localStorage.getItem(KEY) === "1"; } catch (e) {}
  pin.setAttribute("aria-pressed", pinned ? "true" : "false");
  var cls = document.createElement("button");
  cls.type = "button";
  cls.className = "mb-close";
  cls.setAttribute("aria-label", "بستن");
  cls.innerHTML = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  hd.appendChild(pin);
  hd.appendChild(cls);
  function setOpen(o) {
    aside.classList.toggle("mb-open", o);
    aside.classList.toggle("mb-pinned", o && pinned);
    scrim.classList.toggle("on", o && !pinned);
    btn.setAttribute("aria-expanded", o ? "true" : "false");
  }
  pin.addEventListener("click", function () {
    pinned = !pinned;
    pin.setAttribute("aria-pressed", pinned ? "true" : "false");
    try { localStorage.setItem(KEY, pinned ? "1" : "0"); } catch (e) {}
    setOpen(aside.classList.contains("mb-open"));
  });
  cls.addEventListener("click", function () { setOpen(false); });
  function syncDot() {
    var sw = pal.querySelector('.swatch[aria-pressed="true"]');
    if (sw) btn.firstChild.style.setProperty("--c", getComputedStyle(sw).backgroundColor);
  }
  btn.addEventListener("click", function () { setOpen(!aside.classList.contains("mb-open")); });
  scrim.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  /* انتخاب رنگ (از پالت یا رنگ‌های اخیر) پنل رو می‌بنده تا بشه سریع کشید */
  aside.addEventListener("click", function (e) {
    if (mq.matches && e.target.closest(".swatch, .sp-rc")) setTimeout(function () { syncDot(); if (!pinned) setOpen(false); }, 120);
  });
  new MutationObserver(syncDot).observe(pal, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  mq.addEventListener && mq.addEventListener("change", function () { setOpen(false); });
  syncDot();
})();

/* تمام‌صفحه‌ی موبایل: دکمه توی نوار ابزار. روی آیفون Fullscreen API نیست، پس حالت «تمرکز» با CSS ساخته می‌شه. */
(function () {
  var mq = window.matchMedia("(max-width: 760px)");
  var host = document.querySelector(".tools .grp.bare") || document.querySelector(".tools");
  if (!host) return;
  var ICON_IN = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_OUT = '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tool ib fs-btn";
  btn.setAttribute("aria-pressed", "false");
  btn.setAttribute("aria-label", "تمام‌صفحه");
  btn.setAttribute("data-tip", "تمام‌صفحه");
  btn.innerHTML = ICON_IN;
  host.insertBefore(btn, host.firstChild);

  function relayout() { setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 60); }
  function setFs(on, fromPop) {
    if (document.body.classList.contains("fs-mode") === on) return;
    document.body.classList.toggle("fs-mode", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "خروج از تمام‌صفحه" : "تمام‌صفحه");
    btn.innerHTML = on ? ICON_OUT : ICON_IN;
    if (on) {
      window.scrollTo(0, 0);
      history.pushState({ caraFs: 1 }, "");
      /* اندروید/کروم: نوار مرورگر هم می‌ره */
      try { var r = document.documentElement.requestFullscreen; if (r) r.call(document.documentElement).catch(function () {}); } catch (e) {}
    } else {
      if (!fromPop && history.state && history.state.caraFs) history.back();
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    }
    relayout();
  }
  btn.addEventListener("click", function () { setFs(!document.body.classList.contains("fs-mode")); });
  window.addEventListener("popstate", function () { setFs(false, true); });
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement) setFs(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setFs(false); });
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function () { if (!mq.matches) setFs(false); });
})();
