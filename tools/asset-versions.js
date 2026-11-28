#!/usr/bin/env node
/*
 * نگهبان توکن‌های کش (?v=) روی فایل‌های CSS و JS.
 *
 * چرا: نوآوری صفحه‌ها HTML را شبکه-اول می‌گیرد و دارایی‌های ?v= را برای همیشه
 * از کش سرویس‌ورکر برمی‌دارد. پس اگر فایلی عوض شود و توکنش عوض نشود، کاربر
 * بازدیدکننده (خصوصاً روی سافاری/iOS) تا ابد نسخه‌ی قدیمی را می‌بیند.
 *
 * استفاده:
 *   node tools/asset-versions.js check            # برای CI و npm test
 *   node tools/asset-versions.js check --no-git   # بدون تاریخ گیت (تست سریع)
 *   node tools/asset-versions.js bump <token> <asset> [asset...]
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const REF = /(?:href|src)=["']([^"'?#]*?(?:css|js)\/[^"'?#]+)\?v=([^"'>\s]+)/g;

function sourceFiles() {
  const listed = execSync('git ls-files -z "*.html" "lib/*.js" "tools/*.js"', { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((f) => f !== "tools/asset-versions.js");
  return listed.sort();
}

function normalize(ref) {
  return "/" + ref.replace(/^\.?\//, "");
}

function collect() {
  const tokens = new Map();
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of text.matchAll(REF)) {
      const asset = normalize(m[1]);
      const token = m[2];
      if (token.includes("${")) continue;
      if (!tokens.has(asset)) tokens.set(asset, new Map());
      const byToken = tokens.get(asset);
      if (!byToken.has(token)) byToken.set(token, new Set());
      byToken.get(token).add(file);
    }
  }
  return tokens;
}

function lastChange(asset, cache) {
  if (cache.has(asset)) return cache.get(asset);
  let date = null;
  try {
    date = execSync(`git log -1 --format=%cs -- "${asset.replace(/^\//, "")}"`, { cwd: ROOT, encoding: "utf8" }).trim() || null;
  } catch {
    date = null;
  }
  cache.set(asset, date);
  return date;
}

function check(useGit) {
  const tokens = collect();
  const problems = [];
  const dates = new Map();
  for (const [asset, byToken] of [...tokens].sort()) {
    const target = path.join(ROOT, asset.replace(/^\//, ""));
    if (!fs.existsSync(target)) problems.push(`${asset}: فایل وجود ندارد`);
    if (byToken.size > 1) {
      const detail = [...byToken].map(([t, files]) => `${t} (${files.size} صفحه)`).join("، ");
      problems.push(`${asset}: چند توکن هم‌زمان در سایت — ${detail}`);
    }
    if (!useGit) continue;
    const changed = lastChange(asset, dates);
    if (!changed) continue;
    for (const token of byToken.keys()) {
      const m = token.match(/(20\d{2})-?(\d{2})-?(\d{2})/);
      if (!m) continue;
      const tokenDate = `${m[1]}-${m[2]}-${m[3]}`;
      if (tokenDate < changed) problems.push(`${asset}: توکن ${token} از آخرین تغییر فایل (${changed}) قدیمی‌تر است`);
    }
  }
  if (problems.length) {
    console.error("توکن کش نامعتبر:");
    for (const p of problems) console.error("  - " + p);
    console.error("\nدرستش کن با: node tools/asset-versions.js bump <توکن> " + "<فایل...>");
    return 1;
  }
  console.log(`توکن کش مرتب است (${tokens.size} فایل، بدون تناقض).`);
  return 0;
}

function bump(token, assets) {
  if (!token || !assets.length) {
    console.error("استفاده: node tools/asset-versions.js bump <token> <asset> [asset...]");
    return 1;
  }
  const wanted = new Set(assets.map(normalize));
  let changedFiles = 0;
  for (const file of sourceFiles()) {
    const full = path.join(ROOT, file);
    const before = fs.readFileSync(full, "utf8");
    const after = before.replace(REF, (all, ref, old) => {
      if (old.includes("${") || !wanted.has(normalize(ref))) return all;
      return all.replace(`?v=${old}`, `?v=${token}`);
    });
    if (after !== before) {
      fs.writeFileSync(full, after);
      changedFiles++;
    }
  }
  console.log(`توکن ${token} روی ${assets.length} فایل اعمال شد (${changedFiles} فایل میزبان).`);
  return 0;
}

const [command, ...rest] = process.argv.slice(2);
if (command === "check") process.exit(check(!rest.includes("--no-git")));
else if (command === "bump") process.exit(bump(rest[0], rest.slice(1)));
else {
  console.error("دستور نامعتبر. از check یا bump استفاده کن.");
  process.exit(2);
}
