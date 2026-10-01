/* قیمت دستبندها توی گالری + دکمه‌ی «سفارش این دستبند» → checkout.html?work=<id>
   بعد از gallery.js لود می‌شه. قیمت‌ها از /api/works (Worker) می‌آن. */
(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const prices = {};

  function cards() {
    document.querySelectorAll("#wkGrid .wk-card").forEach((c) => {
      const p = prices[c.dataset.id], cap = c.querySelector("figcaption");
      if (!p || !cap || cap.querySelector(".wk-price")) return;
      const s = document.createElement("span");
      s.className = "wk-price";
      s.style.cssText = "display:block;font-weight:700;margin-top:4px";
      s.textContent = fa(p) + " تومان";
      cap.appendChild(s);
    });
  }
  function lightbox() {
    let id = "";
    try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
    const p = prices[id];
    $("lbPrice").textContent = p ? fa(p) + " تومان" : "";
    $("lbOrder").href = id ? "checkout.html?work=" + encodeURIComponent(id) : "checkout.html";
  }

  const opts = { childList: true, characterData: true, subtree: true };
  new MutationObserver(cards).observe($("wkGrid"), { childList: true });
  new MutationObserver(lightbox).observe($("lbNum"), opts);
  new MutationObserver(lightbox).observe($("lbTitle"), opts);

  fetch("/api/works")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((list) => {
      list.forEach((w) => { prices[String(w.id)] = w.price; });
      cards(); lightbox();
    })
    .catch(() => {}); /* اگه Worker جواب نداد، گالری بدون قیمت کار می‌کنه */
})();
