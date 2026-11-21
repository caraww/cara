/* حراج بلک فرایدی: کلاس is-sale روی <html> تا نوار حراج و قیمت حراج دیده بشن.
   قیمت‌ها از lib/works-pricing.js می‌آیند؛ هم Worker و هم مرورگر از یک قاعده استفاده می‌کنند
   تا مبلغی که مشتری می‌بینه با مبلغ درگاه یکی باشه. بعد از پایان بازه، کلاس گذاشته نمی‌شه. */
(function () {
  "use strict";
  var P = globalThis.CARA_WORK_PRICING;
  if (!P || !P.sale) return;
  var sale = P.sale;
  var faNum = function (n) {
    try { return Number(n).toLocaleString("fa-IR"); }
    catch (e) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  };
  var onSale = sale.active();

  function priceHTML(original, opts) {
    var o = Math.round(Number(original) || 0);
    if (!o) return "";
    var unit = opts && opts.unit === false ? "" : " تومان";
    var now = sale.final(o);
    if (!onSale || now >= o) return '<span class="price">' + faNum(o) + unit + "</span>";
    /* در حراج فقط قیمت روز نشان داده می‌شود؛ مبلغ قبلی در data-price-list می‌ماند. */
    return '<span class="price" data-price="' + now + '" data-price-list="' + o + '">' +
      faNum(now) + unit + "</span>";
  }

  globalThis.CARA_SALE = Object.freeze({
    active: function () { return onSale; },
    percent: sale.percent,
    final: function (n) { return sale.final(n); },
    priceHTML: priceHTML,
    baseMap: function (list) { return P.baseMap(list); },
  });

  if (!onSale) return;
  document.documentElement.classList.add("is-sale");

  var days = Math.max(1, Math.ceil((sale.end - Date.now()) / 86400000));
  var boot = function () {
    var nodes = document.querySelectorAll("[data-sale-days]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = faNum(days);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
