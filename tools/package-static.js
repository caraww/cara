#!/usr/bin/env node
/* Builds a clean static bundle for an Iranian shared host (cPanel/DirectAdmin).
   Output: dist/site/ and dist/cara-static.tar.gz. No secrets, tests, or server code. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const out = path.join(dist, "site");

const dirs = ["admin", "api", "blog", "bracelet", "category", "colors", "css", "js", "fonts", "img", "media", "data"];
const files = [
  "manifest.webmanifest",
  "sw.js",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "feed.xml",
  "works.json",
  "CNAME",
  "offline.html",
  "share-target.html",
  "lib/works-pricing.js",
];

const htaccess = `DirectoryIndex index.html
Options -Indexes

<IfModule mod_mime.c>
  AddType image/avif .avif
  AddType font/woff2 .woff2
  AddType application/manifest+json .webmanifest
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType image/avif "access plus 30 days"
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
  ExpiresByType font/woff2 "access plus 365 days"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Keep the payment/account API on the Cloudflare Worker while the storefront
# is served from this Iranian host. Requires mod_proxy and mod_rewrite.
<IfModule mod_proxy.c>
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^api/(.*)$ https://api.caraw.ir/api/$1 [P,L]
  </IfModule>
</IfModule>
`;

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of fs.readdirSync(root)) {
  if (name.endsWith(".html")) fs.copyFileSync(path.join(root, name), path.join(out, name));
}
for (const dir of dirs) {
  const from = path.join(root, dir);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(out, dir), { recursive: true });
}
for (const name of files) {
  const from = path.join(root, name);
  if (!fs.existsSync(from)) continue;
  const to = path.join(out, name);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
fs.writeFileSync(path.join(out, ".htaccess"), htaccess);

execFileSync("tar", ["-czf", path.join(dist, "cara-static.tar.gz"), "-C", out, "."], { stdio: "inherit" });
console.log(`Wrote ${path.relative(root, out)} and ${path.relative(root, path.join(dist, "cara-static.tar.gz"))}`);
