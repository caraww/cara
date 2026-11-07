/* Shared work pricing policy.
   Keep this logic identical for the Worker API and generated static SEO pages.
   Amounts are in toman here; convert to rial only when writing Zibal / Product Offer data. */
(function attachWorkPricing(root) {
  "use strict";

  const PRICE_OVERRIDES = Object.freeze({});
  const RICK_MORTY_PRICE = 4000000;
  const norm = (s) => String(s || "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s\u200c_-]/g, "").toLowerCase();
  const isRickMorty = (w) => /ریک|مورتی|rick|morty/.test(norm([w.title, w.id, w.file, w.src].join("|")));

  function fixedPrice(w) {
    const key = norm((w.title || "") + "|" + (w.id || ""));
    for (const [k, v] of Object.entries(PRICE_OVERRIDES)) if (norm(k) && key.includes(norm(k))) return Math.round(Number(v));
    if (isRickMorty(w)) return RICK_MORTY_PRICE;
    return Math.round(Number(w.price)) || 0;
  }

  /* Deterministic fallback price. This intentionally preserves the existing Worker formula. */
  function autoPrice(id) {
    let h = 2166136261;
    for (const ch of String(id)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
    let p = Math.round((1450000 + (h % 1500000)) / 1000) * 1000;
    if (p % 5000 === 0) p += 3000;
    return p;
  }

  function priceMap(list) {
    const out = {}, used = new Set();
    for (const w of list) {
      if (w.noOrder) continue;
      const f = fixedPrice(w);
      if (f) { out[String(w.id)] = f; used.add(f); }
    }
    for (const w of list) {
      const id = String(w.id);
      if (w.noOrder || out[id]) continue;
      let p = autoPrice(id);
      while (used.has(p)) p += 7000;
      used.add(p);
      out[id] = p;
    }
    return out;
  }

  root.CARA_WORK_PRICING = Object.freeze({ fixedPrice, autoPrice, priceMap });
})(globalThis);
