#!/usr/bin/env node
/* بندانگشتی عکس منجوق‌ها برای پالت استودیو.
   عکس ۴۴۰ پیکسلی برای یک خانه‌ی ۳۰ پیکسلی سنگین است؛ این ابزار یک WebP کوچک
   می‌سازد تا پالت هم واقعی باشد هم سبک. اجرا: node tools/build-bead-thumbs.js */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "img/beads");
const OUT = path.join(SRC, "thumbs");
const SIZE = 96;

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("sharp نصب نیست: npm i -D sharp");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith("."));
  let made = 0;
  for (const file of files) {
    const code = path.parse(file).name;
    const target = path.join(OUT, `${code}.webp`);
    const src = path.join(SRC, file);
    if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    await sharp(src).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 78 }).toFile(target);
    made += 1;
  }
  const kb = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0) / 1024;
  console.log(`${made} بندانگشتی ساخته شد؛ ${fs.readdirSync(OUT).length} فایل، ${Math.round(kb)} کیلوبایت`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
