/* Builder extras: spoken pattern description, printable sheet, and shareable image card.
   Loads after builder.js + pattern-narrate.js + share-card.js. */
(function () {
  "use strict";
  const C = window.CARA;
  const S = C && C.studio;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const fa = (n) => Number(n).toLocaleString("fa-IR");

  const narration = $("patternNarration");
  const printSheet = $("printSheet");
  const printCanvas = $("printCanvas");
  const printMeta = $("printMeta");
  const printList = $("printList");
  let last = null;

  function snapshot() {
    return { w: S.w, h: S.h, data: S.data.map((row) => row.slice()) };
  }

  function updateNarration() {
    if (!narration || !window.CARA_PATTERN_NARRATE) return;
    const described = window.CARA_PATTERN_NARRATE.describe(S.data, C.palette);
    last = described;
    narration.textContent = described.text;
    narration.dataset.total = String(described.total);
  }

  function updatePrint(snap) {
    if (!printSheet || !printCanvas) return;
    const described = last || window.CARA_PATTERN_NARRATE.describe(snap.data, C.palette);
    const cell = Math.max(8, Math.min(22, Math.floor(920 / snap.h)));
    const cw = cell;
    const ch = Math.max(4, Math.round(cell / (C.L.BEAD_ASPECT || 1)));
    printCanvas.width = snap.w * cw + 2;
    printCanvas.height = snap.h * ch + 2;
    const g = printCanvas.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, printCanvas.width, printCanvas.height);
    C.drawPattern(g, snap.data, cw, ch, 1, 1);
    if (printMeta) {
      printMeta.textContent = `${fa(snap.w)} × ${fa(snap.h)} · ${fa(described.total)} منجوق · ${fa(described.colors.length)} رنگ`;
    }
    if (printList) {
      printList.innerHTML = described.colors.map((color) => {
        const item = C.byCode(color.code);
        return `<li><i style="background:${item ? item.hex : "#999"}"></i><b dir="ltr">${color.code}</b> ${color.name} <span>×${fa(color.count)}</span></li>`;
      }).join("");
    }
  }

  function update() {
    updateNarration();
    updatePrint(snapshot());
  }

  document.addEventListener("studio:change", update);
  update();

  let editTimer;
  document.addEventListener("studio:change", () => {
    clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      const total = S.data.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
      if (total) C.track && C.track("design_edit", { beads: total, width: S.w, height: S.h });
    }, 2500);
  });

  const shareBtn = $("shareCard");
  if (shareBtn && C.shareCard) {
    shareBtn.addEventListener("click", async () => {
      if (!last || !last.total) {
        shareBtn.dataset.tip = "اول چندتا منجوق بچین";
        return;
      }
      shareBtn.disabled = true;
      try {
        const result = await C.shareCard.share({
          data: S.data,
          title: "دستبند منجوقی من",
          subtitle: "این طرح رو با استودیوی کارا ساختم",
        });
        shareBtn.dataset.tip = result.method === "download" ? "کارت ذخیره شد" : "کارت آماده شد";
        C.track && C.track("design_share_card", { method: result.method, beads: last.total });
      } finally {
        shareBtn.disabled = false;
        setTimeout(() => (shareBtn.dataset.tip = "کارت اشتراک‌گذاری"), 1800);
      }
    });
  }

  const printBtn = $("printPattern");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      if (!last || !last.total) {
        printBtn.dataset.tip = "اول چندتا منجوق بچین";
        return;
      }
      updatePrint(snapshot());
      C.track && C.track("design_print", { beads: last.total, width: S.w, height: S.h });
      window.print();
    });
  }
})();
