(() => {
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const money = (n) => fa(n) + " تومان";
  const message = (value) => { $("cartMessage").textContent = value || ""; };
  let busy = false, addError = "";
  $("checkoutButton").addEventListener("click", (event) => { if ($("checkoutButton").getAttribute("aria-disabled") === "true") event.preventDefault(); });

  function drawDesign(canvas, design) {
    const rows = design?.data;
    if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])) return;
    const width = rows[0].length, height = rows.length, cell = Math.max(4, Math.min(9, 88 / width));
    canvas.width = Math.ceil(width * cell); canvas.height = Math.ceil(height * cell);
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => row.forEach((color, x) => {
      if (!color) return;
      ctx.fillStyle = window.CARA?.palette?.find((p) => p.code === color)?.hex || "#8b72a4";
      ctx.fillRect(x * cell, y * cell, Math.max(1, cell - 1), Math.max(1, cell - 1));
    }));
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin", cache: "no-store", ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "درخواست انجام نشد (کد " + response.status + ").");
    return data;
  }

  function render(cart) {
    const root = $("cartItems"); root.replaceChildren();
    $("cartSummary").hidden = !cart.items.length;
    $("cartEmpty").hidden = !!cart.items.length;
    if (!cart.items.length) return;
    $("cartCount").textContent = fa(cart.totalItems);
    $("cartTotal").textContent = money(cart.totalToman);
    $("checkoutButton").href = cart.items.every((item) => item.available) ? "/checkout.html?cart=1" : "#";
    $("checkoutButton").setAttribute("aria-disabled", String(!cart.items.every((item) => item.available)));
    $("checkoutButton").style.opacity = cart.items.every((item) => item.available) ? "1" : ".45";

    cart.items.forEach((item) => {
      const card = document.createElement("article"); card.className = "cart-item";
      card.setAttribute("aria-disabled", String(!item.available));
      if (item.image) {
        const image = document.createElement("img"); image.src = item.image.startsWith("/") ? item.image : "/" + item.image;
        image.alt = item.title; image.loading = "lazy"; card.append(image);
      } else if (item.type === "design" && item.design) {
        const art = document.createElement("canvas"); art.className = "cart-art"; art.setAttribute("aria-label", "پیش‌نمایش طرح دستبند");
        drawDesign(art, item.design); card.append(art);
      } else {
        const art = document.createElement("div"); art.className = "cart-art"; art.textContent = "c."; card.append(art);
      }
      const info = document.createElement("div");
      const title = document.createElement("h2"); title.textContent = item.title;
      const detail = document.createElement("p");
      detail.textContent = item.type === "design" ? "طرح اختصاصی تو" : "دستبند از گالری cara";
      const price = document.createElement("strong"); price.className = item.available ? "cart-price" : "cart-price cart-unavailable";
      price.textContent = item.available ? money(item.unitPrice) : "فعلاً قابل سفارش نیست";
      info.append(title, detail, price);
      if (item.available) {
        const line = document.createElement("small"); line.className = "cart-line-total"; line.textContent = "جمع این ردیف: " + money(item.lineTotal); info.append(line);
      }
      card.append(info);
      const actions = document.createElement("div"); actions.className = "cart-item-end";
      const controls = document.createElement("div"); controls.className = "cart-actions";
      const minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "کم کردن تعداد");
      minus.disabled = busy || item.quantity <= 1 || !item.available;
      minus.addEventListener("click", () => changeQuantity(item.id, item.quantity - 1));
      const qty = document.createElement("strong"); qty.textContent = fa(item.quantity);
      const plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "زیاد کردن تعداد");
      plus.disabled = busy || item.quantity >= 20 || !item.available;
      plus.addEventListener("click", () => changeQuantity(item.id, item.quantity + 1));
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "cart-remove"; remove.textContent = "حذف";
      remove.disabled = busy; remove.addEventListener("click", () => removeItem(item.id));
      controls.append(minus, qty, plus, remove); actions.append(controls); card.append(actions); root.append(card);
    });
  }

  async function load() {
    try { const cart = await api("/api/cart"); render(cart); message(cart.items.length ? "" : (addError || "سبد خریدت خالیه.")); }
    catch (error) { message(error.message); }
  }

  async function changeQuantity(id, quantity) {
    if (busy) return; busy = true; message("دارم سبد رو به‌روزرسانی می‌کنم…");
    try { render(await api("/api/cart/items/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ quantity }) })); message(""); }
    catch (error) { message(error.message); }
    finally { busy = false; }
    if (!busy) load();
  }

  async function removeItem(id) {
    if (busy) return; busy = true; message("در حال حذف کالا…");
    try { render(await api("/api/cart/items/" + encodeURIComponent(id), { method: "DELETE" })); message(""); }
    catch (error) { message(error.message); }
    finally { busy = false; }
    if (!busy) load();
  }

  async function addFromLink() {
    const q = new URLSearchParams(location.search), type = q.get("add");
    if (!type) return false;
    history.replaceState(null, "", location.pathname);
    message("دارم به سبد خرید اضافه می‌کنم…");
    try {
      if (type === "work") await api("/api/cart/items", { method: "POST", body: JSON.stringify({ type: "work", workId: q.get("id"), quantity: 1 }) });
      else if (type === "design") {
        let design;
        try { design = JSON.parse(localStorage.getItem("cara-pattern") || "null"); } catch {}
        if (!design) throw new Error("اول توی استودیو یه طرح بساز یا بازش کن.");
        await api("/api/cart/items", { method: "POST", body: JSON.stringify({ type: "design", title: "طرح من", design, quantity: 1 }) });
      } else throw new Error("نوع کالا معتبر نیست.");
      message("به سبد خرید اضافه شد.");
      return true;
    } catch (error) { addError = "به سبد اضافه نشد: " + error.message; message(addError); return false; }
  }

  (async () => { await addFromLink(); await load(); })();
})();