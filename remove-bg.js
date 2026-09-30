#!/usr/bin/env node
/* بک‌گراند عکس‌های پوشه‌ی "bead works" رو برمی‌داره و توی img/works-cutouts می‌ذاره.
   بعدش node tools/build-works.js رو اجرا کن تا گالری از نسخه‌های بدون بک‌گراند استفاده کنه.

   نصب (یک بار):   npm i sharp @imgly/background-removal-node
   اجرا:           node tools/remove-bg.js
   همه رو از نو:   node tools/remove-bg.js --force
   فقط چند عکس:    node tools/remove-bg.js eye.jpg heart.jpg
   پوشه‌ی دیگه:    node tools/remove-bg.js --dir "img/پوشه-من"

   بار اول مدل دانلود/لود می‌شه و چند دقیقه طول می‌کشه؛ بعدش هر عکس چند ثانیه. */
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

let sharp, removeBackground;
try {
  sharp = require("sharp");
  ({ removeBackground } = require("@imgly/background-removal-node"));
} catch {
  console.error("اول این رو بزن:  npm i sharp @imgly/background-removal-node");
  process.exit(1);
}

const ROOT = fs.existsSync(path.join(process.cwd(), "index.html")) ? process.cwd() : path.resolve(__dirname, "..");
const isDir = (d) => fs.existsSync(d) && fs.statSync(d).isDirectory();
const norm = (n) => n.toLowerCase().replace(/[\s_-]+/g, "");
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
/* دقیقاً همون safe() توی build-works.js، تا اسم خروجی‌ها با هم بخونه */
const safe = (f) => {
  const b = f.replace(EXT, ""), s = b.replace(/[^\w.-]+/g, "_");
  return s === b ? s : s + "-" + crypto.createHash("md5").update(b).digest("hex").slice(0, 6);
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const di = args.indexOf("--dir");
const dirArg = di >= 0 ? args[di + 1] : null;
const only = args.filter((a, i) => !a.startsWith("--") && i !== di + 1);

function findDir() {
  if (dirArg) { const d = path.resolve(ROOT, dirArg); return isDir(d) ? d : null; }
  for (const base of [path.join(ROOT, "img"), ROOT]) {
    if (!isDir(base)) continue;
    const hit = fs.readdirSync(base).find((n) => norm(n) === "beadworks" && isDir(path.join(base, n)));
    if (hit) return path.join(base, hit);
  }
  return null;
}
const DIR = findDir();
if (!DIR) { console.error('پوشه‌ی "bead works" پیدا نشد. (--dir "مسیر" بده)'); process.exit(1); }

const OUT = path.join(ROOT, "img", "works-cutouts");
const OUT_THUMB = path.join(OUT, "thumb");
const FULL_W = 1400, THUMB_W = 600;

(async () => {
  fs.mkdirSync(OUT_THUMB, { recursive: true });
  let files = fs.readdirSync(DIR).filter((f) => EXT.test(f));
  if (only.length) files = files.filter((f) => only.includes(f));
  let done = 0, skipped = 0, failed = 0;

  for (const [i, f] of files.entries()) {
    const name = safe(f) + ".webp";
    const outFull = path.join(OUT, name), outThumb = path.join(OUT_THUMB, name);
    if (!force && fs.existsSync(outFull) && fs.existsSync(outThumb)) { skipped++; continue; }
    process.stdout.write(`[${i + 1}/${files.length}] ${f} ... `);
    try {
      /* اول کوچیک و چرخونده‌شده می‌کنیم: هم سریع‌تره هم جهت عکس موبایل درست می‌شه */
      const png = await sharp(path.join(DIR, f))
        .rotate()
        .resize({ width: FULL_W, height: FULL_W, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const blob = await removeBackground(new Blob([png], { type: "image/png" }), {
        model: "medium", /* اگه کند بود "small" بذار */
        output: { format: "image/png" },
      });
      let cut = Buffer.from(await blob.arrayBuffer());
      try { cut = await sharp(cut).trim().toBuffer(); } catch {} /* حاشیه‌ی شفاف اضافه رو می‌بره */
      await sharp(cut).webp({ quality: 85, alphaQuality: 90 }).toFile(outFull);
      await sharp(cut).resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outThumb);
      console.log("✓");
      done++;
    } catch (e) {
      console.log("✗ " + e.message);
      failed++;
    }
  }
  console.log(`\nتموم شد: ${done} ساخته شد، ${skipped} از قبل بود، ${failed} خطا.`);
  console.log("حالا اجرا کن:  node tools/build-works.js");
})();
