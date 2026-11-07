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


test("the original spinning hero bracelet canvas receives its scroll transform", () => {
  const home = read("js/home.js");
  const heroCss = read("css/hero.css");
  assert.match(home, /hero\.querySelector\("\.prod canvas"\)/);
  assert.match(home, /bracelet\.style\.transform = `rotateY\(/);
  assert.doesNotMatch(home, /hero\.querySelector\("\.prod img"\)/);
  assert.match(heroCss, /\.hero2 \.prod canvas \{/);
});

test("weaving heading and frame follow the homepage heading and card rhythm", () => {
  const css = read("css/weaving.css");
  assert.match(css, /width: min\(1240px, 100%\)/);
  assert.match(css, /max-width: 1040px/);
  assert.match(css, /border-radius: 26px/);
  assert.match(css, /width: 102px/);
  assert.match(css, /radial-gradient\(circle, #b8975a 0 3\.2px, transparent 3\.8px\)/);
});


test("hero bracelet canvas has visible square dimensions on desktop and mobile", () => {
  const css = read("css/hero.css");
  assert.match(css, /\.hero2 \.prod canvas \{/);
  assert.match(css, /width: min\(100%, 620px, 78vh\)/);
  assert.match(css, /height: min\(100%, 620px, 78vh\)/);
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /width: min\(82vw, 36vh, 360px\)/);
});
