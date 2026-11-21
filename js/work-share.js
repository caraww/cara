/* Native share / copy-link for generated bracelet pages. */
(function () {
  "use strict";
  document.querySelectorAll("[data-share-work]").forEach((button) => {
    button.addEventListener("click", async () => {
      const url = location.href;
      const title = button.dataset.shareTitle || document.title;
      window.CARA && CARA.track && CARA.track("work_share");
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          const label = button.textContent;
          button.textContent = "لینک کپی شد ✓";
          setTimeout(() => { button.textContent = label; }, 1800);
          return;
        }
        window.prompt("این لینک را کپی کن:", url);
      } catch (error) {
        if (error && error.name !== "AbortError") window.prompt("این لینک را کپی کن:", url);
      }
    });
  });
})();
