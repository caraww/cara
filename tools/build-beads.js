#!/usr/bin/env node
/* لیست عکس‌های واقعی منجوق‌ها رو توی js/beads.js می‌نویسه تا صفحه‌ی اصلی برای هر رنگ فقط یک درخواست بزنه.
   از ریشه‌ی پروژه اجرا کن:  node tools/build-beads.js   (هر بار عکس منجوق اضافه/عوض کردی دوباره) */
const fs = require("fs"), path = require("path");
const dir = path.resolve(__dirname, "../img/beads");
const map = {};
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  const e = path.extname(f).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(e)) continue;
  map[path.basename(f, path.extname(f)).toUpperCase()] = f;
}
fs.writeFileSync(path.resolve(__dirname, "../js/beads.js"), "(window.CARA = window.CARA || {}).beadFiles = " + JSON.stringify(map, null, 1) + ";\n");
console.log("✓ " + Object.keys(map).length + " عکس منجوق ثبت شد.");
