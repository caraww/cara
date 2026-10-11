# راهنمای CSS

| فایل | صفحه‌ها | از چی ساخته شده |
|---|---|---|
| `home.css` | index | home + home-mobile + بخش mini-gal از gallery-editorial |
| `studio.css` | builder, upload, gallery, checkout, game | studio (بدون کدهای قدیمی) + polish |
| `decor.css` | همه‌ی صفحه‌ها (غیر از admin) | delight + details |
| `builder.css` | builder | studio-controls (بخش سازنده) + studio-pro + studio-minimal |
| `upload.css` | upload | studio-controls (بخش آپلود) + upload-crop |
| `gallery.css` | gallery | works + gallery-fix + gallery-soft + gallery-editorial + gallery-tools |

## ترتیب لود
- index:    home.css → decor.css
- builder:  studio.css → decor.css → builder.css
- upload:   studio.css → decor.css → upload.css
- gallery:  studio.css → gallery.css → decor.css   (گالری قبلاً هم decor رو بعد از فایل‌های خودش می‌گرفت)
- checkout, game: studio.css → decor.css
- admin: CSS مشترک نداره (استایل خودش inline هست)

## حذف‌شده از studio.css (در هیچ صفحه‌ی استودیو استفاده نمی‌شد)
.hero, .hero-card, .sec, .lead, .paths/.path, .steps, .chips, .foot (کپی قدیمی صفحه‌ی اصلی)،
.gal-grid, .gcard, .fav, .dlg, .dstats (گالری قدیمی)، .logo i و keyframes bob.
