/* Keep offline connection feedback available to assistive technology. */
(() => {
  const button = document.getElementById("retry");
  const status = document.getElementById("connection-status");
  if (navigator.onLine && status) {
    status.textContent = "اتصال اینترنت برقرار است؛ می‌تونی دوباره تلاش کنی.";
  }
  addEventListener("online", () => {
    if (status) status.textContent = "اتصال اینترنت برقرار شد؛ حالا می‌تونی دوباره تلاش کنی.";
  });
  addEventListener("offline", () => {
    if (status) status.textContent = "اتصال اینترنت قطع شد.";
  });
  if (!button) return;
  button.addEventListener("click", () => {
    if (status) status.textContent = "در حال تلاش برای بارگذاری دوباره…";
    button.disabled = true;
    location.reload();
  });
})();
