/* نرم کردن لبه‌ی عکس‌های برش‌خورده (PNG شفاف) برای حالت ژورنالی
   اجرا (از ریشه‌ی پروژه):  node tools/soften-edges.js
   بعدش:                    node tools/build-works.js

   - عکس‌های اصلی یه بار کپی می‌شن توی img/works-originals (دست نمی‌خورن).
   - همیشه از روی اصلی‌ها ساخته می‌شه، پس هر چندبار اجراش کنی لبه‌ها تارتر نمی‌شن.
   - فقط PNG های شفاف پردازش می‌شن؛ JPG ها (عکس‌های دوم) همون‌طور می‌مونن.
   - اگه sharp نصب نیست:  npm install
   تنظیمات رو از بالای فایل عوض کن. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "img", "works-cutouts");
const ORIG = path.join(ROOT, "img", "works-originals");

const SOFT = 1.3;    /* مقدار تاری لبه (پیکسل). بیشتر = لبه‌ی نرم‌تر */
const ERODE = 0.56;  /* بیشتر از 0.5 = لبه یه ذره به داخل میاد (حاشیه‌ی سفید/بریدگی کمتر) */
const MAX = 1400;    /* بزرگ‌ترین بعد عکس؛ عکس‌های ۴۰۳۲ پیکسلی سایت رو کند می‌کنن */

(async () => {
  if (!fs.existsSync(DIR)) { console.error("پوشه پیدا نشد:", DIR); process.exit(1); }
  fs.mkdirSync(ORIG, { recursive: true });
  const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f));
  for (const f of files) {
    const orig = path.join(ORIG, f), cur = path.join(DIR, f);
    if (!fs.existsSync(orig)) fs.copyFileSync(cur, orig);
    try {
      let img = sharp(orig).rotate().ensureAlpha();
      const meta = await sharp(orig).rotate().metadata();
      if (Math.max(meta.width, meta.height) > MAX) img = img.resize({ width: MAX, height: MAX, fit: "inside" });
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const { width: w, height: h } = info;
      /* کانال شفافیت رو جدا می‌کنیم، تار می‌کنیم و دوباره تیزش می‌کنیم تا لبه‌ی صاف و نرم بشه */
      const alpha = Buffer.alloc(w * h);
      for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
      const k = 2.2, b = 255 * (0.5 - k * ERODE);
      const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
        .blur(SOFT).linear(k, b).raw().toBuffer();
      for (let i = 0; i < w * h; i++) data[i * 4 + 3] = Math.min(soft[i], alpha[i] === 0 ? 0 : 255);
      await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(cur + ".tmp");
      fs.renameSync(cur + ".tmp", cur);
      console.log("✓", f, `${w}×${h}`);
    } catch (e) { console.warn("⚠ رد شد:", f, e.message); }
  }
  console.log(`${files.length} عکس نرم شد. حالا: node tools/build-works.js`);
})();
