#!/usr/bin/env node
/* SEO guardrail: run before deploying. Fails on missing/duplicate metadata,
   missing H1, canonical mismatches, sitemap gaps and fabricated review schema. */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://caraw.ir";
const SKIP = new Set(["admin.html", "admin-reviews.html", "challenge-admin.html", "customers.html", "offline.html", "share-target.html"]);
const DIRS = [".", "blog", "bracelet", "colors", "category"];
const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const inSitemap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }));
const problems = [];
const titles = new Map();
const descs = new Map();

const urlFor = (rel) => {
  const clean = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  if (clean === "index.html") return "/";
  if (clean.endsWith("/index.html")) return "/" + clean.slice(0, -"index.html".length);
  return "/" + clean;
};

for (const dir of DIRS) {
  for (const file of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".html"))) {
    if (dir === "." && SKIP.has(file)) continue;
    const rel = dir === "." ? file : dir + "/" + file;
    const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const expected = urlFor(rel);
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || "";
    const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/) || [])[1] || "";
    const ogImage = (html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/) || [])[1] || "";
    const robots = (html.match(/<meta\s+name="robots"\s+content="([^"]*)"/) || [])[1] || "";
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    const noindex = /noindex/i.test(robots);

    if (!title) problems.push(rel + ": missing <title>");
    if (!desc) problems.push(rel + ": missing meta description");
    if (!canonical) problems.push(rel + ": missing canonical");
    if (!ogImage) problems.push(rel + ": missing og:image");
    if (h1 !== 1) problems.push(rel + ": expected one H1, found " + h1);
    if (canonical && decodeURIComponent(canonical) !== SITE + expected) problems.push(rel + ": canonical is " + canonical + ", expected " + SITE + expected);
    if (!noindex && !inSitemap.has(SITE + expected)) problems.push(rel + ": public page missing from sitemap");
    if (title) {
      if (titles.has(title)) problems.push(rel + ": duplicate title with " + titles.get(title));
      else titles.set(title, rel);
    }
    if (desc) {
      if (descs.has(desc)) problems.push(rel + ": duplicate description with " + descs.get(desc));
      else descs.set(desc, rel);
    }
    if (/"aggregateRating"|"@type"\s*:\s*"Review"/.test(html)) {
      problems.push(rel + ": review/rating schema must only be added from real stored reviews");
    }
  }
}

if (problems.length) {
  console.error("SEO audit failed:\n" + problems.map((p) => " - " + p).join("\n"));
  process.exit(1);
}
console.log("SEO audit passed: " + titles.size + " public pages, " + inSitemap.size + " sitemap URLs");
