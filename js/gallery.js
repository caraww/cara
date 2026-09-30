(() => {
  const C = CARA, S = C.samples, $ = (id) => document.getElementById(id), fa = C.faNum;
  const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  const FAV = "cara-fav";
  let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem(FAV)) || []); } catch {}
  const saveFav = () => { try { localStorage.setItem(FAV, JSON.stringify([...favs])); } catch {} };
  let tag = "همه", onlyFav = false, q = "";
  const meta = (s) => `${fa(s.data[0].length)} × ${fa(s.data.length)} · ${fa(s.st.total)} منجوق · ${fa(s.st.colors)} رنگ · ${s.level}`;

  $("tagbar").innerHTML = ["همه", ...new Set(S.flatMap((s) => s.tags))].map((t) => `<button class="tool" data-tag="${esc(t)}" aria-pressed="${t === "همه"}">${esc(t)}</button>`).join("");

  function render() {
    const list = S.filter((s) => (tag === "همه" || s.tags.includes(tag)) && (!onlyFav || favs.has(s.id)) && (!q || s.hay.includes(q)));
    $("galGrid").innerHTML = list.map((s) => `<article class="gcard" data-id="${s.id}" tabindex="0" role="button" aria-label="${esc(s.title)}">
      <button class="fav" aria-label="علاقه‌مندی" aria-pressed="${favs.has(s.id)}">♥</button>
      <div class="cover">${s.photo ? `<img src="${esc(s.photo)}" alt="${esc(s.title)}" loading="lazy">` : `<canvas data-ring="${s.id}"></canvas>`}</div>
      <div class="body"><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p><div class="meta">${meta(s)}</div></div></article>`).join("");
    list.forEach((s) => { const cv = document.querySelector(`[data-ring="${s.id}"]`); if (cv) C.drawRing(cv, s.data, 260); });
    $("empty").hidden = list.length > 0;
  }

  $("galGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".gcard"); if (!card) return;
    if (e.target.closest(".fav")) {
      const id = card.dataset.id; favs.has(id) ? favs.delete(id) : favs.add(id); saveFav();
      e.target.closest(".fav").setAttribute("aria-pressed", favs.has(id)); if (onlyFav) render(); return;
    }
    open(card.dataset.id);
  });
  $("galGrid").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList.contains("gcard")) open(e.target.dataset.id); });
  $("tagbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]"); if (!b) return; tag = b.dataset.tag;
    document.querySelectorAll("[data-tag]").forEach((x) => x.setAttribute("aria-pressed", x === b)); render();
  });
  $("favOnly").onclick = (e) => { onlyFav = !onlyFav; e.currentTarget.setAttribute("aria-pressed", onlyFav); render(); };
  $("q").addEventListener("input", (e) => { q = e.target.value.trim(); render(); });
  $("surprise").onclick = () => open(S[Math.floor(Math.random() * S.length)].id);

  const dlg = $("dlg"); let cur = null;
  function open(id) {
    const s = S.find((x) => x.id === id); if (!s) return; cur = s;
    $("dTitle").textContent = s.title; $("dNote").textContent = s.note;
    $("dTags").innerHTML = s.tags.map((t) => `<span>${esc(t)}</span>`).join("");
    $("dStats").textContent = meta(s);
    $("dPhoto").hidden = !s.photo; if (s.photo) { $("dPhoto").src = s.photo; $("dPhoto").alt = s.title; }
    $("dColors").innerHTML = Object.entries(s.st.n).sort((a, b) => b[1] - a[1]).map(([code, n]) => { const p = C.byCode(code); return `<div class="color-row"><i class="dot" style="--c:${p.hex}"></i><small>${p.code} · ${esc(p.name)}</small><b>${fa(n)}</b></div>`; }).join("");
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
    C.drawRing($("dRing"), s.data, 300); C.drawStrip($("dStrip"), s.data, Math.min(400, dlg.querySelector(".vis").clientWidth - 40));
  }
  const use = (to) => { C.savePattern(cur.data[0].length, cur.data.length, cur.data); location.href = to; };
  $("dEdit").onclick = () => use("builder.html"); $("dOrder").onclick = () => use("checkout.html");
  $("dClose").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  render();
})();
