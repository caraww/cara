/* Five-question bracelet matcher. Uses only local works data and sends no personal data. */
(function () {
  "use strict";
  const works = (window.CARA && window.CARA.works) || [];
  const steps = [...document.querySelectorAll(".quiz__step")];
  const next = document.getElementById("quizNext");
  const back = document.getElementById("quizBack");
  const card = document.getElementById("quizCard");
  const result = document.getElementById("quizResult");
  const count = document.getElementById("quizCount");
  const bar = document.getElementById("quizBar");
  const answers = {};
  let step = 0;
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const slug = (id) => String(id).trim().replace(/[\s\u200c]+/g, "-").replace(/[\/\\?#%.]+/g, "");
  const has = (work, tag) => (work.tags || []).includes(tag);
  const any = (work, tags) => tags.some((tag) => has(work, tag));

  const map = {
    style: {
      minimal: ["مینیمال", "هندسی", "ساده"],
      colorful: ["رنگارنگ", "شاد", "پرانرژی"],
      pictorial: ["کارتونی", "حیوانات", "طرفداری", "ایرانی", "سنتی", "اسطوره‌ای"],
      name: ["عاشقانه", "یادگاری", "هدیه"],
    },
    occasion: {
      daily: ["روزمره", "ساده", "مینیمال"],
      gift: ["هدیه", "عاشقانه", "یادگاری"],
      special: ["خاص", "جسور", "نوستالژیک", "ایرانی", "معنوی"],
    },
    color: {
      dark: ["مشکی", "جسور"],
      light: ["سفید", "مینیمال"],
      gold: ["عاشقانه", "هدیه", "ایرانی"],
      colorful: ["رنگارنگ", "شاد", "تابستونی"],
    },
    mood: {
      calm: ["مینیمال", "ساده", "روزمره"],
      bold: ["جسور", "خاص", "رنگارنگ", "چشم"],
      meaning: ["عاشقانه", "معنوی", "یادگاری", "ایرانی"],
    },
  };

  function paint() {
    steps.forEach((el, i) => el.classList.toggle("is-on", i === step));
    count.textContent = "سؤال " + fa(step + 1) + " از " + fa(steps.length);
    bar.style.width = Math.round(((step + 1) / steps.length) * 100) + "%";
    back.hidden = step === 0;
    next.textContent = step === steps.length - 1 ? "دیدن نتیجه" : "بعدی";
    next.disabled = !answers[steps[step].querySelector("[data-q]").dataset.q];
  }

  document.querySelectorAll(".quiz__opt").forEach((button) => {
    button.addEventListener("click", () => {
      const q = button.dataset.q;
      answers[q] = button.dataset.v;
      document.querySelectorAll(`.quiz__opt[data-q="${q}"]`).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      next.disabled = false;
    });
  });

  next.addEventListener("click", () => {
    if (step < steps.length - 1) {
      step++;
      paint();
      return;
    }
    showResult();
  });
  back.addEventListener("click", () => {
    if (step > 0) { step--; paint(); }
  });
  document.getElementById("quizAgain").addEventListener("click", () => {
    Object.keys(answers).forEach((key) => delete answers[key]);
    step = 0;
    result.classList.remove("is-on");
    card.hidden = false;
    document.querySelectorAll(".quiz__opt").forEach((item) => item.setAttribute("aria-pressed", "false"));
    paint();
  });

  function showResult() {
    const cap = answers.budget === "low" ? 800000 : answers.budget === "mid" ? 1500000 : Infinity;
    const usable = works.filter((w) => typeof w.price === "number" && w.price > 0);
    if (!usable.length) {
      result.classList.add("is-on");
      card.hidden = true;
      document.getElementById("quizCards").innerHTML = '<p class="cp__note">گالری داره به‌روز می‌شه. چند لحظه بعد دوباره تلاش کن.</p>';
      return;
    }
    const within = usable.filter((w) => w.price <= cap);
    const pool = within.length >= 3 ? within : usable;
    const scored = pool.map((w) => {
      let score = 0;
      for (const q of ["style", "occasion", "color", "mood"]) {
        const tags = map[q][answers[q]] || [];
        if (any(w, tags)) score += 2;
      }
      if (answers.budget === "high") score += w.price > 1600000 ? 1 : 0;
      if (within.includes(w)) score += 1;
      return { w, score };
    }).sort((a, b) => b.score - a.score || a.w.price - b.w.price);
    const top = scored.slice(0, 3).map((x) => x.w);
    document.getElementById("quizCards").innerHTML = top.map((w) => `<a class="quiz__work" href="/bracelet/${encodeURIComponent(slug(w.id))}.html"><picture>${w.thumbAvif ? `<source type="image/avif" srcset="/${w.thumbAvif}">` : ""}<img src="/${w.thumb || w.src}" alt="دستبند منجوقی ${w.title || w.id}" loading="lazy"></picture><b>${w.title || w.id}</b><span>${window.CARA_SALE ? CARA_SALE.priceHTML(w.price) : fa(w.price) + " تومان"}</span><small>${w.note || ""}</small></a>`).join("");
    document.getElementById("quizSummary").innerHTML = answers.style === "name"
      ? 'نزدیک‌ترین‌ها به سلیقه‌ات این‌ها هستن. چون اسم و طرح شخصی رو دوست داری، <a href="/name-bracelet.html">ابزار دستبند اسم</a> هم دقیقاً برای همینه.'
      : "این سه طرح بر اساس سبک، مناسبت، رنگ و بودجه‌ات نزدیک‌ترین بودن. اگه هیچ‌کدوم رو دوست نداشتی، توی استودیو طرح خودت رو بساز.";
    card.hidden = true;
    result.classList.add("is-on");
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    window.CARA && window.CARA.track && window.CARA.track("quiz_complete", { results: top.map((w) => w.id).join("|") });
  }

  paint();
})();
