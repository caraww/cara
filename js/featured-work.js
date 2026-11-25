/* Weekly featured work, chosen deterministically from the real catalog. */
(function () {
  "use strict";
  const root = document.getElementById("featuredWork");
  const works = (window.CARA && window.CARA.works) || [];
  if (!root || !works.length) return;
  const usable = works.filter((w) => typeof w.price === "number" && w.price > 0);
  if (!usable.length) { root.closest("section").hidden = true; return; }
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const w = usable[week % usable.length];
  const slug = String(w.id).trim().replace(/[\s\u200c]+/g, "-").replace(/[\/\\?#%.]+/g, "");
  root.innerHTML = `<a class="featured-card__img" href="/bracelet/${encodeURIComponent(slug)}.html"><picture>${w.thumbAvif ? `<source type="image/avif" srcset="/${w.thumbAvif}">` : ""}<img src="/${w.thumb || w.src}"${w.thumb240 ? ` srcset="/${w.thumb240} 240w, /${w.thumb480} 480w, /${w.thumb} 700w" sizes="(max-width:720px) 100vw, 55vw"` : ""} alt="دستبند منجوقی ${w.title || w.id}" width="${w.w || 560}" height="${w.h || 560}" loading="lazy" decoding="async"></picture></a><div class="featured-card__body"><p class="section-kicker">انتخاب این هفته</p><h3>${w.title || w.id}</h3><p>${w.note || ""}</p><div class="featured-card__row"><b>${(window.CARA_SALE ? CARA_SALE.priceHTML(w.price) : Number(w.price).toLocaleString("fa-IR") + " تومان")}</b><a class="btn dark" href="/bracelet/${encodeURIComponent(slug)}.html">دیدن و سفارش</a></div></div>`;
})();
