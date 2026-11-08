(() => {
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("loginPanel"), dashboard = $("dashboard");
  const message = (id, text) => { const el = $(id); if (el) el.textContent = text || ""; };
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let user = null;

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "درخواست انجام نشد.");
    return data;
  }

  window.onTelegramAuth = async (telegramUser) => {
    message("loginMessage", "در حال تأیید امن حساب تلگرام…");
    try {
      await api("/api/auth/telegram", { method: "POST", body: JSON.stringify(telegramUser) });
      await loadAccount();
    } catch (error) { message("loginMessage", error.message); }
  };

  async function installTelegramLogin() {
    try {
      const config = await api("/api/account/config");
      if (!config.telegramBotUsername) {
        message("loginMessage", "ورود تلگرام هنوز برای این محیط پیکربندی نشده است.");
        return;
      }
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.dataset.telegramLogin = config.telegramBotUsername;
      script.dataset.size = "large";
      script.dataset.radius = "12";
      script.dataset.onauth = "onTelegramAuth(user)";
      $("telegramLogin").append(script);
      message("loginMessage", "ورود امن با تلگرام");
    } catch (error) { message("loginMessage", error.message); }
  }

  function renderPattern(canvas, design) {
    const rows = design?.data;
    if (!Array.isArray(rows) || !rows.length) return;
    const width = rows[0].length, height = rows.length, cell = Math.max(5, Math.min(12, 220 / width));
    canvas.width = width * cell; canvas.height = height * cell;
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => row.forEach((color, x) => {
      if (!color) return;
      ctx.fillStyle = window.CARA?.palette?.find((p) => p[0] === color)?.[2] || "#8b72a4";
      ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }));
  }

  async function loadDesigns() {
    const designs = await api("/api/account/designs");
    const list = $("designList"); list.replaceChildren();
    if (!designs.length) { list.innerHTML = '<p class="account-empty">هنوز طرحی ذخیره نکردی.</p>'; return; }
    designs.forEach((item) => {
      const card = document.createElement("article"); card.className = "account-design";
      const canvas = document.createElement("canvas"); renderPattern(canvas, item.design);
      const title = document.createElement("h3"); title.textContent = item.title || "طرح بدون عنوان";
      const date = document.createElement("p"); date.className = "account-note"; date.textContent = new Date(item.updatedAt * 1000).toLocaleDateString("fa-IR");
      const remove = document.createElement("button"); remove.className = "btn sm"; remove.type = "button"; remove.textContent = "حذف طرح";
      remove.addEventListener("click", async () => {
        if (!confirm("این طرح از حساب کاربری حذف شود؟")) return;
        try { await api("/api/account/designs/" + encodeURIComponent(item.id), { method: "DELETE" }); await loadDesigns(); }
        catch (error) { message("designMessage", error.message); }
      });
      card.append(canvas, title, date, remove); list.append(card);
    });
  }

  const orderLabels = { pending:"در انتظار پرداخت", paid:"پرداخت‌شده", review:"در حال بررسی", failed:"ناموفق", new:"ثبت‌شده", weaving:"در حال بافت", shipped:"ارسال‌شده" };
  async function loadOrders() {
    const orders = await api("/api/account/orders");
    const list = $("orderList"); list.replaceChildren();
    if (!orders.length) { message("ordersMessage", "هنوز سفارشی با این حساب ثبت نشده."); return; }
    message("ordersMessage", "");
    orders.forEach((order) => {
      const card = document.createElement("article"); card.className = "account-order";
      const info = document.createElement("div");
      info.innerHTML = '<strong>سفارش ' + esc(order.code) + '</strong><small>' + esc(new Date(order.createdAt).toLocaleDateString("fa-IR")) + ' · ' + fa(order.priceToman) + ' تومان</small>';
      const status = document.createElement("span"); status.className = "account-status";
      status.textContent = orderLabels[order.fulfillment] || orderLabels[order.status] || "در حال بررسی";
      card.append(info, status); list.append(card);
    });
  }

  async function loadAccount() {
    try {
      const data = await api("/api/account/me");
      user = data.user;
      loginPanel.hidden = true; dashboard.hidden = false;
      $("welcomeName").textContent = "سلام " + (user.displayName || "دوست cara") + "!";
      $("welcomeHandle").textContent = user.username ? "@" + user.username : "حساب تلگرام تأییدشده";
      await Promise.all([loadDesigns(), loadOrders()]);
    } catch {
      loginPanel.hidden = false; dashboard.hidden = true;
      await installTelegramLogin();
    }
  }

  $("logoutButton").addEventListener("click", async () => {
    try { await api("/api/account/logout", { method: "POST", body: "{}" }); location.reload(); }
    catch (error) { message("ordersMessage", error.message); }
  });

  $("saveCurrent").addEventListener("click", async () => {
    message("designMessage", "");
    try {
      const raw = localStorage.getItem("cara-pattern");
      if (!raw) throw new Error("اول توی استودیو یه طرح بساز یا بازش کن.");
      const pattern = JSON.parse(raw);
      const title = prompt("برای طرحت یه اسم انتخاب کن:", "طرح من") || "";
      await api("/api/account/designs", { method: "POST", body: JSON.stringify({ title, design: pattern }) });
      message("designMessage", "طرحت با موفقیت ذخیره شد.");
      await loadDesigns();
    } catch (error) { message("designMessage", error.message); }
  });

  loadAccount();
})();