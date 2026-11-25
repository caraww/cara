/* Verified-purchase reviews: public list + signed-in review form.
   Containers: <div class="reviews" data-reviews data-work="..."></div> */
(function () {
  "use strict";
  const C = window.CARA;
  if (!C) return;
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cache = new Map();

  const stars = (rating) => "★".repeat(Math.max(0, Math.min(5, Number(rating) || 0))) + "☆".repeat(Math.max(0, 5 - (Number(rating) || 0)));

  async function dataFor(workId) {
    if (cache.has(workId)) return cache.get(workId);
    const promise = fetch("/api/reviews?work=" + encodeURIComponent(workId), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reviews: [], summary: { count: 0, average: 0 } }))
      .catch(() => ({ reviews: [], summary: { count: 0, average: 0 } }));
    cache.set(workId, promise);
    return promise;
  }

  function form(container, workId, refresh) {
    const wrap = document.createElement("div");
    wrap.className = "review-form";
    wrap.innerHTML = `
      <h3>نظرت را بنویس</h3>
      <p class="review-hint">هر کسی می‌تواند نظر بدهد. نظر بعد از تأیید نمایش داده می‌شود.</p>
      <label>اسمت
        <input class="review-author" type="text" maxlength="60" placeholder="مثلاً سارا" autocomplete="name">
      </label>
      <label>امتیاز
        <select class="review-rating">
          <option value="5">۵ — عالی</option>
          <option value="4">۴ — خیلی خوب</option>
          <option value="3">۳ — خوب</option>
          <option value="2">۲ — متوسط</option>
          <option value="1">۱ — ضعیف</option>
        </select>
      </label>
      <label>متن نظر
        <textarea class="review-body" rows="3" maxlength="600" placeholder="از کیفیت بافت، رنگ‌ها و بسته‌بندی بنویس…"></textarea>
      </label>
      <input class="review-website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="btns"><button class="btn dark" type="button">ثبت نظر</button></div>
      <p class="review-msg" role="status" aria-live="polite"></p>`;
    const button = wrap.querySelector("button");
    const msg = wrap.querySelector(".review-msg");
    button.addEventListener("click", async () => {
      button.disabled = true;
      msg.textContent = "دارم ثبت می‌کنم…";
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workId,
            author: wrap.querySelector(".review-author").value,
            rating: Number(wrap.querySelector(".review-rating").value),
            body: wrap.querySelector(".review-body").value,
            website: wrap.querySelector(".review-website").value,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "ثبت نظر انجام نشد.");
        msg.textContent = "نظرت ثبت شد و بعد از تأیید نمایش داده می‌شود. ممنون!";
        wrap.querySelector(".review-body").value = "";
        C.track && C.track("review_submit", { work: workId });
        cache.delete(workId);
      } catch (error) {
        msg.textContent = error.message;
        msg.style.color = "#c93a2b";
      } finally {
        button.disabled = false;
      }
    });
    container.appendChild(wrap);
  }

  async function render(container, workId) {
    if (!container || !workId) return;
    if (container.dataset.loaded === workId) return;
    container.dataset.loaded = workId;
    container.dataset.work = workId;
    container.innerHTML = '<p class="review-empty">دارم نظرها را می‌آورم…</p>';
    const data = await dataFor(workId);
    const summary = data.summary || { count: 0, average: 0 };
    const list = Array.isArray(data.reviews) ? data.reviews : [];
    const head = summary.count
      ? `<div class="review-summary"><b>${summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</b><span class="review-stars" aria-hidden="true">${stars(Math.round(summary.average))}</span><small>${fa(summary.count)} نظر تأییدشده</small></div>`
      : '<p class="review-empty">هنوز نظری برای این دستبند ثبت نشده. اولین نفر باش!</p>';
    const items = list.map((review) => `
      <article class="review-item">
        <div class="review-top"><b>${esc(review.author)}</b><span class="review-stars" aria-label="امتیاز ${fa(review.rating)} از ۵">${stars(review.rating)}</span></div>
        <p>${esc(review.body)}</p>
        <small>${review.createdAt ? new Date(review.createdAt * 1000).toLocaleDateString("fa-IR", { dateStyle: "long" }) : ""}</small>
      </article>`).join("");
    container.innerHTML = head + items;
    form(container, workId);
  }

  function scan() {
    document.querySelectorAll("[data-reviews]").forEach((container) => {
      const work = container.dataset.work || container.getAttribute("data-work");
      if (work) render(container, work);
    });
  }

  /* Gallery lightbox: the dialog keeps one container and changes the hash. */
  const lbTitle = document.getElementById("lbTitle");
  const lbBox = document.getElementById("lbReviews");
  if (lbTitle && lbBox) {
    let last = "";
    const sync = () => {
      const id = decodeURIComponent((location.hash || "").slice(1));
      if (!id) { lbBox.innerHTML = ""; lbBox.dataset.loaded = ""; last = ""; return; }
      if (id === last) return;
      last = id;
      render(lbBox, id);
    };
    new MutationObserver(sync).observe(lbTitle, { childList: true, characterData: true, subtree: true });
    addEventListener("hashchange", sync);
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  window.CARA_REVIEWS = Object.freeze({ render, refresh: () => { cache.clear(); document.querySelectorAll("[data-reviews]").forEach((c) => { c.dataset.loaded = ""; }); scan(); } });
})();
