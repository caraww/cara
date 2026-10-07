/* فیلد کد تخفیف صفحه‌ی سفارش: پر کردن خودکار از بازی، بررسی زنده‌ی کد. قبل از checkout.js لود بشه. */
(() => {
  const input = document.querySelector('input[name="discountCode"]'), note = document.getElementById("dcNote");
  if (!input || !note) return;
  if (new URLSearchParams(location.search).get("result") === "success") { try { localStorage.removeItem("cara-discount"); } catch (e) {} return; }
  try { const s = localStorage.getItem("cara-discount"); if (s && !input.value) input.value = s; } catch (e) {}
  let t;
  async function check() {
    const v = input.value.trim();
    if (!v) { note.textContent = ""; return; }
    try {
      const j = await (await fetch("/api/game/code?c=" + encodeURIComponent(v))).json();
      note.textContent = j.valid ? "✓ کد معتبره؛ ۱۰٪ تخفیف موقع رفتن به درگاه اعمال می‌شه." : "این کد معتبر نیست یا قبلاً استفاده شده.";
      note.style.color = j.valid ? "" : "#c93a2b";
    } catch (e) {}
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(check, 400); });
  check();
})();
