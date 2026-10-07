(() => {
  const $ = (id) => document.getElementById(id), fa = (n) => Number(n).toLocaleString("fa-IR");
  const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  const W = (window.CARA && CARA.works) || [];
  const FAV = "cara-fav-works";
  let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem(FAV)) || []); } catch {}
  const saveFav = () => { try { localStorage.setItem(FAV, JSON.stringify([...favs])); } catch {} };
  let tag = "همه", onlyFav = false, q = "", list = W.slice(), cur = -1;
  const grid = $("wkGrid"), lb = $("lb");

  /* برچسب‌ها فقط وقتی هست که توی info.json نوشته باشی */
  const tags = [...new Set(W.flatMap((w) => w.tags || []))];
  $("tagbar").innerHTML = tags.length ? ["همه", ...tags].map((t) => `<button class="tool" data-tag="${esc(t)}" aria-pressed="${t === "همه"}">${esc(t)}</button>`).join("") : "";
  $("tagbar").hidden = !tags.length;
  if (W.length < 6) $("q").hidden = true;
  if (!W.length) $("wkTools").hidden = true;

  function render() {
    list = W.filter((w) => (tag === "همه" || (w.tags || []).includes(tag)) && (!onlyFav || favs.has(w.id)) &&
      (!q || `${w.title} ${w.note} ${(w.tags || []).join(" ")}`.toLowerCase().includes(q)));
    grid.innerHTML = list.map((w, i) => {
      const ar = w.w && w.h ? ` style="--ar:${(w.w / w.h).toFixed(4)};--i:${i % 8}"` : ` style="--i:${i % 8}"`;
      return `<figure class="wk-card" data-id="${esc(w.id)}" tabindex="0" role="button" aria-label="${esc(w.title)}"${ar}>
        <button class="wk-fav" aria-label="علاقه‌مندی" aria-pressed="${favs.has(w.id)}">♥</button>
        <img src="${esc(w.thumb)}" data-fb="${esc(w.src)}" alt="دستبند منجوقی ${esc(w.title)}"${w.w ? ` width="${w.w}" height="${w.h}"` : ""} loading="${i < 6 ? "eager" : "lazy"}" decoding="async">
        <figcaption><b>${esc(w.title)}</b>${w.note ? `<span>${esc(w.note)}</span>` : ""}</figcaption></figure>`;
    }).join("");
    grid.querySelectorAll("img").forEach((im) => { if (im.complete) im.classList.add("in"); });
    $("wkCount").textContent = W.length ? `${fa(list.length)} کار` : "";
    const empty = $("empty");
    empty.hidden = list.length > 0;
    empty.textContent = !W.length ? "به‌زودی عکس کارهام رو این‌جا می‌ذارم." : onlyFav ? "هنوز چیزی رو علاقه‌مندی نکردی." : "چیزی پیدا نشد. یه کلمه‌ی دیگه امتحان کن.";
  }
  grid.addEventListener("load", (e) => { if (e.target.tagName === "IMG") e.target.classList.add("in"); }, true);
  grid.addEventListener("error", (e) => { /* اگه عکس کوچیک نبود یه بار عکس اصلی رو امتحان می‌کنه؛ اگه اون هم نبود، کارت مخفی می‌شه */
    const im = e.target; if (im.tagName !== "IMG") return;
    if (im.dataset.fb && !im.dataset.tried) { im.dataset.tried = "1"; im.src = im.dataset.fb; } else im.closest(".wk-card").hidden = true;
  }, true);

  /* لایت‌باکس */
  function show(i) {
    if (!list.length) return;
    cur = (i + list.length) % list.length;
    const w = list[cur];
    $("lbImg").classList.remove("in");
    $("lbImg").src = w.src; $("lbImg").alt = "دستبند منجوقی " + w.title;
    if ($("lbImg").complete && $("lbImg").naturalWidth) $("lbImg").classList.add("in"); /* عکس کش‌شده: گاهی load دوباره نمیاد */
    $("lbTitle").textContent = w.title; $("lbNote").textContent = w.note; $("lbNote").hidden = !w.note;
    $("lbTags").innerHTML = (w.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
    const imgs = w.images && w.images.length > 1 ? w.images : [];
    $("lbThumbs").innerHTML = imgs.map((s, k) => `<button type="button" class="${k ? "" : "on"}" data-src="${esc(s)}" aria-label="عکس ${fa(k + 1)}"><img src="${esc(s)}" alt=""></button>`).join("");
    $("lbThumbs").hidden = !imgs.length;
    $("lbNum").textContent = `${fa(cur + 1)} از ${fa(list.length)}`;
    $("lbFav").setAttribute("aria-pressed", favs.has(w.id));
    $("lbMake").href = "upload.html?src=" + encodeURIComponent(w.src);
    [list[(cur + 1) % list.length], list[(cur - 1 + list.length) % list.length]].forEach((n) => { new Image().src = n.src; }); /* عکس بعدی و قبلی از قبل لود می‌شه */
    try { history.replaceState(null, "", "#" + encodeURIComponent(w.id)); } catch {}
  }
  function open(id) {
    const i = list.findIndex((w) => w.id === id);
    if (i < 0) return;
    show(i);
    if (!lb.open) lb.showModal ? lb.showModal() : lb.setAttribute("open", "");
  }
  $("lbThumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]"); if (!b) return;
    $("lbThumbs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    $("lbImg").classList.remove("in"); $("lbImg").src = b.dataset.src;
  });
  $("lbImg").addEventListener("load", (e) => e.target.classList.add("in"));
  $("lbNext").onclick = () => show(cur + 1); $("lbPrev").onclick = () => show(cur - 1);
  $("lbClose").onclick = () => lb.close();
  lb.addEventListener("close", () => { try { history.replaceState(null, "", location.pathname + location.search); } catch {} });
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", (e) => { /* صفحه راست‌به‌چپه: چپ = بعدی، راست = قبلی */
    if (e.key === "ArrowLeft") { e.preventDefault(); show(cur + 1); } else if (e.key === "ArrowRight") { e.preventDefault(); show(cur - 1); }
  });
  let sx = null; /* کشیدن با انگشت روی موبایل */
  const stage = lb.querySelector(".wk-stage");
  stage.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; sx = e.clientX; });
  stage.addEventListener("pointerup", (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
  stage.addEventListener("pointercancel", () => { sx = null; });
  $("lbFav").onclick = () => { const w = list[cur]; favs.has(w.id) ? favs.delete(w.id) : favs.add(w.id); saveFav(); $("lbFav").setAttribute("aria-pressed", favs.has(w.id)); const b = grid.querySelector(`[data-id="${CSS.escape(w.id)}"] .wk-fav`); if (b) b.setAttribute("aria-pressed", favs.has(w.id)); };

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".wk-card"); if (!card) return;
    if (e.target.closest(".wk-fav")) {
      const id = card.dataset.id; favs.has(id) ? favs.delete(id) : favs.add(id); saveFav();
      e.target.closest(".wk-fav").setAttribute("aria-pressed", favs.has(id)); if (onlyFav) render(); return;
    }
    open(card.dataset.id);
  });
  grid.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("wk-card")) { e.preventDefault(); open(e.target.dataset.id); } });
  $("tagbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]"); if (!b) return; tag = b.dataset.tag;
    document.querySelectorAll("[data-tag]").forEach((x) => x.setAttribute("aria-pressed", x === b)); render();
  });
  $("favOnly").onclick = (e) => { onlyFav = !onlyFav; e.currentTarget.setAttribute("aria-pressed", onlyFav); render(); };
  $("q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
  $("surprise").onclick = () => { if (W.length) { tag = "همه"; q = ""; onlyFav = false; render(); open(W[Math.floor(Math.random() * W.length)].id); } };

  render();
  const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id) open(id); };
  fromHash(); addEventListener("hashchange", () => { if (!lb.open) fromHash(); });
})();
