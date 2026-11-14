/* home.js — فقط صفحه‌ی اصلی (index.html)
   ترتیب لود: palette.js ← works.js ← beads.js ← home.js ← decor.js
   داخلش:  ۱) نوار ثابت پایین موبایل (m-cta)
           ۲) رنگ‌ها/منجوق‌ها، نمونه‌ها، نخ اسکرول، ورود نرم بخش‌ها، کپی کد

   نسبت به نسخه‌ی قبلی:
   - دیگه دنبال .top نمی‌گرده (هدر جدید خودش توی cn-header.js مدیریت می‌شه)
   - کد زمین مهره‌ی #heroCanvas و چرخش دستبند با اسکرول حذف شد؛ توی HTML فعلی
     اون المان‌ها وجود نداشتن، و همین باعث می‌شد نخ اسکرول، ورود نرم بخش‌ها و
     کپی کد رنگ اجرا نشن. */

/* ==================================================================
   ۱) نوار ثابت پایین موبایل: وقتی هیرو از صفحه خارج شد ظاهر می‌شه
   ================================================================== */
try {
  (function () {
    var bar = document.getElementById("mCta"),
      hero = document.querySelector(".hx, .cn-hero");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(
      function (e) {
        var on = !e[0].isIntersecting;
        bar.classList.toggle("on", on);
        bar.setAttribute("aria-hidden", on ? "false" : "true");
        bar.querySelectorAll("a").forEach(function (a) {
          a.tabIndex = on ? 0 : -1;
        });
      },
      { threshold: 0.15 },
    ).observe(hero);
  })();
} catch (e) {
  console.error("home:mcta", e);
}

/* ==================================================================
   ۲) صفحه‌ی اصلی
   ================================================================== */
