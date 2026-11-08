const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("homepage keeps the original animated loom as a separate experience", () => {
  const decor = read("js/decor.js");
  const html = read("index.html");
  assert.match(decor, /sec\.id = "loom-demo"/);
  assert.match(decor, /منجوق به منجوق می‌رم و میام/);
  for (const pattern of ["چشم‌نظر", "لوزی‌های طلایی", "قلب", "ستاره‌ی شب"]) {
    assert.ok(decor.includes(pattern), `missing original loom pattern: ${pattern}`);
  }
  assert.match(html, /id="heroCanvas"/);
  assert.match(html, /id="wvCanvas"/);
  assert.match(html, /cara-weaving\.MP4/);
});

test("handmade video feature is compact and proportionate", () => {
  const css = read("css/weaving.css");
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 220px\)/);
  assert.match(css, /max-width: 220px/);
  assert.match(read("index.html"), /<h2 id="weaving-title">ببین چطور میبافم<\/h2>/);
});

test("name bracelet starts with Cara in gold on purple", () => {
  const html = read("index.html");
  const js = read("js/weave.js");
  assert.match(html, /value="کارا \/ cara"/);
  assert.match(js, /let fg = "DB1832", bg = "DB2359"/);
});


test("hero bracelet stays horizontal instead of tilting with scroll", () => {
  const home = read("js/home.js");
  const heroCss = read("css/hero.css");
  assert.match(home, /hero\.querySelector\("\.prod canvas"\)/);
  assert.match(home, /bracelet\.style\.transform = "none"/);
  assert.doesNotMatch(home, /bracelet\.style\.transform = `rotate[YZ]\(/);
  assert.doesNotMatch(home, /hero\.querySelector\("\.prod img"\)/);
  assert.match(heroCss, /\.hero2 \.prod canvas \{/);
});

test("weaving heading and frame follow the homepage heading and card rhythm", () => {
  const css = read("css/weaving.css");
  assert.match(css, /width: min\(1240px, 100%\)/);
  assert.match(css, /max-width: none/);
  assert.match(css, /border-radius: 26px/);
  assert.match(css, /width: 102px/);
  assert.match(css, /radial-gradient\(circle, #b8975a 0 3\.2px, transparent 3\.8px\)/);
});


test("hero bracelet canvas has visible square dimensions on desktop and mobile", () => {
  const css = read("css/hero.css");
  assert.match(css, /\.hero2 \.prod canvas \{/);
  assert.match(css, /width: min\(100%, 620px, 78vh\)/);
  assert.match(css, /height: auto;/);
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /width: min\(82vw, 36vh, 360px\)/);
});


test("hero bracelet sizing does not depend on percentage height and has a safe canvas fallback", () => {
  const css = read("css/hero.css");
  const js = read("js/hero-bracelet.js");
  assert.match(css, /\.hero2 \.prod canvas \{[\s\S]*?height: auto;[\s\S]*?aspect-ratio: 1 \/ 1/);
  assert.match(js, /if\(!r\.width\)cv\.style\.width=fallback\+"px"/);
  assert.match(js, /ro\.observe\(cv\.parentElement\)/);
  assert.match(js, /function roundedRect\(/);
});

test("homepage feature frames share the same outer section width", () => {
  const weaving = read("css/weaving.css");
  const nameWeaving = read("css/weave.css");
  assert.match(weaving, /\.cara-weaving__inner \{[\s\S]*?width: 100%;[\s\S]*?max-width: none/);
  assert.match(nameWeaving, /\.wv-home__inner \{ width: 100%; max-width: none;/);
});


test("all homepage content uses one shared 1240px frame and matching gutters", () => {
  const frame = read("css/page-frame.css");
  const html = read("index.html");
  assert.match(frame, /--page-frame-width: 1240px/);
  assert.match(frame, /\.sec,[\s\S]*?\.cara-weaving,[\s\S]*?\.wv-home/);
  assert.match(frame, /width: min\(var\(--page-frame-width\), 100%\)/);
  assert.match(frame, /padding-inline: var\(--page-frame-gutter\)/);
  assert.match(frame, /\.hero\.hero2 \{[\s\S]*?padding-inline: max\(/);
  assert.match(frame, /\.foot \{[\s\S]*?padding-inline: max\(/);
  assert.match(html, /css\/page-frame\.css\?v=2/);
  assert.match(html, /id="braceletCanvas"[\s\S]*?width="560"[\s\S]*?height="560"/);
});

test("hero bracelet easing is initialized before the first fit render", () => {
  const js = read("js/hero-bracelet.js");
  assert.ok(js.indexOf("const clamp=") < js.indexOf("fit();"));
  assert.ok(js.indexOf("const clamp=") < js.indexOf("function render(t)"));
});

test("hero bracelet is redrawn after the page layout finishes", () => {
  const js = read("js/hero-bracelet.js");
  assert.match(js, /requestAnimationFrame\(\(\)=>requestAnimationFrame\(\(\)=>\{fit\(\);inViewport=true;syncAnimation\(\)\}\)\)/);
  assert.match(js, /new ResizeObserver\(fit\)\.observe\(cv\)/);
});


test("gallery lightbox does not preload multiple full-size neighboring images", () => {
  const gallery = read("js/gallery.js");
  assert.doesNotMatch(gallery, /new Image\(\)\.src = n\.src/);
  assert.match(gallery, /lbImg\.decoding = "async"/);
  assert.match(gallery, /Do not preload neighboring full-resolution photos/);
});
