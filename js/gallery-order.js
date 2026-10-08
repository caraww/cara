/* قیمت دستبندها توی گالری + دکمه‌ی «سفارش این دستبند» → checkout.html?work=<id>
   بعد از gallery.js لود می‌شه. قیمت‌ها از /api/works (Worker) می‌آن.
   تغییرها: کاری که قیمت نداره (مثل «آلبوم») دکمه‌ی سفارش نداره؛ Product JSON-LD برای گوگل. */
(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const prices = {};
  let loaded = false;

  function cards() {
    document.querySelectorAll("#wkGrid .wk-card").forEach((c) => {
      const p = prices[c.dataset.id], cap = c.querySelector("figcaption");
      if (!p || !cap || cap.querySelector(".wk-price")) return;
      const s = document.createElement("span");
      s.className = "wk-price";
      s.textContent = fa(p) + " تومان";
      cap.appendChild(s);
    });
  }
  function lightbox() {
    let id = "";
    try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
    const p = prices[id], o = $("lbOrder");
    $("lbPrice").textContent = p ? fa(p) + " تومان" : "";
    o.href = id ? "checkout.html?work=" + encodeURIComponent(id) : "checkout.html";
    /* وقتی قیمت‌ها اومدن و این کار قیمت نداره، دکمه‌ی سفارش مستقیم معنی نداره (سرور هم ردش می‌کنه) */
    o.style.display = loaded && !p ? "none" : "";
  }
  function jsonLd() {
    const W = (window.CARA && CARA.works) || [];
    const items = W.filter((w) => prices[String(w.id).trim()]).map((w) => ({
      "@type": "Product",
      name: w.title,
      description: w.note || w.title,
      image: new URL(w.src, location.href).href,
      url: location.origin + "/gallery.html#" + encodeURIComponent(w.id),
      brand: { "@type": "Brand", name: "cara" },
      offers: { "@type": "Offer", priceCurrency: "IRR", price: String(prices[String(w.id).trim()] * 10), availability: "https://schema.org/MadeToOrder" },
    }));
    if (!items.length || $("ld-works")) return;
    const s = document.createElement("script");
    s.type = "application/ld+json"; s.id = "ld-works";
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": items });
    document.head.appendChild(s);
  }

  const opts = { childList: true, characterData: true, subtree: true };
  new MutationObserver(cards).observe($("wkGrid"), { childList: true });
  new MutationObserver(lightbox).observe($("lbNum"), opts);
  new MutationObserver(lightbox).observe($("lbTitle"), opts);

  fetch("/api/works")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((list) => {
      list.forEach((w) => { prices[String(w.id).trim()] = w.price; });
      loaded = true;
      cards(); lightbox(); jsonLd();
    })
    .catch(() => {}); /* اگه Worker جواب نداد، گالری بدون قیمت کار می‌کنه */
})();