try {
  (() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- رنگ منجوق‌ها ---------- */
    const chips = document.getElementById("chips");
    if (chips) {
      /* عکس واقعی منجوق‌ها: برای هر رنگ سعی می‌کنه img/beads/<کد رنگ>.jpg رو لود کنه (مثلاً DB0680.jpg).
       اگه jpg نبود png/webp رو امتحان می‌کنه؛ اگه هیچ عکسی نبود همون منجوق کشیده‌شده می‌مونه.
       فقط اسم فایل باید دقیقاً کد رنگ باشه (حروف بزرگ). */
      const EXTS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
      const shade = (hex, k) => {
        const t = k < 0 ? 0 : 255;
        return `rgb(${CARA.hexRgb(hex)
          .map((v) => Math.round(v + (t - v) * Math.abs(k)))
          .join(",")})`;
      };
      const beadSVG = (
        hex,
        i,
      ) => `<svg viewBox="0 0 100 78" aria-hidden="true"><defs>
      <linearGradient id="b${i}" x1="0" x2="1"><stop offset="0" stop-color="${shade(hex, -0.38)}"/><stop offset=".3" stop-color="${shade(hex, 0.22)}"/><stop offset=".6" stop-color="${hex}"/><stop offset="1" stop-color="${shade(hex, -0.45)}"/></linearGradient>
      <radialGradient id="t${i}" cx=".4" cy=".35"><stop offset="0" stop-color="${shade(hex, 0.5)}"/><stop offset="1" stop-color="${shade(hex, -0.05)}"/></radialGradient></defs>
      <path d="M12 30v26c0 10 17 16 38 16s38-6 38-16V30z" fill="url(#b${i})"/><ellipse cx="50" cy="30" rx="38" ry="17" fill="url(#t${i})"/>
      <ellipse cx="50" cy="30" rx="17" ry="8" fill="${shade(hex, -0.7)}"/><ellipse cx="50" cy="28.5" rx="17" ry="6.2" fill="${shade(hex, -0.88)}" opacity=".75"/>
      <path d="M22 45c1 5 5 8 10 10" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
      /* js/beads.js (با tools/build-beads.js ساخته می‌شه) می‌گه کدوم عکس‌ها واقعاً هستن؛ بدون اون همون امتحان پسوندها انجام می‌شه */
      const BF = CARA.beadFiles;
      const bead = (p, i) =>
        !BF
          ? `<img src="img/beads/${p.code}.${EXTS[0]}" data-e="0" alt="${p.name}" loading="lazy">`
          : BF[p.code]
            ? `<img src="img/beads/${BF[p.code]}" data-e="${EXTS.length}" alt="${p.name}" loading="lazy">`
            : beadSVG(p.hex, i);
      CARA.palette.forEach((p, i) =>
        chips.insertAdjacentHTML(
          "beforeend",
          `<li data-i="${i}" tabindex="0" role="button" aria-label="کپی کد ${p.code}"><div class="bead">${bead(p, i)}</div><b>${p.code}</b><span>${p.name}</span></li>`,
        ),
      );
      /* خطای لود عکس بابل نمی‌شه، پس توی فاز capture می‌گیریمش: پسوند بعدی یا برگشت به منجوق کشیده‌شده */
      chips.addEventListener(
        "error",
        (e) => {
          const im = e.target;
          if (im.tagName !== "IMG") return;
          const n = Number(im.dataset.e) + 1,
            li = im.closest("li"),
            p = CARA.palette[Number(li.dataset.i)];
          if (n < EXTS.length) {
            im.dataset.e = n;
            im.src = `img/beads/${p.code}.${EXTS[n]}`;
          } else
            li.querySelector(".bead").innerHTML = beadSVG(
              p.hex,
              Number(li.dataset.i),
            );
        },
        true,
      );
    }

    /* ---------- چند عکس تصادفی از کارهای خودم (js/works.js با tools/build-works.js ساخته می‌شه) ---------- */
    const mg = document.getElementById("miniGal"),
      works = CARA.works || [];
    const esc = (t) =>
      String(t).replace(
        /[&<>"]/g,
        (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
      );
    if (mg) {
      if (!works.length) {
        const s = document.getElementById("samples");
        if (s) s.hidden = true;
      } else {
        const pick = [...works].sort(() => Math.random() - 0.5).slice(0, 4);
        mg.innerHTML = pick
          .map(
            (s) =>
              `<a href="/bracelet/${encodeURIComponent(
                String(s.id)
                  .trim()
                  .replace(/[\s\u200c]+/g, "-")
                  .replace(/[\/\\?#%.]+/g, ""),
              )}.html"><img src="${esc(s.thumb)}" alt="${esc(s.title)}"${s.w ? ` width="${s.w}" height="${s.h}"` : ""} loading="lazy" decoding="async"><b>${esc(s.title)}</b></a>`,
          )
          .join("");
        mg.addEventListener(
          "error",
          (e) => {
            if (e.target.tagName === "IMG") e.target.closest("a").hidden = true;
          },
          true,
        );
      }
    }

    /* ---------- نخ مهره‌ای بالای صفحه = میزان اسکرول ---------- */
    const bar = document.getElementById("threadBar");
    if (bar) {
      const prog = () => {
        const m = document.documentElement.scrollHeight - innerHeight;
        bar.style.setProperty("--p", (m > 0 ? (scrollY / m) * 100 : 0) + "%");
      };
      addEventListener("scroll", prog, { passive: true });
      prog();
    }

    /* ---------- ورود نرم بخش‌ها هنگام اسکرول ---------- */
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          }),
        { threshold: 0.15 },
      );
      document
        .querySelectorAll(
          ".sec h2, .lead, .path, .mini-gal a, .steps li, .chips li",
        )
        .forEach((el, i) => {
          el.classList.add("rv");
          el.style.setProperty("--d", (i % 6) * 0.06 + "s");
          io.observe(el);
        });
    }

    /* ---------- کلیک روی هر رنگ = کپی کد ---------- */
    if (chips) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
      let tt;
      chips.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const code = li.querySelector("b").textContent;
        Promise.resolve(
          navigator.clipboard && navigator.clipboard.writeText(code),
        )
          .catch(() => {})
          .finally(() => {
            toast.textContent = `کد ${code} کپی شد`;
            toast.classList.add("on");
            clearTimeout(tt);
            tt = setTimeout(() => toast.classList.remove("on"), 1600);
          });
      });
      /* با کیبورد هم می‌شه کد رنگ رو کپی کرد */
      chips.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.tagName === "LI") {
          e.preventDefault();
          e.target.click();
        }
      });
    }
  })();
} catch (e) {
  console.error("home:main", e);
}
