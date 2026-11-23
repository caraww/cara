/* admin-challenge.js — مدیریت چالش (challenge-admin.html). توکن ادمین فقط توی sessionStorage مرورگر می‌مونه. */
(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const palette = () => (window.CARA && window.CARA.palette) || [];
  const hexOf = (c) => { const p = palette().find((item) => item && (item.code === c || item[0] === c)); return p ? (p.hex || p[2] || "#8b72a4") : "#8b72a4"; };
  const fmt = (s) => new Date(s * 1000).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });
  let token = sessionStorage.getItem("cara-admin") || "", currentId = "", entries = [], editingId = "";

  async function api(path, options = {}) {
    const res = await fetch(path, { cache: "no-store", ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { const e = new Error("401"); e.auth = true; throw e; }
    if (!res.ok) throw new Error([data.error, data.detail].filter(Boolean).join(" — ") || "درخواست ناموفق بود.");
    return data;
  }
  const post = (body) => api("/api/admin/challenges", { method: "POST", body: JSON.stringify(body) });
  const say = (t, bad) => { if (!$("login").hidden) { $("loginError").textContent = t || ""; $("loginError").hidden = !t; } else { const m = $("msg"); m.textContent = t || ""; m.className = bad ? "err" : "ok"; } };
  function showLogin(err) { $("app").hidden = true; $("login").hidden = false; $("loginError").hidden = !err; $("loginError").textContent = err || ""; }
  const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { if (e.auth) { sessionStorage.removeItem("cara-admin"); token = ""; showLogin("رمز ادمین پذیرفته نشد؛ همان ADMIN_TOKEN پنل اصلی را وارد کن."); } else if (!$("login").hidden) showLogin(e.message || "ارتباط با سرور برقرار نشد."); else say(e.message || "درخواست ناموفق بود.", true); } };

  function draw(canvas, design) {
    const rows = design && design.data; if (!Array.isArray(rows) || !rows.length) return;
    const w = rows[0].length, h = rows.length;
    const cell = Math.max(6, Math.min(14, Math.floor(Math.min(320 / Math.max(h, 1), 240 / Math.max(w, 1)))));
    canvas.width = w * cell; canvas.height = h * cell;
    const ctx = canvas.getContext("2d"), bead = cell >= 10 && window.CARA && window.CARA.drawBead;
    rows.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      const hex = hexOf(c);
      if (bead) { bead(ctx, x * cell, y * cell, cell, cell, hex); return; }
      ctx.fillStyle = hex; ctx.fillRect(x * cell, y * cell, cell, cell);
      const n = parseInt(hex.replace("#", ""), 16);
      if ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114 > 228) {
        ctx.strokeStyle = "rgba(74, 58, 90, .45)"; ctx.lineWidth = 1;
        ctx.strokeRect(x * cell + .5, y * cell + .5, cell - 1, cell - 1);
      }
    }));
  }

  // فقط رنگ‌هایی که در موجودی فعلی منجوق‌ها ثبت شده‌اند؛ کد و ظاهر از پالت خود استودیو می‌آید.
  const OWNED_BEAD_CODES = null;

  function buildChips() {
    const box = $("fColors"); box.replaceChildren();
    palette().forEach((p) => {
      const l = el("label", "chip"), swatch = el("i"), cb = el("input");
      cb.type = "checkbox";
      cb.value = p.code;
      swatch.style.background = p.hex;
      l.append(cb, swatch, document.createTextNode(p.name + " · " + p.code));
      box.append(l);
    });
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
      const edit = el("button", "btn sm", "ادیت چالش"); edit.onclick = () => beginEdit(c);
      const remove = el("button", "btn sm danger", "ریموو چالش"); remove.onclick = guard(async () => {
        const warning = "چالش «" + c.title + "» و تمام " + fa(c.entries) + " طرح و رأی وابسته‌اش برای همیشه حذف می‌شود. مطمئنی؟";
        if (!window.confirm(warning)) return;
        await post({ action: "delete", id: c.id });
        if (currentId === c.id) { currentId = ""; $("detail").hidden = true; }
        say("چالش و اطلاعات وابسته‌اش حذف شد."); await loadList();
      });
      acts.append(open, edit, remove);
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
      const thumb = el("div", "thumb"); thumb.append(cv);
      const info = e.contact || {};
      card.append(thumb, el("strong", "", e.title), el("div", "muted", "نام مستعار: " + e.nickname + " · رأی: " + fa(e.votes)));
      const contactLine = el("div", "muted", "تماس: ");
      const handle = el("bdi", "", info.username ? "@" + info.username : (info.displayName || "—")); handle.dir = "ltr";
      contactLine.append(handle); card.append(contactLine);
      if (info.telegramId) {
        const idLine = el("div", "muted", "شناسه‌ی تلگرام: ");
        /* شناسه عدد است؛ جداکننده‌ی هزارگان نمی‌خواهد */
        const tid = el("bdi", "", String(info.telegramId).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])); tid.dir = "ltr";
        idLine.append(tid); card.append(idLine);
      }
      card.append(el("span", "tag " + e.status, { pending: "در انتظار", approved: "تأییدشده", winner: "برنده", rejected: "ردشده" }[e.status]));
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
  function localInputTime(seconds) {
    const d = new Date(Number(seconds) * 1000), pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function beginEdit(c) {
    editingId = c.id;
    $("fTitle").value = c.title || ""; $("fTheme").value = c.theme || ""; $("fRules").value = c.rules || "";
    $("fStart").value = localInputTime(c.startsAt); $("fEnd").value = localInputTime(c.endsAt);
    $("fPrize").value = c.prizePercent || 20; $("fStatus").value = c.status || "draft";
    $("fColors").querySelectorAll("input").forEach((cb) => { cb.checked = (c.allowedColors || []).includes(cb.value); });
    $("formTitle").textContent = "ویرایش چالش";
    $("saveChallenge").textContent = "ذخیره‌ی تغییرات";
    $("cancelEdit").hidden = false;
    $("newForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resetEditor() {
    editingId = ""; $("newForm").reset(); buildChips();
    $("formTitle").textContent = "ساخت چالش جدید";
    $("saveChallenge").textContent = "ساخت چالش";
    $("cancelEdit").hidden = true;
  }
  $("cancelEdit").onclick = resetEditor;
  $("newForm").onsubmit = guard(async (ev) => {
    ev.preventDefault();
    const colors = [...$("fColors").querySelectorAll("input:checked")].map((i) => i.value);
    const body = { action: editingId ? "update" : "create", ...(editingId ? { id: editingId } : {}),
      title: $("fTitle").value, theme: $("fTheme").value, rules: $("fRules").value, allowedColors: colors,
      startsAt: new Date($("fStart").value).toISOString(), endsAt: new Date($("fEnd").value).toISOString(),
      prizePercent: Number($("fPrize").value), status: $("fStatus").value };
    await post(body);
    say(editingId ? "تغییرات چالش ذخیره شد." : "چالش ساخته شد.");
    resetEditor(); await loadList();
  });
  const boot = () => { buildChips(); if (token) loadList(); else showLogin(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
