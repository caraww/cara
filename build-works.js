#!/usr/bin/env node
/* عکس‌های پوشه‌ی "bead works" رو می‌خونه و js/works.js رو می‌سازه که گالری ازش استفاده می‌کنه.

   اجرا (از ریشه‌ی پروژه):   node tools/build-works.js   (پوشه‌ی img/bead works خودکار پیدا می‌شه)
   اگه اسم پوشه فرق داره:    node tools/build-works.js "پوشه-من"

   اختیاری ۱: کنار عکس‌ها فایل info.json بذار تا اسم/توضیح/برچسب بدی:
     { "eye.jpg": { "title": "چشم‌نظر", "note": "آبی و فیروزه‌ای", "tags": ["سنتی", "آبی"] } }
   اختیاری ۲: npm i sharp  → برای هر عکس یه thumbnail کوچیک (برای کارت‌های گالری) و یه نسخه‌ی
   متوسط (برای بزرگ‌نمایی) ساخته می‌شه؛ عکس اصلی موبایل (چند مگابایتی) دیگه توی سایت لود نمی‌شه.
   اختیاری ۳: node tools/remove-bg.js  → نسخه‌ی بدون بک‌گراند؛ این اسکریپت خودش ازش استفاده می‌کنه. */
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const ROOT = fs.existsSync(path.join(process.cwd(), "index.html")) ? process.cwd() : path.resolve(__dirname, "..");
const isDir = (d) => fs.existsSync(d) && fs.statSync(d).isDirectory();
const norm = (n) => n.toLowerCase().replace(/[\s_-]+/g, "");
function findDir() {
  if (process.argv[2]) { const d = path.resolve(ROOT, process.argv[2]); return isDir(d) ? d : null; }
  for (const base of [path.join(ROOT, "img"), ROOT]) {
    if (!isDir(base)) continue;
    const hit = fs.readdirSync(base).find((n) => norm(n) === "beadworks" && isDir(path.join(base, n)));
    if (hit) return path.join(base, hit);
  }
  return null;
}
const DIR = findDir();
if (!DIR) {
  console.error('پوشه‌ی "bead works" پیدا نشد. باید توی ' + ROOT + ' یا توی img/ باشه. (یا اسمش رو آرگومان بده: node tools/build-works.js "img/پوشه-من")');
  process.exit(1);
}
const REL = path.relative(ROOT, DIR).split(path.sep);
const OUT = path.join(ROOT, "js", "works.js");
const THUMBS = path.join(ROOT, "img", "works-thumbs");
const FULLS = path.join(ROOT, "img", "works-full");
const CUTS = path.join(ROOT, "img", "works-cutouts");      /* خروجی tools/remove-bg.js */
const CUTS_THUMB = path.join(CUTS, "thumb");
const THUMB_W = 600;   /* عرض کارت گالری (قبلاً ۹۰۰ بود) */
const FULL_W = 1400;   /* عرض نسخه‌ی بزرگ‌نمایی */
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const safe = (f) => {
  const b = f.replace(EXT, ""), s = b.replace(/[^\w.-]+/g, "_");
  return s === b ? s : s + "-" + crypto.createHash("md5").update(b).digest("hex").slice(0, 6);
};
const url = (parts) => parts.map(encodeURIComponent).join("/");

let sharp = null;
try {
  sharp = require("sharp");
} catch {}

/* ---- ابعاد عکس بدون هیچ پکیجی ---- */
function headerSize(buf) {
  try {
    if (buf.readUInt32BE(0) === 0x89504e47)
      return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    if (buf.toString("ascii", 0, 3) === "GIF")
      return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const t = buf.toString("ascii", 12, 16);
      if (t === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
      if (t === "VP8L") {
        const b = buf.readUInt32LE(21);
        return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
      }
      if (t === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2, orient = 1;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
        if (m === 0xe1 && buf.toString("ascii", i + 4, i + 8) === "Exif") {
          const t = i + 10, le = buf.toString("ascii", t, t + 2) === "II";
          const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
          const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
          const ifd = t + u32(t + 4), n = u16(ifd);
          for (let k = 0; k < n; k++)
            if (u16(ifd + 2 + k * 12) === 0x0112) orient = u16(ifd + 2 + k * 12 + 8);
        }
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
          const h = buf.readUInt16BE(i + 5), w = buf.readUInt16BE(i + 7);
          return orient >= 5 ? [h, w] : [w, h];
        }
        i += 2 + len;
      }
    }
  } catch {}
  return [0, 0];
}

const nice = (name) =>
  name.replace(EXT, "").replace(/^\s*\d+\s*[-_.)\s]+/, "").replace(/[-_]+/g, " ").trim() || name.replace(EXT, "");

(async () => {
  let info = {};
  try { info = JSON.parse(fs.readFileSync(path.join(DIR, "info.json"), "utf8")); } catch {}
  const files = fs.readdirSync(DIR).filter((f) => EXT.test(f)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  if (sharp) { fs.mkdirSync(THUMBS, { recursive: true }); fs.mkdirSync(FULLS, { recursive: true }); }

  const works = [];
  let cutCount = 0;
  for (const f of files) {
    const full = path.join(DIR, f), meta = info[f] || {};
    const id = safe(f);
    let w = 0, h = 0, src = url([...REL, f]), thumb = null;

    const cutFull = path.join(CUTS, id + ".webp");
    const cutThumb = path.join(CUTS_THUMB, id + ".webp");
    if (fs.existsSync(cutFull)) {
      /* نسخه‌ی بدون بک‌گراند */
      cutCount++;
      src = "img/works-cutouts/" + id + ".webp";
      thumb = fs.existsSync(cutThumb) ? "img/works-cutouts/thumb/" + id + ".webp" : src;
      [w, h] = headerSize(fs.readFileSync(fs.existsSync(cutThumb) ? cutThumb : cutFull));
    } else if (sharp) {
      try {
        const base = id + ".webp";
        const t = await sharp(full).rotate()
          .resize({ width: THUMB_W, withoutEnlargement: true })
          .webp({ quality: 78 }).toFile(path.join(THUMBS, base));
        await sharp(full).rotate()
          .resize({ width: FULL_W, height: FULL_W, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 }).toFile(path.join(FULLS, base));
        w = t.width; h = t.height;              /* ابعاد thumbnail، نه عکس اصلی */
        thumb = "img/works-thumbs/" + base;
        src = "img/works-full/" + base;
      } catch (e) {
        console.warn("sharp نتونست:", f, e.message);
      }
    }
    if (!w) [w, h] = headerSize(fs.readFileSync(full));
    works.push({
      id, src, thumb: thumb || src, w, h,
      cut: fs.existsSync(cutFull),
      title: meta.title || nice(f),
      note: meta.note || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
    });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    "/* خودکار ساخته شده با tools/build-works.js؛ دستی ویرایشش نکن. */\n" +
      "(window.CARA = window.CARA || {}).works = " + JSON.stringify(works, null, 1) + ";\n",
  );
  console.log(
    `✓ ${works.length} عکس از «${REL.join("/")}» خونده شد → js/works.js` +
      (sharp ? ` (thumbnail ${THUMB_W}px + نسخه‌ی ${FULL_W}px)` : " (بدون sharp؛ عکس‌ها کوچیک نمی‌شن: npm i sharp)") +
      (cutCount ? ` | ${cutCount} عکس بدون بک‌گراند` : ""),
  );
})();
