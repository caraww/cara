(() => {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("cara offline support could not be registered:", error);
      });
    });
  }
  if (isStandalone) return;

  let installPrompt = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cara-install";
  button.textContent = "نصب اپ کارا";
  button.setAttribute("aria-label", "نصب اپلیکیشن کارا");
  Object.assign(button.style, {
    position: "fixed", zIndex: "9999", insetInlineStart: "16px", bottom: "max(16px, env(safe-area-inset-bottom))",
    border: "1px solid rgba(255,255,255,.2)", borderRadius: "999px", padding: "11px 18px",
    background: "#1d1527", color: "#f1dfb8", boxShadow: "0 8px 28px rgba(0,0,0,.22)",
    font: "700 14px/1.5 Tahoma, sans-serif", cursor: "pointer", display: "none"
  });

  const show = () => { if (!document.body.contains(button)) document.body.append(button); button.style.display = "block"; };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    show();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    button.remove();
  });
  if (isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)) show();

  button.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.remove();
      return;
    }
    if (isIOS) {
      alert("برای نصب کارا: دکمهٔ Share (مربع و فلش رو به بالا) در Safari رو بزن، سپس گزینهٔ Add to Home Screen یا «افزودن به صفحهٔ اصلی» رو انتخاب کن.");
    }
  });
})();