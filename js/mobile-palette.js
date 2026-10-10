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

  function setOpen(o) {
    aside.classList.toggle("mb-open", o);
    scrim.classList.toggle("on", o);
    btn.setAttribute("aria-expanded", o ? "true" : "false");
  }
  function syncDot() {
    var sw = pal.querySelector('.swatch[aria-pressed="true"]');
    if (sw) btn.firstChild.style.setProperty("--c", getComputedStyle(sw).backgroundColor);
  }
  btn.addEventListener("click", function () { setOpen(!aside.classList.contains("mb-open")); });
  scrim.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  /* انتخاب رنگ (از پالت یا رنگ‌های اخیر) پنل رو می‌بنده تا بشه سریع کشید */
  aside.addEventListener("click", function (e) {
    if (mq.matches && e.target.closest(".swatch, .sp-rc")) setTimeout(function () { syncDot(); setOpen(false); }, 120);
  });
  new MutationObserver(syncDot).observe(pal, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  mq.addEventListener && mq.addEventListener("change", function () { setOpen(false); });
  syncDot();
})();
