/* challenge.js — صفحه‌ی چالش هفتگی (challenge.html). همه‌ی متن‌ها فقط با textContent وارد صفحه می‌شن. */
(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const palette = () => (window.CARA && window.CARA.palette) || [];
  const paletteItem = (code) => palette().find((p) => p && (p.code === code || p[0] === code));
  const colorOf = (code) => { const p = paletteItem(code); return p ? (p.hex || p[2] || "#8b72a4") : "#8b72a4"; };
  const nameOf = (code) => { const p = paletteItem(code); return p ? (p.name || p[1] || code) : code; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  let state = null, timer = null;

  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    let data = {}; try { data = await res.json(); } catch {}
    if (!res.ok) { const e = new Error(data.error || "مشکلی پیش اومد؛ دوباره امتحان کن."); e.status = res.status; e.data = data; throw e; }
    return data;
  }
  function say(text, isError) { const m = $("chlMessage"); m.textContent = text || ""; m.classList.toggle("is-error", !!isError); m.hidden = !text; }

  function drawPattern(canvas, design) {
    const rows = design && design.data; if (!Array.isArray(rows) || !rows.length) return;
    const w = rows[0].length, h = rows.length;
    /* بوم را بزرگ‌تر از اندازه‌ی نمایش می‌کشیم تا در کارت کوچک، منجوق‌ها تیز بمانند */
    const cell = Math.max(6, Math.min(14, Math.floor(Math.min(320 / Math.max(h, 1), 240 / Math.max(w, 1)))));
    canvas.width = w * cell; canvas.height = h * cell;
    const ctx = canvas.getContext("2d");
    /* در اندازه‌ی کوچک، براقی و سایه‌ی منجوق رنگ را خاکستری می‌کند؛ آن‌جا خانه‌ی تخت با خط دور می‌کشیم */
    const bead = cell >= 10 && window.CARA && window.CARA.drawBead;
    rows.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      const hex = colorOf(c);
      if (bead) { bead(ctx, x * cell, y * cell, cell, cell, hex); return; }
      ctx.fillStyle = hex; ctx.fillRect(x * cell, y * cell, cell, cell);
      const n = parseInt(hex.replace("#", ""), 16);
      if ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114 > 228) {
        ctx.strokeStyle = "rgba(74, 58, 90, .45)"; ctx.lineWidth = 1;
        ctx.strokeRect(x * cell + .5, y * cell + .5, cell - 1, cell - 1);
      }
    }));
  }
  /* کادر ثابت با پس‌زمینه‌ی مات، تا طرح‌های بلند و باریک کشیده نشوند */
  const thumbFrame = (canvas) => { const box = el("div", "chl-thumb"); box.append(canvas); return box; };
  const codesOf = (design) => { const s = new Set(); (design && design.data || []).forEach((row) => row.forEach((c) => c && s.add(c))); return [...s]; };
  const studioDesign = () => { try { const d = JSON.parse(localStorage.getItem("cara-pattern") || "null"); return d && Array.isArray(d.data) && d.data.length ? d : null; } catch { return null; } };

  function tick() {
    const c = state && state.challenge, box = $("chlTimer");
    if (!c || !c.open) { box.hidden = true; return; }
    const left = c.endsAt - Math.floor(Date.now() / 1000);
    if (left <= 0) { box.hidden = true; return; }
    const d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600), m = Math.floor(left % 3600 / 60);
    box.textContent = "مهلت: " + (d ? fa(d) + " روز و " : "") + fa(h) + " ساعت" + (d ? "" : " و " + fa(m) + " دقیقه") + " مانده";
    box.hidden = false;
  }

  function renderHeader() {
    const c = state.challenge, up = state.upcoming;
    if (c) { $("chlTitle").textContent = c.title; $("chlTheme").textContent = c.theme || "طرحت رو بساز، رأی بگیر و جایزه ببر."; }
    if (c && c.open) say("");
    else if (c) say("این چالش تموم شده. برنده‌ها پایین هستن؛ چالش بعدی به‌زودی میاد.");
    else if (up) say("چالش بعدی «" + up.title + "» از " + new Date(up.startsAt * 1000).toLocaleDateString("fa-IR", { dateStyle: "long" }) + " شروع می‌شه.");
    else say("الان چالش فعالی نداریم؛ به‌زودی یه چالش تازه میاد. تا اون موقع توی استودیو طراحی کن.");
    tick(); clearInterval(timer); timer = setInterval(tick, 30000);
  }

  function renderInfo() {
    const c = state.challenge, show = !!(c && c.open);
    $("chlInfo").hidden = !show; if (!show) return;
    $("chlRules").textContent = c.rules || "هر نفر یک طرح می‌تونه ثبت کنه و هر کس به هر طرح فقط یک رأی می‌ده.";
    const colors = $("chlColors"); colors.replaceChildren();
    c.allowedColors.forEach((code) => { const i = el("i"); i.style.background = colorOf(code); i.title = nameOf(code) + " (" + code + ")"; colors.append(i); });
    $("chlColorsBox").hidden = !c.allowedColors.length;
    $("chlPrize").textContent = "جایزه‌ی برنده: " + fa(c.prizePercent) + "٪ کد تخفیف برای سفارش دستبند (۷ روز اعتبار)";
  }

  function renderJoin() {
    const c = state.challenge, box = $("chlJoin"), body = $("chlJoinBody");
    box.hidden = !(c && c.open); if (box.hidden) return; body.replaceChildren();
    if (!state.loggedIn) {
      body.append(el("p", "", "برای شرکت یا رأی‌دادن اول با تلگرام وارد شو؛ ثبت‌نام جدا لازم نیست."), Object.assign(el("a", "chl-btn chl-btn--primary", "ورود با تلگرام"), { href: "/account.html" }));
      return;
    }
    const mine = state.entries.find((e) => e.mine);
    if (mine) {
      const label = { pending: "در انتظار تأیید ما", approved: "تأیید شد و توی لیست هست", rejected: "تأیید نشد", winner: "برنده شدی! 🎉" }[mine.status] || "";
      body.append(el("p", "", "طرح «" + mine.title + "» ثبت شده. وضعیت: " + label));
      if (mine.status !== "winner") {
        const row = el("div", "chl-actions"), del = el("button", "chl-btn", "حذف طرحم"); del.type = "button";
        del.onclick = async () => { if (!confirm("طرحت از چالش حذف بشه؟")) return; try { await api("/api/challenge/entries/" + mine.id, { method: "DELETE" }); await load(); } catch (e) { say(e.message, true); } };
        row.append(del); body.append(row);
      }
      body.append(el("p", "chl-by", "می‌خوای عوضش کنی؟ طرح جدیدت رو از استودیو بیار و دوباره ثبت کن؛ جایگزین قبلی می‌شه و رأی‌ها صفر می‌شن."));
    }
    const design = studioDesign();
    if (!design) {
      body.append(el("p", "", "هنوز توی استودیو طرحی نساختی. اول طرحت رو بساز، بعد برگرد همین‌جا ثبتش کن."), Object.assign(el("a", "chl-btn chl-btn--primary", "رفتن به استودیو"), { href: "/builder.html" }));
      return;
    }
    const bad = c.allowedColors.length ? codesOf(design).filter((x) => !c.allowedColors.includes(x)) : [];
    const canvas = el("canvas", "chl-preview"); drawPattern(canvas, design);
    body.append(el("p", "", "آخرین طرح استودیوی تو:"), canvas);
    if (bad.length) {
      body.append(el("p", "chl-msg is-error", "این طرح رنگ‌های غیرمجاز داره: " + bad.map(nameOf).join("، ") + ". توی استودیو عوضشون کن و دوباره بیا."), Object.assign(el("a", "chl-btn", "برگشت به استودیو"), { href: "/builder.html" }));
      return;
    }
    const form = el("form", "chl-form"), t = el("input"), n = el("input"), btn = el("button", "chl-btn chl-btn--primary", mine ? "ثبت دوباره (جایگزین قبلی)" : "ثبت طرح توی چالش");
    t.maxLength = 60; t.required = true; n.maxLength = 30; n.required = true; btn.type = "submit";
    try { n.value = localStorage.getItem("cara-chl-nick") || ""; } catch {}
    const l1 = el("label", "", "اسم طرح"), l2 = el("label", "", "نام مستعار (فقط همین به بقیه نشون داده می‌شه)");
    l1.append(t); l2.append(n); form.append(l1, l2, btn);
    form.onsubmit = async (ev) => {
      ev.preventDefault(); btn.disabled = true;
      try {
        await api("/api/challenge/entries", { method: "POST", body: JSON.stringify({ title: t.value, nickname: n.value, design }) });
        try { localStorage.setItem("cara-chl-nick", n.value); } catch {}
        await load(); say("طرحت ثبت شد و بعد از تأیید توی لیست میاد. 🎉");
      } catch (e) { say(e.status === 401 ? "نشستت تموم شده؛ دوباره با تلگرام وارد شو." : e.message, true); btn.disabled = false; }
    };
    body.append(form);
  }

  function entryCard(e, open) {
    const card = el("article", "chl-card"); card.id = "e-" + e.id;
    const canvas = el("canvas"); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "طرح " + e.title); drawPattern(canvas, e.design);
    card.append(thumbFrame(canvas));
    if (e.winner) card.append(el("span", "chl-badge", "برنده 🏆"));
    else if (e.mine) card.append(el("span", "chl-badge is-mine", { pending: "طرح تو · در انتظار تأیید", approved: "طرح تو", rejected: "طرح تو · تأیید نشد" }[e.status] || "طرح تو"));
    card.append(el("h3", "", e.title), el("p", "chl-by", "از " + e.nickname));
    const row = el("div", "chl-row");
    const vote = el("button", "chl-btn chl-vote", "♥ " + fa(e.votes)); vote.type = "button"; vote.setAttribute("aria-pressed", String(!!e.voted));
    vote.setAttribute("aria-label", "رأی به " + e.title + "، الان " + fa(e.votes) + " رأی");
    vote.disabled = !open || e.mine || e.status === "pending" || e.status === "rejected";
    vote.onclick = async () => {
      if (!state.loggedIn) { say("برای رأی‌دادن اول با تلگرام وارد شو.", true); return; }
      vote.disabled = true;
      try { const r = await api("/api/challenge/entries/" + e.id + "/vote", { method: "POST" }); e.voted = r.voted; e.votes = r.votes; vote.textContent = "♥ " + fa(r.votes); vote.setAttribute("aria-pressed", String(r.voted)); }
      catch (err) { say(err.message, true); } finally { vote.disabled = false; }
    };
    const share = el("button", "chl-btn", "اشتراک"); share.type = "button";
    share.onclick = async () => {
      const url = location.origin + "/challenge.html#e-" + e.id;
      try { if (navigator.share) await navigator.share({ title: e.title + " | چالش cara", url }); else { await navigator.clipboard.writeText(url); say("لینک طرح کپی شد."); } } catch {}
    };
    const remix = el("button", "chl-btn", "ویرایش این طرح"); remix.type = "button";
    remix.onclick = () => {
      const api = window.CARA_PATTERN_SHARE;
      if (!api || !e.design) { say("این طرح قابل ویرایش نیست.", true); return; }
      try { location.href = "/builder.html" + api.makeHash(e.design.data, palette()); }
      catch { say("این طرح قابل ویرایش نیست.", true); }
    };
    if (e.status === "approved" || e.winner) row.append(vote, share, remix); else row.append(vote);
    card.append(row); return card;
  }

  function renderEntries() {
    const c = state.challenge, grid = $("chlGrid"); grid.replaceChildren();
    $("chlEntriesBox").hidden = !c;
    if (!c) return;
    $("chlEntriesNote").textContent = state.entries.length ? "هر نفر به هر طرح یک رأی می‌ده و به طرح خودش نمی‌تونه." : "هنوز طرحی تأیید نشده؛ اولین نفر باش!";
    state.entries.forEach((e) => grid.append(entryCard(e, c.open)));
    const win = $("chlWinGrid"); win.replaceChildren();
    state.winners.forEach((w) => { const card = el("article", "chl-card"); const cv = el("canvas"); drawPattern(cv, w.design); card.append(thumbFrame(cv), el("span", "chl-badge", "برنده 🏆"), el("h3", "", w.title), el("p", "chl-by", "از " + w.nickname + (w.challengeTitle ? " · " + w.challengeTitle : ""))); win.append(card); });
    $("chlWinBox").hidden = !state.winners.length;
    const target = location.hash.startsWith("#e-") ? document.getElementById(location.hash.slice(1)) : null;
    if (target) { target.classList.add("is-target"); target.scrollIntoView({ block: "center" }); }
  }

  async function load() {
    try { state = await api("/api/challenge"); }
    catch (e) { say("الان نمی‌تونم چالش رو بیارم؛ کمی بعد دوباره سر بزن.", true); return; }
    renderHeader(); renderInfo(); renderJoin(); renderEntries();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
