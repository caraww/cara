#!/usr/bin/env node
/* Add the day/night layer to every page: an inline bootstrap that sets
   data-theme before paint, the theme stylesheet (last, so it wins), and the
   deferred toggle script. Idempotent: run it as often as you like.
   Run from the repo root: node tools/sync-theme.js [--dry] */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dry = process.argv.includes("--dry");
const V = "1";

const BOOT =
  '<script>try{var t=localStorage.getItem("cara-theme")||"auto",d=t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.setAttribute("data-theme",d?"dark":"light");e.setAttribute("data-theme-mode",t)}catch(n){}</script>';
const LINK = `<link rel="stylesheet" href="/css/theme.css?v=${V}">`;
const SCRIPT = `<script src="/js/theme.js?v=${V}" defer></script>`;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  if (!html.includes('data-theme-mode') && html.includes("<head>")) {
    html = html.replace("<head>", "<head>\n" + BOOT);
  }
  if (!html.includes("/css/theme.css")) {
    html = html.replace("</head>", LINK + SCRIPT + "\n</head>");
  }
  if (html !== before) {
    changed++;
    if (!dry) fs.writeFileSync(file, html);
  }
}
console.log(`${changed} page(s) ${dry ? "would be" : ""} updated`);
