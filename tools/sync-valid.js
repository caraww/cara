#!/usr/bin/env node
/* لیست VALID توی Worker (index.js API) رو از js/palette.js می‌سازه تا هیچ‌وقت ناهماهنگ نشن.
   اجرا:   node tools/sync-valid.js <مسیر فایل worker>
   فقط بررسی (بدون تغییر):  node tools/sync-valid.js <مسیر> --check   */
const fs = require("fs"), path = require("path");
const target = process.argv[2], check = process.argv.includes("--check");
if (!target) { console.error("مسیر فایل Worker رو بده."); process.exit(1); }
const pal = [path.resolve(__dirname, "../js/palette.js"), path.resolve(__dirname, "../palette.js")].find(fs.existsSync);
const { CARA_PALETTE } = require(pal);
const codes = CARA_PALETTE.map((p) => JSON.stringify(p.code));
const lines = []; for (let i = 0; i < codes.length; i += 10) lines.push("  " + codes.slice(i, i + 10).join(", ") + ",");
const block = "/* SYNC:START (خودکار؛ دستی ویرایش نکن: node tools/sync-valid.js) */\nconst VALID = new Set([\n" + lines.join("\n") + "\n]);\n/* SYNC:END */";
const src = fs.readFileSync(target, "utf8");
const re = /\/\* SYNC:START[\s\S]*?\/\* SYNC:END \*\//;
if (!re.test(src)) { console.error("نشانه‌ی SYNC توی فایل نیست."); process.exit(1); }
const next = src.replace(re, () => block);
if (next === src) { console.log("✓ هماهنگ بود."); process.exit(0); }
if (check) { console.error("✗ لیست رنگ‌ها با palette.js فرق داره."); process.exit(2); }
fs.writeFileSync(target, next); console.log(`✓ ${codes.length} رنگ توی ${target} هماهنگ شد.`);
