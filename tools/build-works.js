/* ساخت js/works.js از عکس‌های پوشه‌ی img/bead works
   اجرا (از ریشه‌ی پروژه):  node tools/build-works.js

   - اسم فایل = عنوان کار توی سایت (فارسی هم کاملاً اوکیه): «چشم نظر آبی.jpg» → «چشم نظر آبی»
   - زیرخط _ توی اسم فایل به فاصله تبدیل می‌شه.
   - اگه اسم فایل فقط عدد باشه (1.jpg) عنوانی نمایش داده نمی‌شه.
   - اختیاری: فایل img/bead works/info.json برای توضیح، برچسب، قیمت یا عنوان دلخواه:
       {
         "چشم نظر آبی.jpg": { "note": "آبی و فیروزه‌ای", "tags": ["سنتی"], "price": 1800000 },
         "قلب": { "title": "قلب قرمز" }
       }
     کلید می‌تونه اسم فایل با پسوند یا بدون پسوند باشه. price به تومانه؛ اگه ننویسی قیمت پیش‌فرض (WORK_PRICE) اعمال می‌شه. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "img", "works-cutouts");
const OUT = path.join(ROOT, "js", "works.js");
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const fixFa = (s) => s.normalize("NFC").replace(/ي/g, "ی").replace(/ك/g, "ک");
const isNum = (s) => /^[\s0-9۰-۹٠-٩.\-_)]+$/.test(s);
const enc = (rel) => rel.split("/").map(encodeURIComponent).join("/");

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

let info = {};
try {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, "info.json"), "utf8"));
  for (const k of Object.keys(raw)) info[fixFa(k)] = raw[k];
} catch {}

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
  const b0 = fixFa(file.replace(EXT, ""));
  const m = b0.match(/^(.*?)\s*__(\d+)$/);
  const key = m ? m[1] : b0;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ file, n: m ? Number(m[2]) : 1 });
}

const used = new Set();
const works = [...groups].map(([base, items]) => {
  items.sort((a, b) => a.n - b.n);
  const file = items[0].file;
  const meta = info[fixFa(file)] || info[base] || {};
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  const nice = base.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const title = meta.title ? String(meta.title) : isNum(nice) ? "" : nice;
  items.forEach((it) => {
    if (it.file !== it.file.normalize("NFC"))
      console.warn(
        "⚠ اسم این فایل با یونیکد NFD ذخیره شده (معمولاً مک)، اگه تو سایت لود نشد دوباره اسمش رو عوض کن:",
        it.file,
      );
  });
  const images = items.map((it) => enc("img/works-cutouts/" + it.file));
  console.log("✓", file, `(${images.length} عکس)`, "→ عنوان:", title || "(بدون عنوان)");
  const w = { id, src: images[0], thumb: images[0] };
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
  return w;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  "/* خودکار ساخته شده با tools/build-works.js؛ دستی ویرایشش نکن. */\n(window.CARA = window.CARA || {}).works = " +
    JSON.stringify(works, null, 1) +
    ";\n",
);
console.log(`${works.length} کار نوشته شد → js/works.js`);
