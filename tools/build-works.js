/* ساخت js/works.js از عکس‌های پوشه‌ی img/works-cutouts
   اجرا (از ریشه‌ی پروژه):  node tools/build-works.js

   - اسم فایل = عنوان کار توی سایت (فارسی هم کاملاً اوکیه): «چشم نظر آبی.jpg» → «چشم نظر آبی»
   - زیرخط _ توی اسم فایل به فاصله تبدیل می‌شه.
   - اگه اسم فایل فقط عدد باشه (1.jpg) عنوانی نمایش داده نمی‌شه.
   - اختیاری: فایل img/works-cutouts/info.json برای توضیح، برچسب، قیمت یا عنوان دلخواه:
       {
         "چشم نظر آبی.jpg": { "note": "آبی و فیروزه‌ای", "tags": ["سنتی"], "price": 1800000 },
         "قلب": { "title": "قلب قرمز" }
       }
     "آلبوم": { "noOrder": true } یعنی فقط نمونه‌ست؛ قیمت نمی‌گیره و قابل سفارش مستقیم نیست.
     کلید می‌تونه اسم فایل با پسوند یا بدون پسوند باشه. price به تومانه؛ اگه ننویسی قیمت پیش‌فرض (WORK_PRICE) اعمال می‌شه. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ORIGINAL_DIR = path.join(ROOT, "img", "works-cutouts");
const TRANSPARENT_DIR = path.join(ROOT, "img", "works-cutouts-transparent");
/* Prefer the transparent cutouts so hero cards blend into their cream surface.
   Set CARA_USE_ORIGINAL=1 only when debugging the untouched source photos. */
const DIR = process.env.CARA_USE_ORIGINAL === "1" || !fs.existsSync(TRANSPARENT_DIR) ? ORIGINAL_DIR : TRANSPARENT_DIR;
const OUT = path.join(ROOT, "js", "works.js");
const OUT_JSON = path.join(ROOT, "data", "works.json"); /* server.js و Worker از این می‌خوانند */
const STAMP = Date.now().toString(36); /* نسخه‌ی این بیلد؛ برای شکستن کش */
function pagesLoadingWorks(dir = ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pagesLoadingWorks(full, found);
    else if (entry.name.endsWith(".html") && fs.readFileSync(full, "utf8").includes("js/works.js")) {
      found.push(path.relative(ROOT, full));
    }
  }
  return found;
}
const PAGES = pagesLoadingWorks();
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const fixFa = (s) => s.normalize("NFC").replace(/ي/g, "ی").replace(/ك/g, "ک");
const isNum = (s) => /^[\s0-9۰-۹٠-٩.\-_)]+$/.test(s);
const enc = (rel) => rel.split("/").map(encodeURIComponent).join("/");
/* هر عکس با نسخه‌ی تاریخ تغییرش لینک می‌شه، پس عکس عوض‌شده یا قدیمی از کش نمیاد */
const verIn = (dir, file) => { try { return "?v=" + Math.round(fs.statSync(path.join(dir, file)).mtimeMs).toString(36); } catch { return ""; } };
const ver = (file) => verIn(DIR, file);

/* ابعاد عکس (با در نظر گرفتن چرخش EXIF موبایل) */
function exifOrient(b, s) {
  const le = b.toString("ascii", s, s + 2) === "II";
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const o = s + u32(s + 4),
    n = u16(o);
  for (let i = 0; i < n; i++) {
    const e = o + 2 + i * 12;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}
function dims(b) {
  try {
    if (b.readUInt32BE(0) === 0x89504e47)
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b[0] === 0xff && b[1] === 0xd8) {
      let o = 2,
        orient = 1;
      while (o < b.length - 9) {
        if (b[o] !== 0xff) {
          o++;
          continue;
        }
        const m = b[o + 1];
        if (m === 0xff) {
          o++;
          continue;
        }
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
          o += 2;
          continue;
        }
        const len = b.readUInt16BE(o + 2);
        if (m === 0xe1 && b.toString("ascii", o + 4, o + 8) === "Exif") {
          try {
            orient = exifOrient(b, o + 10);
          } catch {}
        }
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          const d = { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) };
          return orient >= 5 ? { w: d.h, h: d.w } : d;
        }
        o += 2 + len;
      }
    }
    if (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    ) {
      const t = b.toString("ascii", 12, 16);
      if (t === "VP8X")
        return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (t === "VP8 ")
        return {
          w: b.readUInt16LE(26) & 0x3fff,
          h: b.readUInt16LE(28) & 0x3fff,
        };
      if (t === "VP8L") {
        const v = b.readUInt32LE(21);
        return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
      }
    }
    if (b.toString("ascii", 0, 3) === "GIF")
      return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  } catch {}
  return null;
}

