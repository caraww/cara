/* Wrist-size helper. Pure math is exported for tests; the DOM part is browser-only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CARA_SIZE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CARD_CM = 8.56; /* ISO/IEC 7810 ID-1: 85.6 mm */
  const BEAD_MM = 1.6; /* Miyuki Delica 11/0 is about 1.6 mm */

  function recommend(wristCm) {
    const wrist = Number(wristCm);
    if (!Number.isFinite(wrist) || wrist < 10 || wrist > 26) {
      return { ok: false, error: "اندازه‌ی مچ باید بین ۱۰ و ۲۶ سانتی‌متر باشد." };
    }
    const round = (n) => Math.round(n * 10) / 10;
    const snug = round(wrist + 0.6);
    const comfort = round(wrist + 1.2);
    const loose = round(wrist + 2);
    const rows = Math.max(1, Math.round((comfort * 10) / BEAD_MM));
    return {
      ok: true,
      wrist: round(wrist),
      snug,
      comfort,
      loose,
      rows,
      beadMm: BEAD_MM,
      note: `برای دور مچ ${wrist.toLocaleString("fa-IR")} سانتی‌متری، طول ${comfort.toLocaleString("fa-IR")} سانتی‌متر راحت‌تر است.`,
    };
  }

  function pxPerCm(cardPixels) {
    const value = Number(cardPixels);
    return Number.isFinite(value) && value > 0 ? value / CARD_CM : 0;
  }

  function init() {
    if (typeof document === "undefined") return;
    const $ = (id) => document.getElementById(id);
    const card = $("cardBox"), cal = $("calibrate"), wrist = $("wristCm"), out = $("sizeOut");
    const ruler = $("ruler");
    if (!card || !cal || !wrist || !out) return;
    const fa = (n) => Number(n).toLocaleString("fa-IR", { maximumFractionDigits: 1 });
    const KEY = "cara-wrist-size";

    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
    })();
    if (saved.cal) cal.value = saved.cal;
    if (saved.wrist) wrist.value = saved.wrist;

    function drawRuler(scale) {
      if (!ruler || !scale) return;
      const widthCm = 22;
      const d = window.devicePixelRatio || 1;
      ruler.width = Math.round(widthCm * scale * d);
      ruler.height = Math.round(76 * d);
      ruler.style.width = Math.round(widthCm * scale) + "px";
      ruler.style.height = "76px";
      const g = ruler.getContext("2d");
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, widthCm * scale, 76);
      g.fillStyle = "#2a1f36";
      g.fillRect(0, 0, widthCm * scale, 76);
      g.strokeStyle = "rgba(246,233,214,.75)";
      g.fillStyle = "rgba(246,233,214,.9)";
      g.font = "12px Vazirmatn, Tahoma, sans-serif";
      g.textAlign = "center";
      for (let cm = 0; cm <= widthCm; cm++) {
        const x = cm * scale;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, cm % 5 === 0 ? 26 : cm % 1 === 0 ? 16 : 8);
        g.stroke();
        if (cm % 5 === 0 && cm > 0) g.fillText(String(cm), x, 42);
      }
      g.fillStyle = "rgba(246,233,214,.55)";
      g.font = "11px Vazirmatn, Tahoma, sans-serif";
      g.fillText("سانتی‌متر", widthCm * scale - 24, 64);
    }

    function render() {
      const scale = pxPerCm(cal.value);
      card.style.width = cal.value + "px";
      drawRuler(scale);
      const result = recommend(wrist.value);
      if (!result.ok) {
        out.innerHTML = `<p class="err">${result.error}</p>`;
        return;
      }
      out.innerHTML = `
        <p class="size-note">${result.note}</p>
        <div class="size-grid">
          <div><small>چسبان</small><strong>${fa(result.snug)} سانتی‌متر</strong></div>
          <div class="is-main"><small>پیشنهاد ما</small><strong>${fa(result.comfort)} سانتی‌متر</strong></div>
          <div><small>گشاد</small><strong>${fa(result.loose)} سانتی‌متر</strong></div>
        </div>
        <p class="size-rows">با منجوق دلیکای ۱۱/۰ (حدود ${fa(result.beadMm)} میلی‌متر) حدود <b>${fa(result.rows)}</b> ردیف منجوق لازم داری.</p>
        <div class="btns">
          <a class="btn dark" href="/builder.html?w=15&h=${result.rows}">ساخت الگو با همین اندازه</a>
          <button class="btn" type="button" id="copySize">کپی اندازه</button>
        </div>`;
      const copy = $("copySize");
      if (copy) copy.onclick = async () => {
        const text = `دور مچ: ${fa(result.wrist)} سانتی‌متر · طول پیشنهادی دستبند: ${fa(result.comfort)} سانتی‌متر · حدود ${fa(result.rows)} ردیف منجوق`;
        try { await navigator.clipboard.writeText(text); copy.textContent = "کپی شد"; }
        catch { copy.textContent = "کپی نشد"; }
        setTimeout(() => (copy.textContent = "کپی اندازه"), 1600);
      };
      try { localStorage.setItem(KEY, JSON.stringify({ cal: cal.value, wrist: wrist.value })); } catch {}
    }

    cal.addEventListener("input", render);
    wrist.addEventListener("input", render);
    render();
  }

  return Object.freeze({ recommend, pxPerCm, CARD_CM, BEAD_MM, init });
});
