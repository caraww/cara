/* admin-challenge.js — مدیریت چالش (challenge-admin.html). توکن ادمین فقط توی sessionStorage مرورگر می‌مونه. */
(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const palette = () => (window.CARA && window.CARA.palette) || [];
  const hexOf = (c) => (palette().find((p) => p[0] === c) || [])[2] || "#8b72a4";
  const fmt = (s) => new Date(s * 1000).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });
  let token = sessionStorage.getItem("cara-admin") || "", currentId = "", entries = [];

  async function api(path, options = {}) {
    const res = await fetch(path, { cache: "no-store", ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { const e = new Error("401"); e.auth = true; throw e; }
    if (!res.ok) throw new Error(data.error || "درخواست ناموفق بود.");
    return data;
  }
  const post = (body) => api("/api/admin/challenges", { method: "POST", body: JSON.stringify(body) });
  const say = (t, bad) => { if (!$("login").hidden) { $("loginError").textContent = t || ""; $("loginError").hidden = !t; } else { const m = $("msg"); m.textContent = t || ""; m.className = bad ? "err" : "ok"; } };
  function showLogin(err) { $("app").hidden = true; $("login").hidden = false; $("loginError").hidden = !err; $("loginError").textContent = err || ""; }
  const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { if (e.auth) { sessionStorage.removeItem("cara-admin"); token = ""; showLogin("رمز ادمین پذیرفته نشد؛ همان ADMIN_TOKEN پنل اصلی را وارد کن."); } else if (!$("login").hidden) showLogin(e.message || "ارتباط با سرور برقرار نشد."); else say(e.message || "درخواست ناموفق بود.", true); } };

  function draw(canvas, design) {
    const rows = design && design.data; if (!Array.isArray(rows) || !rows.length) return;
    const w = rows[0].length, cell = Math.max(4, Math.min(10, Math.floor(220 / w)));
    canvas.width = w * cell; canvas.height = rows.length * cell; const ctx = canvas.getContext("2d"), r = cell / 2;
    rows.forEach((row, y) => row.forEach((c, x) => { if (!c) return; ctx.fillStyle = hexOf(c); ctx.beginPath(); ctx.arc(x * cell + r, y * cell + r, Math.max(r - .6, 1), 0, 7); ctx.fill(); }));
  }

  function buildChips() {
    const box = $("fColors"); box.replaceChildren();
    palette().forEach((p) => { const l = el("label", "chip"), i = el("i"), cb = el("input"); cb.type = "checkbox"; cb.value = p[0]; i.style.background = p[2]; l.append(cb, i, document.createTextNode(p[1])); box.append(l); });
  }

  const loadList = guard(async () => {
    const data = await api("/api/admin/challenges");
    $("login").hidden = true; $("app").hidden = false;
    const list = $("list"); list.replaceChildren();
    if (!data.length) list.append(el("p", "muted", "هنوز چالشی نساختی."));
    data.forEach((c) => {
      const box = el("div", "box"), row = el("div", "row");
      const info = el("div"); info.append(el("strong", "", c.title), el("div", "muted", c.theme || ""), el("div", "muted", fmt(c.startsAt) + " تا " + fmt(c.endsAt) + " · " + fa(c.entries) + " طرح (" + fa(c.pending) + " در انتظار تأیید)"));
      const acts = el("div", "bar"); acts.append(el("span", "tag " + (c.open ? "approved" : "pending"), { draft: "پیش‌نویس", active: c.open ? "در جریان" : "فعال (خارج از بازه)", closed: "بسته" }[c.status]));
      const open = el("button", "btn sm dark", "مدیریت طرح‌ها"); open.onclick = () => openChallenge(c);
      acts.append(open);
      [["active", "فعال کن"], ["closed", "ببند"], ["draft", "پیش‌نویس"]].filter(([s]) => s !== c.status).forEach(([s, label]) => {
        const b = el("button", "btn sm", label); b.onclick = guard(async () => { await post({ action: "set-status", id: c.id, status: s }); await loadList(); }); acts.append(b);
      });
      row.append(info, acts); box.append(row); list.append(box);
    });
  });

  function openChallenge(c) { currentId = c.id; $("detail").hidden = false; $("detailTitle").textContent = "طرح‌های «" + c.title + "»"; loadEntries(); $("detail").scrollIntoView({ behavior: "smooth" }); }

  const loadEntries = guard(async () => { if (!currentId) return; const d = await api("/api/admin/challenges?id=" + encodeURIComponent(currentId)); entries = d.entries; renderEntries(); });

  function winnerMessage(e, code, percent) {
    return "سلام " + (e.nickname || "") + " 👋\nطرح «" + e.title + "» تو چالش هفتگی cara برنده شد! 🎉\nکد تخفیف " + percent + "٪ برای سفارش دستبند: " + code + "\n(این کد ۷ روز اعتبار داره؛ موقع سفارش توی فیلد کد تخفیف واردش کن.)";
  }

  function renderEntries() {
    const f = $("filter").value, wrap = $("entries"); wrap.replaceChildren();
    const shown = entries.filter((e) => f === "all" || e.status === f);
    if (!shown.length) wrap.append(el("p", "muted", "طرحی نیست."));
    shown.forEach((e) => {
      const card = el("div", "entry"), cv = el("canvas"); draw(cv, e.design);
      const contact = e.contact.username ? "@" + e.contact.username : (e.contact.displayName || "—");
      card.append(cv, el("strong", "", e.title), el("div", "muted", "نام مستعار: " + e.nickname + " · رأی: " + fa(e.votes)),
        el("div", "muted", "تماس: " + contact + (e.contact.telegramId ? " · شناسه‌ی تلگرام " + e.contact.telegramId : "")), el("span", "tag " + e.status, { pending: "در انتظار", approved: "تأییدشده", winner: "برنده", rejected: "ردشده" }[e.status]));
      const acts = el("div", "bar");
      [["approved", "تأیید"], ["rejected", "رد"], ["winner", "برنده"]].filter(([s]) => s !== e.status).forEach(([s, label]) => {
        const b = el("button", "btn sm" + (s === "approved" ? " dark" : ""), label);
        b.onclick = guard(async () => { await post({ action: "review", entryId: e.id, status: s }); await loadEntries(); }); acts.append(b);
      });
      if (e.status === "winner") {
        const b = el("button", "btn sm dark", e.prizeCode ? "نمایش کد جایزه" : "ساخت کد جایزه");
        b.onclick = guard(async () => {
          const r = await post({ action: "prize", entryId: e.id }); e.prizeCode = r.code;
          const old = card.querySelector(".prize-box"); if (old) old.remove();
          const pb = el("div", "prize-box"), msg = winnerMessage(e, r.code, r.percent);
          pb.append(el("div", "prize", r.code), el("pre", "muted", msg), (() => { const c = el("button", "btn sm", "کپی پیام"); c.onclick = () => navigator.clipboard.writeText(msg).then(() => say("پیام کپی شد.")); return c; })());
          card.append(pb);
        });
        acts.append(b);
      }
      card.append(acts); wrap.append(card);
    });
  }

  $("filter").onchange = renderEntries; $("reloadEntries").onclick = loadEntries;
  $("logout").onclick = () => { sessionStorage.removeItem("cara-admin"); token = ""; showLogin(); };
  $("loginForm").onsubmit = async (ev) => { ev.preventDefault(); const button = $("loginForm").querySelector("button[type=submit]"); token = $("token").value.trim(); if (!token) { showLogin("رمز را وارد کن."); return; } button.disabled = true; button.textContent = "در حال بررسی…"; $("loginError").hidden = true; sessionStorage.setItem("cara-admin", token); try { await loadList(); } finally { button.disabled = false; button.textContent = "ورود"; } };
  $("newForm").onsubmit = guard(async (ev) => {
    ev.preventDefault();
    const colors = [...$("fColors").querySelectorAll("input:checked")].map((i) => i.value);
    const r = await post({ action: "create", title: $("fTitle").value, theme: $("fTheme").value, rules: $("fRules").value, allowedColors: colors,
      startsAt: new Date($("fStart").value).toISOString(), endsAt: new Date($("fEnd").value).toISOString(), prizePercent: Number($("fPrize").value), status: $("fStatus").value });
    say("چالش ساخته شد."); $("newForm").reset(); buildChips(); await loadList();
  });
  const boot = () => { buildChips(); if (token) loadList(); else showLogin(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