if (!fs.existsSync(DIR)) {
  console.error("پوشه پیدا نشد:", DIR);
  process.exit(1);
}

/* عکس‌های سبک: از هر عکس یه نسخه‌ی کوچیک برای کارت‌ها (۷۰۰ پیکسل) و یه نسخه‌ی نمایش بزرگ (۱۶۰۰ پیکسل) به شکل webp می‌سازه.
   عکس‌های اصلی ۳۰۰۰×۴۰۰۰ پیکسلی چند مگابایتن و باعث می‌شن گالری کند و ناقص لود بشه. اگه sharp نصب نباشه، همون عکس اصلی استفاده می‌شه (npm install). */
let sharp = null;
try { sharp = require("sharp"); } catch (e) {
  if (process.env.CARA_REQUIRE_SHARP === "1") {
    console.error("sharp is required for this image build:", e.message);
    process.exit(1);
  }
  console.warn("⚠ sharp نصب نیست؛ بدون عکس سبک ادامه می‌دم (npm install)");
}
const THUMB_DIR = path.join(ROOT, "img", "works-thumbs");
const VIEW_DIR = path.join(ROOT, "img", "works-view");
async function derive(files) {
  const m = new Map();
  if (!sharp) return m;
  for (const d of [THUMB_DIR, VIEW_DIR]) fs.mkdirSync(d, { recursive: true }); /* پوشه‌ها ممکن است فایل دستی هم داشته باشند؛ فقط خروجی‌های هم‌نام بازتولید می‌شوند و هیچ فایل دیگری حذف نمی‌شود. */
  for (const f of files) {
    const base = f.replace(EXT, ""), name = base + ".webp", avif = base + ".avif", src = path.join(DIR, f);
    try {
      const thumb = sharp(src).rotate().resize({ width: 700, height: 700, fit: "inside", withoutEnlargement: true });
      await thumb.clone().webp({ quality: 82 }).toFile(path.join(THUMB_DIR, name));
      await thumb.clone().avif({ quality: 52, effort: 5 }).toFile(path.join(THUMB_DIR, avif));
      /* نسخه‌های کوچک برای srcset؛ موبایل به‌جای ۷۰۰ پیکسل، ۲۴۰/۴۸۰ پیکسل می‌گیرد. */
      const small240 = base + "-240.webp", small480 = base + "-480.webp";
      await sharp(src).rotate().resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(THUMB_DIR, small240));
      await sharp(src).rotate().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(THUMB_DIR, small480));
      await sharp(src).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(VIEW_DIR, name));
      m.set(f, { thumb: "img/works-thumbs/" + name, thumbAvif: "img/works-thumbs/" + avif, thumb240: "img/works-thumbs/" + small240, thumb480: "img/works-thumbs/" + small480, view: "img/works-view/" + name });
    } catch (e) { console.warn("⚠ عکس سبک ساخته نشد:", f, e.message); }
  }
  return m;
}

(async () => {
let info = {};
for (const infoDir of [...new Set([ORIGINAL_DIR, DIR])]) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(infoDir, "info.json"), "utf8"));
    for (const k of Object.keys(raw)) {
      const key = fixFa(k);
      info[key] = { ...(info[key] || {}), ...raw[k] };
    }
  } catch {}
}
const infoByBase = {};
for (const [k, v] of Object.entries(info)) infoByBase[fixFa(k).replace(EXT, "").trim()] = v;

const all = fs
  .readdirSync(DIR)
  .filter((f) => f !== "info.json" && !f.startsWith("."));
const files = all
  .filter((f) => EXT.test(f))
  .sort((a, b) => a.localeCompare(b, "fa", { numeric: true }));
all
  .filter((f) => !EXT.test(f))
  .forEach((f) => console.warn("⚠ نادیده گرفته شد (پسوند عکس نیست):", f));

