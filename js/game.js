(function () {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const TOTAL = 50000, PENALTY = 4000;
  let token, endAt, timer, busy = false, code = "";
  let local = false, L = null; /* حالت تمرین (وقتی سرور بازی در دسترس نیست) */

  const api = (path, body) =>
    fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const show = (id) => ["start", "game", "end"].forEach((x) => ($(x).hidden = x !== id));
  const setRemaining = (ms) => { endAt = performance.now() + ms; };
  const note = (t) => { $("gnote").textContent = t || ""; $("gnote").hidden = !t; };

  fetch("/api/game/config").then((r) => r.json()).then((c) => { $("goal").textContent = $("goal2").textContent = fa(c.goal); })
    .catch(() => { $("goal").textContent = $("goal2").textContent = fa(16); });

  function hud(s) {
    if (s) { $("score").textContent = fa(s.score); $("round").textContent = fa(s.round); }
    const left = Math.max(0, endAt - performance.now());
    $("time").textContent = fa(Math.ceil(left / 1000));
    $("fill").style.width = Math.min(100, (left / TOTAL) * 100) + "%";
    return left;
  }

  function render(s) {
    const g = $("grid");
    g.style.gridTemplateColumns = `repeat(${s.size},1fr)`;
    g.style.maxWidth = Math.min(420, s.size * 70) + "px";
    g.innerHTML = "";
    s.cells.forEach((color, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bead";
      b.style.background = color;
      b.setAttribute("aria-label", "منجوق");
      b.onclick = () => pick(i);
      g.appendChild(b);
    });
    hud(s);
  }

  /* راند محلی (فقط حالت تمرین) */
  function localRound() {
    const size = Math.min(9, 2 + Math.floor((L.round + 1) / 2)), delta = Math.max(2.5, 22 - L.round * 1.8), jit = L.round >= 5 ? delta * 0.15 : 0;
    const hue = Math.floor(Math.random() * 360), l = 42 + Math.random() * 22, sign = l > 53 ? -1 : 1;
    L.odd = Math.floor(Math.random() * size * size);
    const cells = Array.from({ length: size * size }, (_, i) => i === L.odd
      ? `hsl(${((hue + sign * delta * 0.4) % 360 + 360) % 360},68%,${(l + sign * delta).toFixed(1)}%)`
      : `hsl(${hue},68%,${(l + (Math.random() - 0.5) * 2 * jit).toFixed(1)}%)`);
    return { size, cells, round: L.round, score: L.score };
  }

  async function pick(idx) {
    if (busy) return;
    if (local) {
      if (performance.now() >= endAt) return end({ score: L.score });
      if (idx === L.odd) { L.score++; L.round++; render(localRound()); }
      else { endAt -= PENALTY; const g = $("grid"); g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); hud(); if (hud() <= 0) end({ score: L.score }); }
      return;
    }
    busy = true;
    try {
      const r = await api("/api/game/answer", { token, idx });
      if (r.error) return alert(r.error);
      if (r.over) return end(r);
      if (r.token) token = r.token;
      if (r.remainingMs != null) setRemaining(r.remainingMs);
      if (r.correct) render(r);
      else if (r.correct === false) {
        const g = $("grid"); g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake");
      }
    } catch (e) {} finally { busy = false; }
  }

  function end(r) {
    clearInterval(timer);
    show("end");
    $("final").textContent = fa(r.score);
    code = r.code || "";
    $("win").hidden = !code;
    $("limited").hidden = !r.limited;
    $("lose").hidden = !!(code || r.limited || local);
    if (local) { $("lose").hidden = false; $("lose").textContent = "این دور در حالت تمرین بود و کد تخفیف نداره؛ اتصال به سرور بازی برقرار نشد."; }
    if (code) {
      $("code").textContent = code;
      try { localStorage.setItem("cara-discount", code); } catch (e) {}
    }
  }

  async function start() {
    const btns = [$("play"), $("again")];
    btns.forEach((b) => { b.disabled = true; });
    const label = $("play").textContent;
    $("play").textContent = "دارم آماده می‌کنم…";
    note("");
    let r = null;
    try { r = await api("/api/game/start"); } catch (e) {}
    local = !(r && r.token && r.cells);
    let first;
    if (local) {
      L = { round: 1, score: 0, odd: 0 };
      setRemaining(TOTAL);
      first = localRound();
      note("اتصال به سرور بازی برقرار نشد؛ این دور فقط تمرینیه و کد تخفیف نداره.");
    } else {
      token = r.token; setRemaining(r.remainingMs); first = r;
    }
    $("play").textContent = label;
    btns.forEach((b) => { b.disabled = false; });
    show("game"); render(first);
    clearInterval(timer);
    timer = setInterval(() => { if (hud() <= 0) { clearInterval(timer); local ? end({ score: L.score }) : pick(-1); } }, 100);
  }

  $("play").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("copy").addEventListener("click", () => {
    const done = () => ($("copy").textContent = "کپی شد ✓");
    try { navigator.clipboard.writeText(code).then(done, done); } catch (e) { done(); }
  });
})();
