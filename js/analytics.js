/* Tiny analytics bridge: Microsoft Clarity custom events + GTM dataLayer.
   No cookies, no personal data; callers must pass only anonymous numbers/flags. */
(function () {
  "use strict";
  window.CARA = window.CARA || {};
  if (typeof window.CARA.track === "function") return;
  window.dataLayer = window.dataLayer || [];
  const queue = [];
  /* Optional: set window.CARA_CLARITY_ID before this file to enable Clarity. */
  if (window.CARA_CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", window.CARA_CLARITY_ID);
  }
  function send(event, props) {
    if (!event) return;
    try { if (typeof window.clarity === "function") window.clarity("event", String(event)); } catch {}
    try { if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: "cara_" + event, ...(props || {}) }); } catch {}
  }
  window.CARA.track = function (event, props) {
    send(event, props);
    if (queue.length < 40) queue.push([event, props]);
  };
  /* GA4 ecommerce events. Canonical GA4 names, so one GTM "GA4 Event" tag with
     event name {{Event}} forwards all of them without a tag per event.
     Callers pass anonymous data only: ids, titles, amounts — never a customer
     name, phone or address. */
  const ECOM_EVENTS = {
    add_to_cart: 1,
    begin_checkout: 1,
    purchase: 1,
    remove_from_cart: 1,
    select_item: 1,
    view_item: 1,
    view_item_list: 1,
  };
  window.CARA.ecom = function (name, payload) {
    const data = payload || {};
    try {
      const layer = (window.dataLayer = window.dataLayer || []);
      if (ECOM_EVENTS[name]) layer.push({ event: name, ecommerce: data });
      else if (name === "search") layer.push({ event: "search", search_term: String(data.search_term || "") });
      else return;
    } catch {}
    try { if (typeof window.clarity === "function") window.clarity("event", name); } catch {}
  };
  /* Clarity may load after this file; flush once when it appears. */
  let tries = 0;
  const timer = setInterval(function () {
    if (typeof window.clarity === "function") {
      queue.splice(0).forEach(([event]) => { try { window.clarity("event", String(event)); } catch {} });
      clearInterval(timer);
    } else if (++tries > 20) clearInterval(timer);
  }, 500);
})();
