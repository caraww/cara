(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let token = sessionStorage.getItem("cara-admin") || "";
  let customers = [];

  async function api() {
    const response = await fetch("/api/admin/customers", {
      cache: "no-store",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("401");
    if (!response.ok) throw new Error(data.error || "دریافت اطلاعات مشتریان ناموفق بود.");
    return data;
  }

  function showLogin(error = "") {
    $("app").hidden = true;
    $("login").hidden = false;
    $("loginError").hidden = !error;
    $("loginError").textContent = error;
  }

  const date = (seconds) => seconds ? new Date(seconds * 1000).toLocaleDateString("fa-IR") : "—";
  function visibleRows() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const filter = $("filter").value;
    return customers.filter((item) => {
      const matches = !query || [item.displayName, item.username, item.phone, item.id].join(" ").toLocaleLowerCase().includes(query);
      const status = filter === "consent" ? item.marketingSmsConsent : filter === "eligible" ? item.marketingEligible : true;
      return matches && status;
    });
  }

  function render() {
    const rows = visibleRows();
    const opted = customers.filter((item) => item.marketingSmsConsent).length;
    const eligible = customers.filter((item) => item.marketingEligible).length;
    $("summary").innerHTML = `<span>کل حساب‌ها: <b>${fa(customers.length)}</b></span><span>رضایت تبلیغاتی: <b>${fa(opted)}</b></span><span>مجاز برای تبلیغات: <b>${fa(eligible)}</b></span><span>نمایش فعلی: <b>${fa(rows.length)}</b></span>`;
    $("rows").innerHTML = rows.map((item) => `<tr>
      <td>${esc(item.displayName || "بدون نام")}${item.username ? `<small dir="ltr">@${esc(item.username)}</small>` : ""}</td>
      <td class="phone">${item.phone ? esc(item.phone) : "—"}</td>
      <td class="id">${esc(item.telegramId || "—")}</td>
      <td class="id">${esc(item.id)}</td>
      <td>${date(item.createdAt)}</td>
      <td><span class="pill ${item.marketingSmsConsent ? "ok" : ""}">${item.marketingSmsConsent ? "موافقت کرده" : "موافقت نکرده"}</span></td>
      <td><span class="pill ${item.phoneVerified ? "ok" : "warn"}">${item.phoneVerified ? "تأییدشده" : "تأییدنشده"}</span></td>
    </tr>`).join("");
    $("empty").hidden = rows.length > 0;
    $("toast").textContent = "";
  }

  async function load() {
    $("reload").disabled = true;
    $("toast").textContent = "در حال دریافت فهرست مشتریان…";
    try {
      customers = await api();
      $("login").hidden = true;
      $("app").hidden = false;
      render();
      $("toast").textContent = customers.length >= 5000 ? "حداکثر ۵۰۰۰ حساب اخیر نمایش داده می‌شود." : "";
    } catch (error) {
      if (error.message === "401") {
        sessionStorage.removeItem("cara-admin");
        token = "";
        showLogin("رمز مدیریت معتبر نیست یا نشست منقضی شده است.");
      } else {
        $("toast").textContent = error.message;
      }
    } finally { $("reload").disabled = false; }
  }

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv(list, filename) {
    if (!list.length) { $("toast").textContent = "موردی برای خروجی وجود ندارد."; return; }
    const header = ["نام", "نام کاربری تلگرام", "شماره موبایل", "شناسه تلگرام", "شناسه حساب", "تاریخ ثبت‌نام", "رضایت پیامک تبلیغاتی", "تأیید شماره"];
    const lines = list.map((item) => [
      item.displayName, item.username || "", item.phone, item.telegramId || "", item.id, date(item.createdAt),
      item.marketingSmsConsent ? "بله" : "خیر", item.phoneVerified ? "بله" : "خیر",
    ].map(csvCell).join(","));
    const blob = new Blob(["\ufeff" + [header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    token = $("token").value.trim();
    if (!token) return;
    sessionStorage.setItem("cara-admin", token);
    load();
  });
  $("search").addEventListener("input", render);
  $("filter").addEventListener("change", render);
  $("reload").addEventListener("click", load);
  $("exportAll").addEventListener("click", () => exportCsv(visibleRows(), "cara-customers.csv"));
  $("exportMarketing").addEventListener("click", () => exportCsv(customers.filter((item) => item.marketingEligible), "cara-sms-consented-verified.csv"));
  $("logout").addEventListener("click", () => {
    sessionStorage.removeItem("cara-admin"); token = ""; customers = []; $("token").value = ""; showLogin();
  });

  if (token) load(); else showLogin();
})();
