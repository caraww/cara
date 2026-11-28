/* Single source of the Google Tag Manager loader for every public page.
   The dataLayer bootstrap is inline and cheap; the container script loads 2.5s
   after first paint so a slow third-party request never delays the page. */
const GTM_ID = "GTM-P54M67FG";

function gtmSnippet() {
  return (
    `<script>window.dataLayer=window.dataLayer||[];` +
    `window.dataLayer.push({"gtm.start":new Date().getTime(),event:"gtm.js"});` +
    `setTimeout(function(){var s=document.createElement("script");s.async=true;` +
    `s.src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}";` +
    `document.head.appendChild(s);},2500);</script>`
  );
}

module.exports = gtmSnippet;
module.exports.gtmSnippet = gtmSnippet;
module.exports.GTM_ID = GTM_ID;
