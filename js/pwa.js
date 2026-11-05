(() => {
  // Keep PWA/offline support, but do not inject an install button into the storefront.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("cara offline support could not be registered:", error);
      });
    });
  }
})();