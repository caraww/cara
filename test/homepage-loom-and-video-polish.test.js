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
  assert.equal((html.match(/class="hx__card/g) || []).length, 3);
  assert.match(html, /id="wvCanvas"/);
  assert.match(html, /cara-weaving\.MP4/);
});

test("handmade video feature is compact and proportionate", () => {
  const css = read("css/weaving.css");
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 240px\)/);
  assert.match(css, /max-width: 240px/);
  assert.match(read("index.html"), /<h2 id="weaving-title">ببین چطور می‌بافم<\/h2>/);
});

test("name bracelet starts with Cara in gold on purple", () => {
  const html = read("index.html");
  const js = read("js/weave.js");
  assert.match(html, /value="کارا \/ cara"/);
  assert.match(js, /let fg = "DB1832", bg = "DB0726"/);
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
  assert.match(frame, /\.sec,[\s\S]*?\.cara-weaving,[\s\S]*?\.wv-home/);
  assert.match(frame, /\.foot \{[\s\S]*?padding-inline: max\(/);
  assert.match(html, /css\/page-frame\.css\?v=2/);
  assert.equal((html.match(/class="hx__card/g) || []).length, 3);
});
