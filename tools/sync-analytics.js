/* Keeps the Google Tag Manager loader identical on every public static page.
   Run after touching analytics: node tools/sync-analytics.js (idempotent).

   Deliberately excluded:
   - track.html: the URL carries the private order-tracking token.
   - admin.html / admin-reviews.html / challenge-admin.html / customers.html:
     private operator pages with customer data. */
const fs = require("fs");
const path = require("path");
const { gtmSnippet } = require("../lib/analytics-snippet.js");

const ROOT = path.join(__dirname, "..");
const PAGES = [
  "about.html",
  "blog/bracelet-care.html",
  "blog/color-meanings.html",
  "blog/index.html",
  "blog/miyuki-delica.html",
  "blog/wrist-size.html",
  "account.html",
  "builder.html",
  "cart.html",
  "challenge.html",
  "checkout.html",
  "faq.html",
  "gallery.html",
  "game.html",
  "index.html",
  "name-bracelet.html",
  "offline.html",
  "quiz.html",
  "sale.html",
  "share-target.html",
  "size.html",
  "starter.html",
  "upload.html",
];

/* Drop every script block that bootstraps GTM (loader or the old dataLayer
   stub); a block never spans two tags because the match stops at </script>. */
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script>\s*/gi;
const isGtmScript = (block) => /googletagmanager\.com|gtm\.start/.test(block);

let changed = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, "utf8");
  const cleaned = before.replace(SCRIPT_BLOCK, (block) => (isGtmScript(block) ? "" : block));
  if (!cleaned.includes("</head>")) {
    console.error("missing </head> in " + page);
    process.exitCode = 1;
    continue;
  }
  const after = cleaned.replace("</head>", `${gtmSnippet()}\n</head>`);
  if (after === before) continue;
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("updated " + page);
}
console.log(`${changed} page(s) updated`);
