/* theme.js — سوییچ روز/شب.
   «خودکار» پیش‌فرض است و از ترجیح سیستم‌عامل پیروی می‌کند (گوشی‌ها شب‌ها
   خودشان تیره می‌شوند). انتخاب بازدیدکننده در localStorage می‌ماند و
   اسکریپت کوچک داخل <head> همان انتخاب را قبل از رنگ‌آمیزی صفحه اعمال
   می‌کند تا پرش سفید نداشته باشیم. */
(function () {
  var KEY = "cara-theme";
  var MODES = ["auto", "light", "dark"];
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var LABEL = { auto: "خودکار", light: "روشن", dark: "تیره" };
  var HINT = {
    auto: "حالت خودکار؛ با تنظیم روز/شب گوشی عوض می‌شود",
    light: "حالت روشن",
    dark: "حالت تیره",
  };
  var ICON = {
    auto:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
    light:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"/></svg>',
    dark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4z"/></svg>',
  };

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return MODES.indexOf(v) >= 0 ? v : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function write(mode) {
    try {
      localStorage.setItem(KEY, mode);
    } catch (e) {
      /* حالت خصوصی مرورگر: فقط همین صفحه عوض می‌شود */
    }
  }

  function resolve(mode) {
    return mode === "dark" || (mode === "auto" && mq.matches) ? "dark" : "light";
  }

  function button() {
    return document.querySelector(".theme-toggle");
  }

  function paintButton(mode) {
    var btn = button();
    if (!btn) return;
    var next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    btn.innerHTML = ICON[mode];
    btn.dataset.mode = mode;
    btn.setAttribute("aria-label", "حالت نمایش: " + LABEL[mode] + "؛ برای " + LABEL[next] + " کلیک کن");
    btn.setAttribute("title", HINT[mode] + " — کلیک: " + LABEL[next]);
  }

  function apply() {
    var mode = read();
    var theme = resolve(mode);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-mode", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121120" : "#faf8fb");
    paintButton(mode);
  }

  function toggle() {
    var mode = read();
    write(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    apply();
  }

  function mount() {
    var nav = document.querySelector(".sh__nav");
    if (!nav || button()) {
      paintButton(read());
      return;
    }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.addEventListener("click", toggle);
    var cta = nav.querySelector(".sh__cta");
    nav.insertBefore(btn, cta || null);
    paintButton(read());
  }

  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);

  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
