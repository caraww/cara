#!/usr/bin/env node
/* Insert the shared compact footer and About link into public static pages.
   Run from the repo root: node tools/sync-footer.js [--dry]
   Generated bracelet/ and colors/ pages get the footer from build-pages, so they are skipped. */
const fs = require("fs");
const path = require("path");
const { footerHTML, footerCSS } = require("../lib/site-footer.js");
const root = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");
const SKIP = new Set([
  "index.html", "admin.html", "admin-reviews.html", "challenge-admin.html",
  "customers.html", "offline.html", "share-target.html",
]);
const DIRS = ["", "blog"];
let changed = 0;

function withAboutLink(html) {
  if (html.includes('href="/about.html"')) return html;
  return html.replace(
    /(<a class="sh__cta" href="\/checkout\.html"[^>]*>)/,
    '<a href="/about.html">درباره کارا</a>$1',
  );
}

for (const dirName of DIRS) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".html"))) {
    if (dirName === "" && SKIP.has(file)) continue;
    const full = path.join(dir, file);
    let html = fs.readFileSync(full, "utf8");
    const before = html;
    if (html.includes("SITE-FOOTER:START")) {
      html = html.replace(/<!-- SITE-FOOTER:START -->[\s\S]*?<!-- SITE-FOOTER:END -->/, footerHTML());
    } else {
      html = html.replace(/<\/body>/i, `${footerHTML()}\n</body>`);
    }
    if (!html.includes("/css/site-footer.css")) {
      html = html.replace(/<\/head>/i, `  ${footerCSS}\n</head>`);
    }
    html = withAboutLink(html);
    if (html !== before) {
      changed++;
      if (!dry) fs.writeFileSync(full, html);
    }
  }
}
console.log((dry ? "[dry] " : "") + changed + " public page(s) updated");
