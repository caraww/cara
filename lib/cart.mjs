import { getAccountUser, sha256 } from "./accounts.mjs";

const GUEST_COOKIE = "__Host-cara_guest";
const GUEST_TTL = 365 * 24 * 60 * 60;
const MAX_ITEMS = 30;
const MAX_QUANTITY = 20;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
});
const randomId = () => crypto.randomUUID();
const randomGuest = () => [...crypto.getRandomValues(new Uint8Array(32))].map((v) => v.toString(16).padStart(2, "0")).join("");
const readCookie = (request, name) => {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
};
const guestCookie = (value, maxAge = GUEST_TTL) =>
  `${GUEST_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const sameOrigin = (request, env) => {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    const host = new URL(env.BASE_URL || "https://caraw.ir").hostname.replace(/^www\./, "");
    const received = new URL(origin);
    return received.protocol === "https:" && [host, "www." + host].includes(received.hostname);
  } catch { return false; }
};
const cleanTitle = (value) => String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60);

async function ensureCart(db, owner) {
  const column = owner.userId ? "user_id" : "guest_id";
  const value = owner.userId || owner.guestId;
  let row = await db.prepare(`SELECT id FROM carts WHERE ${column} = ? LIMIT 1`).bind(value).first();
  if (!row) {
    const id = randomId(), now = Math.floor(Date.now() / 1000);
    try {
      await db.prepare(
        `INSERT INTO carts (id, ${column}, currency, created_at, updated_at) VALUES (?, ?, 'IRR', ?, ?)`
      ).bind(id, value, now, now).run();
      row = { id };
    } catch {
      row = await db.prepare(`SELECT id FROM carts WHERE ${column} = ? LIMIT 1`).bind(value).first();
      if (!row) throw new Error("cart could not be created");
    }
  }
  return row.id;
}

async function resolveOwner(request, env, allowCreateGuest = true) {
  const user = await getAccountUser(request, env);
  if (user) return { user, owner: { userId: user.id }, cookie: null };
  let guestId = readCookie(request, GUEST_COOKIE);
  let cookie = null;
  if (!/^[a-f0-9]{64}$/.test(guestId)) {
    if (!allowCreateGuest) return { user: null, owner: null, cookie: null };
    guestId = randomGuest();
    cookie = guestCookie(guestId);
  }
  return { user: null, owner: { guestId }, cookie };
}

async function cartItems(db, cartId, options) {
  const result = await db.prepare(
    "SELECT id, item_key, item_type, quantity, snapshot_json, created_at, updated_at FROM cart_items WHERE cart_id = ? ORDER BY created_at ASC LIMIT ?"
  ).bind(cartId, MAX_ITEMS).all();
  const items = [];
  for (const row of result.results || []) {
    let snapshot;
    try { snapshot = JSON.parse(row.snapshot_json); } catch { continue; }
    let title = snapshot.title || "طرح من", unitPrice = null, image = null, available = true;
    if (row.item_type === "work") {
      const work = await options.getWork(snapshot.workId);
      if (!work || work.noOrder || !Number.isFinite(Number(work.price)) || Number(work.price) <= 0) {
        available = false;
      } else {
        title = String(work.title || snapshot.title || "دستبند گالری");
        unitPrice = Number(work.price);
        image = work.src || null;
      }
    } else {
      const pattern = options.cleanPattern(snapshot.design);
      if (!pattern || !options.pricePerBead) available = false;
      else {
        unitPrice = Math.round(options.baseFee + pattern.total * options.pricePerBead);
        title = snapshot.title || "طرح سفارشی";
      }
    }
    items.push({
      id: row.id, key: row.item_key, type: row.item_type, title, image,
      quantity: row.quantity, unitPrice, lineTotal: available ? unitPrice * row.quantity : null,
      available, design: row.item_type === "design" ? snapshot.design : null,
      workId: row.item_type === "work" ? snapshot.workId : null,
    });
  }
  const total = items.reduce((sum, item) => sum + (item.available ? item.lineTotal : 0), 0);
  return { items, totalItems: items.reduce((sum, item) => sum + item.quantity, 0), totalToman: total };
}

async function readCart(request, env, options, setCookie = true) {
  const resolved = await resolveOwner(request, env, setCookie);
  if (!resolved.owner) return { cart: { items: [], totalItems: 0, totalToman: 0 }, cookie: null, user: null };
  const cartId = await ensureCart(env.ACCOUNTS_DB, resolved.owner);
  return { cart: await cartItems(env.ACCOUNTS_DB, cartId, options), cookie: resolved.cookie, user: resolved.user, cartId };
}

export async function loadCartForRequest(request, env, options) {
  const result = await readCart(request, env, options, false);
  return { ...result.cart, user: result.user, cartId: result.cartId || null };
}

export async function handleCartRequest(request, env, url, options) {
  if (!url.pathname.startsWith("/api/cart")) return null;
  if (!env.ACCOUNTS_DB) return json({ error: "سبد خرید فعلاً در دسترس نیست." }, 503);
  const path = url.pathname;
  const method = request.method;
  if (method === "GET" && path === "/api/cart") {
    const result = await readCart(request, env, options, true);
    return json(result.cart, 200, result.cookie ? { "Set-Cookie": result.cookie } : {});
  }
  if (!sameOrigin(request, env)) return json({ error: "درخواست معتبر نیست." }, 403);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (options.rateLimit && !(await options.rateLimit(env, "cart:" + ip, 60, 10 * 60 * 1000)))
    return json({ error: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کن." }, 429);

  if (method === "POST" && path === "/api/cart/items") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات کالا معتبر نیست." }, 400); }
    const quantity = Number(body?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
      return json({ error: "تعداد باید بین ۱ تا ۲۰ باشد." }, 400);
    const resolved = await resolveOwner(request, env, true);
    const cartId = await ensureCart(env.ACCOUNTS_DB, resolved.owner);
    const existing = await env.ACCOUNTS_DB.prepare("SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?").bind(cartId).first();
    let type, key, snapshot;
    if (body.type === "work") {
      const workId = String(body.workId || "").slice(0, 120);
      const work = workId ? await options.getWork(workId) : null;
      if (!work || work.noOrder || !Number.isFinite(Number(work.price)) || Number(work.price) <= 0)
        return json({ error: "این دستبند قابل سفارش نیست." }, 400);
      type = "work"; key = "work:" + workId;
      snapshot = { workId, title: cleanTitle(work.title) };
    } else if (body.type === "design") {
      const design = options.cleanPattern(body.design);
      if (!design || new TextEncoder().encode(JSON.stringify(design)).length > 32000)
        return json({ error: "الگوی دستبند معتبر نیست یا حجمش بیش از حد مجاز است." }, 400);
      type = "design";
      key = "design:" + await sha256(JSON.stringify(design));
      snapshot = { title: cleanTitle(body.title) || "طرح سفارشی", design };
    } else return json({ error: "نوع کالا معتبر نیست." }, 400);

    const now = Math.floor(Date.now() / 1000), id = randomId();
    if (Number(existing?.count || 0) >= MAX_ITEMS) {
      const duplicate = await env.ACCOUNTS_DB.prepare("SELECT id FROM cart_items WHERE cart_id = ? AND item_key = ?").bind(cartId, key).first();
      if (!duplicate) return json({ error: "سبد خرید حداکثر ۳۰ ردیف کالا می‌تواند داشته باشد." }, 400);
    }
    await env.ACCOUNTS_DB.prepare(
      `INSERT INTO cart_items (id, cart_id, item_key, item_type, quantity, snapshot_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cart_id, item_key) DO UPDATE SET quantity = MIN(cart_items.quantity + excluded.quantity, 20),
         snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`
    ).bind(id, cartId, key, type, quantity, JSON.stringify(snapshot), now, now).run();
    const cart = await cartItems(env.ACCOUNTS_DB, cartId, options);
    return json(cart, 200, resolved.cookie ? { "Set-Cookie": resolved.cookie } : {});
  }

  if (method === "POST" && path === "/api/cart/merge") {
    const user = await getAccountUser(request, env);
    if (!user) return json({ error: "برای انتقال سبد خرید، اول وارد حساب شو." }, 401);
    const guestId = readCookie(request, GUEST_COOKIE);
    if (!/^[a-f0-9]{64}$/.test(guestId)) return json({ ok: true, merged: 0, items: [] }, 200, { "Set-Cookie": guestCookie("", 0) });
    const guestCart = await env.ACCOUNTS_DB.prepare("SELECT id FROM carts WHERE guest_id = ?").bind(guestId).first();
    if (!guestCart) return json({ ok: true, merged: 0 }, 200, { "Set-Cookie": guestCookie("", 0) });
    const accountCartId = await ensureCart(env.ACCOUNTS_DB, { userId: user.id });
    const rows = await env.ACCOUNTS_DB.prepare(
      "SELECT item_key, item_type, quantity, snapshot_json, created_at, updated_at FROM cart_items WHERE cart_id = ? LIMIT ?"
    ).bind(guestCart.id, MAX_ITEMS).all();
    const statements = (rows.results || []).map((row) => env.ACCOUNTS_DB.prepare(
      `INSERT INTO cart_items (id, cart_id, item_key, item_type, quantity, snapshot_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cart_id, item_key) DO UPDATE SET quantity = MIN(cart_items.quantity + excluded.quantity, 20),
         updated_at = excluded.updated_at`
    ).bind(randomId(), accountCartId, row.item_key, row.item_type, row.quantity, row.snapshot_json, row.created_at, Math.floor(Date.now() / 1000)));
    statements.push(env.ACCOUNTS_DB.prepare("DELETE FROM carts WHERE id = ? AND guest_id = ?").bind(guestCart.id, guestId));
    await env.ACCOUNTS_DB.batch(statements);
    const cart = await cartItems(env.ACCOUNTS_DB, accountCartId, options);
    return json({ ok: true, merged: (rows.results || []).length, ...cart }, 200, { "Set-Cookie": guestCookie("", 0) });
  }

  const match = path.match(/^\/api\/cart\/items\/([0-9a-f-]{36})$/i);
  if (match && (method === "PATCH" || method === "DELETE")) {
    const resolved = await resolveOwner(request, env, false);
    if (!resolved.owner) return json({ error: "سبد خرید پیدا نشد." }, 404);
    const cartId = await ensureCart(env.ACCOUNTS_DB, resolved.owner);
    const id = match[1];
    if (method === "DELETE") {
      await env.ACCOUNTS_DB.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").bind(id, cartId).run();
    } else {
      let body;
      try { body = await request.json(); } catch { return json({ error: "تعداد معتبر نیست." }, 400); }
      const quantity = Number(body?.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
        return json({ error: "تعداد باید بین ۱ تا ۲۰ باشد." }, 400);
      await env.ACCOUNTS_DB.prepare("UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ? AND cart_id = ?")
        .bind(quantity, Math.floor(Date.now() / 1000), id, cartId).run();
    }
    return json(await cartItems(env.ACCOUNTS_DB, cartId, options));
  }
  return json({ error: "not found" }, 404);
}
