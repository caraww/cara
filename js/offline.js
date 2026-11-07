/* Retry the current navigation when the visitor chooses to reconnect. */
(() => {
  const button = document.getElementById("retry");
  if (!button) return;
  button.addEventListener("click", () => location.reload());
})();
