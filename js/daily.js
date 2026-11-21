/* Daily odd-bead challenge: 5 deterministic rounds, a local streak, and a share card. */
(function () {
  "use strict";
  const C = window.CARA;
  const D = window.CARA_DAILY_PUZZLE;
  const $ = (id) => document.getElementById(id);
  const box = $("daily");
  if (!C || !D || !box) return;
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const KEY = "cara-daily-streak";
  const ROUNDS = 5;
  const today = D.dateKey();
  let round = 0;
  let correct = 0;
  let playing = false;

  const load = () => {
    try { return { ...D.emptyStreak(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return D.emptyStreak(); }
  };
  const save = (state) => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  let state = load();

  function paintStats() {
    const el = $("dailyStats");
    if (!el) return;
    const played = state.last === today;
    el.innerHTML = `
      <span>🔥 زنجیره: <b>${fa(state.streak)}</b> روز</span>
      <span>🏆 رکورد: <b>${fa(state.best)}</b></span>
      <span>${played ? "امروز انجام شد" : "امروز منتظرتیم"}</span>`;
  }

  function resetView() {
    const grid = $("dailyGrid");
    if (grid) { grid.hidden = true; grid.replaceChildren(); }
    const msg = $("dailyMsg");
    if (msg) msg.textContent = "";
    const share = $("dailyShare");
    if (share) share.hidden = true;
    const play = $("dailyPlay");
    if (play) { play.hidden = false; play.textContent = state.last === today ? "دوباره بازی کن" : "شروع چالش امروز"; }
    paintStats();
  }

  function finish(perfect) {
    playing = false;
    const grid = $("dailyGrid");
    if (grid) grid.hidden = true;
    const msg = $("dailyMsg");
    const share = $("dailyShare");
    if (perfect) {
      state = D.streakUpdate(state, today);
      save(state);
      if (msg) msg.innerHTML = `همه‌ی ۵ راند را درست زدی! 🎉 زنجیره‌ات شد <b>${fa(state.streak)}</b> روز.`;
      if (share) share.hidden = false;
      C.track && C.track("daily_perfect", { streak: state.streak });
    } else {
      if (msg) msg.textContent = `${fa(correct)} از ${fa(ROUNDS)} راند را درست زدی. فردا دوباره امتحان کن!`;
      C.track && C.track("daily_end", { correct });
    }
    const play = $("dailyPlay");
    if (play) { play.hidden = false; play.textContent = "بازی دوباره"; }
    paintStats();
  }

  function nextRound() {
    if (!playing) return;
    if (round >= ROUNDS) { finish(true); return; }
    const puzzle = D.puzzleForDate(today, round, 5);
    const grid = $("dailyGrid");
    if (!grid) return;
    grid.hidden = false;
    grid.replaceChildren();
    grid.style.gridTemplateColumns = `repeat(${puzzle.size}, 1fr)`;
    const msg = $("dailyMsg");
    if (msg) msg.textContent = `راند ${fa(round + 1)} از ${fa(ROUNDS)} — منجوق متفاوت را پیدا کن.`;
    for (let i = 0; i < puzzle.size * puzzle.size; i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "daily-bead";
      button.style.background = i === puzzle.oddIndex ? puzzle.oddCss : puzzle.baseCss;
      button.setAttribute("aria-label", "منجوق");
      button.addEventListener("click", () => {
        if (!playing) return;
        if (i === puzzle.oddIndex) {
          correct++;
          round++;
          button.classList.add("is-ok");
          setTimeout(nextRound, 180);
        } else {
          button.classList.add("is-wrong");
          finish(false);
        }
      });
      grid.appendChild(button);
    }
  }

  function start() {
    playing = true;
    round = 0;
    correct = 0;
    const play = $("dailyPlay");
    if (play) play.hidden = true;
    const share = $("dailyShare");
    if (share) share.hidden = true;
    C.track && C.track("daily_start", { date: today });
    nextRound();
  }

  function shareCard() {
    if (!C.shareCard) return;
    const codes = C.palette.slice(0, 6).map((p) => p.code);
    const data = Array.from({ length: 26 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => codes[(r + c) % codes.length]),
    );
    C.shareCard.share({
      data,
      title: `چالش روزانه کارا — ${fa(correct)} از ${fa(ROUNDS)}`,
      subtitle: `زنجیره: ${fa(state.streak)} روز · ${today}`,
      shareText: "چالش روزانه‌ی کارا رو بازی کن!",
    });
    C.track && C.track("daily_share", { streak: state.streak });
  }

  $("dailyPlay")?.addEventListener("click", start);
  $("dailyShare")?.addEventListener("click", shareCard);
  resetView();
})();