/* چند عکس برای یک کار: عکس اصلی «اسب.png» و عکس‌های بعدی «اسب__2.png»، «اسب__3.jpg» ...
   همه‌شون یک کار حساب می‌شن و توی نمایش بزرگ با عکس‌های ریز کنار هم می‌آن. */
const groups = new Map();
for (const file of files) {
  const b0 = fixFa(file.replace(EXT, "")).trim();
  const m = b0.match(/^(.*?)\s*__(\d+)$/);
  const key = m ? m[1] : b0;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ file, n: m ? Number(m[2]) : 1 });
}

const derived = await derive(files);
const used = new Set();
const works = [...groups].map(([base, items]) => {
  items.sort((a, b) => a.n - b.n);
  const file = items[0].file;
  const meta = info[fixFa(file)] || infoByBase[fixFa(base)] || {};
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  const nice = base.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  id = id.trim();
  const title = meta.title ? String(meta.title) : isNum(nice) ? "" : nice;
  items.forEach((it) => {
    if (it.file !== it.file.normalize("NFC"))
      console.warn(
        "⚠ اسم این فایل با یونیکد NFD ذخیره شده (معمولاً مک)، اگه تو سایت لود نشد دوباره اسمش رو عوض کن:",
        it.file,
      );
  });
  const originalName = DIR === ORIGINAL_DIR ? file : fs.readdirSync(ORIGINAL_DIR).find((f) => f.replace(EXT, "") === base) || file;
  const original = enc("img/works-cutouts/" + originalName) + verIn(ORIGINAL_DIR, originalName);
  const images = items.map((it) => { const d = derived.get(it.file); return d ? enc(d.view) + "?v=" + STAMP : enc("img/works-cutouts/" + it.file) + ver(it.file); });
  const d0 = derived.get(items[0].file), thumb = d0 ? enc(d0.thumb) + "?v=" + STAMP : images[0];
  const thumbAvif = d0 && d0.thumbAvif ? enc(d0.thumbAvif) + "?v=" + STAMP : "";
  const thumb240 = d0 && d0.thumb240 ? enc(d0.thumb240) + "?v=" + STAMP : "";
  const thumb480 = d0 && d0.thumb480 ? enc(d0.thumb480) + "?v=" + STAMP : "";
  console.log("✓", file, `(${images.length} عکس)`, "→ عنوان:", title || "(بدون عنوان)");
  const w = { id, src: images[0], thumb, source: original };
  if (thumbAvif) w.thumbAvif = thumbAvif;
  if (thumb240) w.thumb240 = thumb240;
  if (thumb480) w.thumb480 = thumb480;
  if (images.length > 1) w.images = images;
  const d = dims(fs.readFileSync(path.join(DIR, file)));
  if (d) {
    w.w = d.w;
    w.h = d.h;
  }
  w.title = title;
  w.note = meta.note ? String(meta.note) : "";
  w.tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
  if (Number(meta.price) > 0) w.price = Math.round(Number(meta.price));
  if (meta.noOrder) w.noOrder = true; /* نمونه‌ی غیرقابل‌سفارش: Worker قیمت نمی‌ده و دکمه‌ی سفارش نمایش داده نمی‌شه */
  return w;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(works, null, 1));
fs.writeFileSync(
  OUT,
  "/* خودکار ساخته شده با tools/build-works.js؛ دستی ویرایشش نکن. */\n(window.CARA = window.CARA || {}).works = " +
    JSON.stringify(works, null, 1) +
    ";\n",
);
console.log(`${works.length} کار نوشته شد → js/works.js و data/works.json`);

/* نسخه‌ی js/works.js رو توی صفحه‌ها عوض می‌کنیم تا مرورگر و کلودفلر نسخه‌ی قدیمی رو نشون ندن */
for (const page of PAGES) {
  const f = path.join(ROOT, page);
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, "utf8");
  const next = html.replace(/js\/works\.js(\?v=[0-9a-z]+)?/g, "js/works.js?v=" + STAMP);
  if (next !== html) { fs.writeFileSync(f, next); console.log("✓ نسخه‌ی works.js در", page, "به‌روز شد"); }
}

})().catch((e) => { console.error(e); process.exit(1); });
