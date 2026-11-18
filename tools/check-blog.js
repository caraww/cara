#!/usr/bin/env node
/* ابزار ساده‌ی اعتبارسنجی صفحات وبلاگ؛ صفحات HTML مستقل و بدون dependency هستند. */
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..","blog");
const files=["index.html","wrist-size.html","color-meanings.html","miyuki-delica.html","bracelet-care.html"];
for(const file of files){const p=path.join(root,file);if(!fs.existsSync(p))throw new Error("Missing "+p);const s=fs.readFileSync(p,"utf8");if(!s.includes("<h1")||!s.includes('lang="fa"')||!s.includes('rel="canonical"'))throw new Error("Invalid SEO structure: "+file);}
console.log("✓ Blog pages passed basic structure checks.");