/* استودیوی تمام‌صفحه: راهنمای مرحله‌ی بعد، بزرگ‌نمایی شناور و حالت تمام‌صفحه.
   هیچ منطق طراحی را دست نمی‌زند؛ فقط روی همان دکمه‌ها و ورودی‌های موجود کار می‌کند. */
(() => {
  const section = document.querySelector(".builder > section.panel");
  const wrap = document.getElementById("gridWrap");
  const canvas = document.getElementById("grid");
  const zoomIn = document.getElementById("zoom");
  if (!section || !wrap || !canvas || !zoomIn) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const tools = Array.from(section.querySelectorAll("[data-tool]"));
  const toolName = document.getElementById("toolName");
  const dimW = document.getElementById("w");
  const dimH = document.getElementById("h");

  /* برچسب کوتاه زیر آیکن: بخش قبل از «·» (کلید میان‌بر حذف می‌شود) */
  const SHORT = {
    "توپر یا توخالی (مستطیل و بیضی)": "توپر/توخالی",
    "جایگزینی همه‌ی خانه‌ها با رنگ انتخاب‌شده": "پرکردن همه",
    "پاک کردن همه": "پاک‌کردن همه",
    "چرخاندن الگو": "چرخش",
    "آینه‌ای کردن الگو": "آینه",
    "برش و جابه‌جایی": "برش",
    "ذخیره‌ی طرح": "ذخیره",
    "بازکردن طرح": "بازکردن",
    "تصویر الگو": "تصویر",
    "کد منجوق": "کد منجوق",
  };
  section.querySelectorAll("[data-tip]").forEach((btn) => {
    const short = (btn.dataset.tip || "").split("·")[0].trim();
    if (short) btn.dataset.label = SHORT[short] || short;
  });

  const HINTS = {
    brush: { text: "روی خانه‌ها بکش تا منجوق بچینی.", next: "fill", nextLabel: "سطل رنگ" },
    eraser: { text: "روی خانه‌ها بکش تا خالی شن.", next: "brush", nextLabel: "قلم" },
    fill: { text: "روی یک خانه بزن تا همه‌ی ناحیه‌ی هم‌رنگ پر شه.", next: "line", nextLabel: "خط" },
    line: { text: "از یک خانه بکش تا خانه‌ی دیگر؛ خط صاف می‌کشه.", next: "shape", nextLabel: "شکل" },
    shape: { text: "شکل رو انتخاب کن و روی بوم بکش تا ساخته شه.", next: "text", nextLabel: "متن" },
    text: { text: "متن یا اسم رو تایپ کن تا روی دستبند بنشینه.", next: "brush", nextLabel: "قلم" },
    pick: { text: "روی هر منجوق بزن تا رنگش انتخاب شه.", next: "brush", nextLabel: "قلم" },
    select: { text: "دور ناحیه‌ای بکش تا انتخاب شه، بعد جابه‌جا یا پاکش کن.", next: "brush", nextLabel: "قلم" },
    pan: { text: "بوم رو با دست بگیر و جابه‌جا کن.", next: "brush", nextLabel: "قلم" },
  };

  /* ---- راهنمای مرحله‌ی بعد ---- */
  const tip = document.createElement("div");
  tip.className = "bs-tip";
  tip.setAttribute("role", "status");
  tip.setAttribute("aria-live", "polite");
  tip.innerHTML =
    '<span class="bs-tip__ico" aria-hidden="true">✦</span>' +
    '<p class="bs-tip__txt"></p>' +
    '<button class="bs-tip__next" type="button"></button>';
  const tipText = tip.querySelector(".bs-tip__txt");
  const tipBtn = tip.querySelector(".bs-tip__next");

  /* «ادامه سفارش» و «افزودن به سبد» کنار راهنما می‌نشینند تا همیشه در دید باشند */
  const cta = document.createElement("div");
  cta.className = "bs-cta";
  tip.appendChild(cta);
  const ctaNext = document.getElementById("next");
  const ctaAdd = document.getElementById("addDesignToCart");
  const wide = window.matchMedia("(min-width: 1100px)");
  const placeCta = () => {
    [ctaNext, ctaAdd].forEach((el) => {
      if (!el) return;
      if (wide.matches) cta.appendChild(el);
      else if (el.parentElement === cta) {
        const grp = toolbar && toolbar.querySelector(".grp.bare");
        if (grp) grp.appendChild(el);
      }
    });
  };
  const toolbar = section.querySelector(".tools");
  if (toolbar && toolbar.nextSibling) section.insertBefore(tip, toolbar.nextSibling);
  else section.insertBefore(tip, wrap);
  placeCta();
  wide.addEventListener("change", placeCta);

  const currentTool = () => (tools.find((b) => b.getAttribute("aria-pressed") === "true") || {}).dataset?.tool || "brush";

  function updateTip() {
    const tool = currentTool();
    const hint = HINTS[tool];
    const empty = !(document.getElementById("total") || {}).textContent?.match(/[۱-۹]/);
    if (empty && tool === "brush") {
      const narrow = dimW && dimH && (Number(dimW.value) !== 15 || Number(dimH.value) !== 80);
      tipText.innerHTML = narrow
        ? "برای شروع، ابعاد رو بذار روی <b>۱۵ در ۸۰</b> (اندازه‌ی یک دستبند معمولی) و با قلم روی خانه‌ها بکش."
        : "یک رنگ از پالت انتخاب کن و روی خانه‌ها بکش؛ <b>راست‌کلیک</b> پاک می‌کنه.";
      tipBtn.textContent = narrow ? "۱۵×۸۰" : "نمای کامل";
      if (narrow) {
        tipBtn.dataset.preset = "15x80";
        delete tipBtn.dataset.fit;
        delete tipBtn.dataset.tool;
      } else {
        tipBtn.dataset.fit = "1";
        delete tipBtn.dataset.preset;
        delete tipBtn.dataset.tool;
      }
      return;
    }
    if (hint) {
      tipText.innerHTML = "مرحله‌ی بعد: " + hint.text;
      tipBtn.textContent = hint.nextLabel;
      tipBtn.dataset.tool = hint.next;
      delete tipBtn.dataset.preset;
      delete tipBtn.dataset.fit;
      return;
    }
    tipText.textContent = "با قلم روی خانه‌ها بکش تا منجوق بچینی.";
    tipBtn.textContent = "قلم";
    tipBtn.dataset.tool = "brush";
    delete tipBtn.dataset.fit;
  }

  tipBtn.addEventListener("click", () => {
    if (tipBtn.dataset.fit) {
      fitMode = true;
      fitToView();
    } else if (tipBtn.dataset.preset && dimW && dimH) {
      const [w, h] = tipBtn.dataset.preset.split("x");
      dimW.value = w;
      dimH.value = h;
      dimH.dispatchEvent(new Event("change", { bubbles: true }));
      dimW.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (tipBtn.dataset.tool) {
      const btn = tools.find((b) => b.dataset.tool === tipBtn.dataset.tool);
      if (btn) btn.click();
    }
    fitToView();
    updateTip();
  });

  tools.forEach((b) => b.addEventListener("click", () => setTimeout(updateTip, 0)));
  if (toolName) {
    new MutationObserver(updateTip).observe(toolName, { childList: true, characterData: true, subtree: true });
  }

  /* ---- بزرگ‌نمایی شناور ---- */
  const zoomBox = document.createElement("div");
  zoomBox.className = "bs-zoom";
  zoomBox.setAttribute("role", "group");
  zoomBox.setAttribute("aria-label", "بزرگ‌نمایی بوم");
  zoomBox.innerHTML =
    '<button type="button" data-zoom="out" aria-label="کوچک‌تر">−</button>' +
    '<button type="button" class="bs-zoom__fit" data-zoom="reset">۱۰۰٪</button>' +
    '<button type="button" class="bs-zoom__fit" data-zoom="fit">نمای کامل</button>' +
    '<button type="button" data-zoom="in" aria-label="بزرگ‌تر">+</button>' +
    '<button type="button" class="bs-zoom__fit bs-zoom__flip" data-zoom="flip" aria-pressed="true">افقی</button>';
  wrap.appendChild(zoomBox);

  let fitMode = false;

  function setZoomTo(value) {
    zoomIn.value = clamp(Math.round(value / 5) * 5, 20, 250);
    zoomIn.dispatchEvent(new Event("input", { bubbles: true }));
  }

  let fitting = false;

  function fitToView() {
    const avail = wrap.clientHeight - 44;
    if (avail < 80) return;
    fitting = true;
    try {
      fitLoop(avail);
    } finally {
      fitting = false;
    }
  }

  function fitLoop(avail) {
    const availW = wrap.clientWidth - 44;
    for (let i = 0; i < 3; i++) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ratio = Math.min(availW / r.width, avail / r.height);
      if (Math.abs(ratio - 1) < 0.015) return;
      const next = clamp((Number(zoomIn.value) || 100) * ratio, 20, 250);
      if (Math.abs(next - Number(zoomIn.value)) < 1) return;
      setZoomTo(next);
    }
  }

  zoomBox.addEventListener("click", (event) => {
    const act = (event.target.closest("[data-zoom]") || {}).dataset?.zoom;
    if (!act) return;
    if (act === "flip") {
      document.dispatchEvent(new CustomEvent("builder:flip"));
      setTimeout(() => { if (fitMode) fitToView(); }, 30);
      return;
    }
    if (act === "fit") {
      fitMode = true;
      fitToView();
      return;
    }
    fitMode = false;
    if (act === "reset") setZoomTo(100);
    else setZoomTo((Number(zoomIn.value) || 100) + (act === "in" ? 20 : -20));
  });

  /* اگر کاربر خودش زوم را عوض کند، حالت «نمای کامل» کنار می‌رود */
  zoomIn.addEventListener("input", () => {
    if (!fitting) fitMode = false;
  });

  /* ---- تمام‌صفحه ---- */
  const fsBtn = document.createElement("button");
  fsBtn.type = "button";
  fsBtn.className = "bs-fs-btn";
  fsBtn.innerHTML = '<span aria-hidden="true">⤢</span> تمام‌صفحه';
  const head = section.querySelector(".head");
  if (head) head.appendChild(fsBtn);
  else section.appendChild(fsBtn);

  const setFullscreen = (on) => {
    document.body.classList.toggle("bs-fs", on);
    fsBtn.innerHTML = on
      ? '<span aria-hidden="true">⤡</span> خروج'
      : '<span aria-hidden="true">⤢</span> تمام‌صفحه';
    fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    setTimeout(() => { if (fitMode) fitToView(); }, 60);
  };

  fsBtn.addEventListener("click", () => setFullscreen(!document.body.classList.contains("bs-fs")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("bs-fs")) setFullscreen(false);
  });

  /* ---- هم‌گام با تغییر اندازه و ابعاد ---- */
  let rz = 0;
  addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (fitMode) fitToView(); }, 160);
  });
  if (dimW) dimW.addEventListener("change", () => { if (fitMode) setTimeout(fitToView, 40); });
  if (dimH) dimH.addEventListener("change", () => { if (fitMode) setTimeout(fitToView, 40); });

  /* خوشه‌ی زوم بالای نوار ابزار شناور می‌شود؛ ارتفاع نوار را از DOM می‌گیریم */
  const toolsRow = section.querySelector(".tools");
  const syncToolsH = () => {
    if (toolsRow) document.documentElement.style.setProperty("--bs-tools-h", toolsRow.offsetHeight + "px");
  };
  syncToolsH();
  addEventListener("resize", syncToolsH);
  setTimeout(syncToolsH, 400);

  const flipBtn = zoomBox.querySelector("[data-zoom='flip']");
  const syncFlip = () => {
    const h = document.body.dataset.gridAxis === "h";
    if (!flipBtn) return;
    flipBtn.textContent = h ? "افقی" : "عمودی";
    flipBtn.setAttribute("aria-pressed", h ? "true" : "false");
    flipBtn.setAttribute("aria-label", h ? "چیدمان افقی؛ برای عمودی کلیک کن" : "چیدمان عمودی؛ برای افقی کلیک کن");
  };
  syncFlip();
  document.addEventListener("builder:flipped", syncFlip);

  /* از همان اول کل الگو در دید است */
  fitMode = true;
  setTimeout(fitToView, 120);

  updateTip();
})();
