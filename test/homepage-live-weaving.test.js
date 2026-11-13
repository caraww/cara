const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (path) => fs.readFileSync(path, "utf8");

test("homepage contains one interactive live-weaving section and all controls", () => {
  const html = read("index.html");
  assert.equal((html.match(/id="loom"/g) || []).length, 1);
  assert.equal((html.match(/class="cara-bracelet-card__art"/g) || []).length, 3, "the current hero must keep all three bracelet canvases");
  for (const id of ["wvCanvas", "wvCount", "wvFill", "wvName", "wvFg", "wvBg", "wvAcross", "wvSpeed", "wvWarn", "wvPlay", "wvAgain", "wvDone", "wvOrder", "wvEdit"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /اسمت رو با منجوق بنویس/);
  assert.match(html, /اسمت رو بنویس و رنگ‌ها رو انتخاب کن؛ منجوق‌ها یکی‌یکی روی دار می‌شینن و تعدادشون رو همون لحظه می‌بینی/);
  assert.doesNotMatch(html, /<h2 id="wvTitle">ببین چطور می‌بافم/);
  assert.match(html, /<section class="cara-weaving" id="weaving"/);
  assert.match(html, /ببین چطور میبافم/);
  assert.match(html, /src="\/media\/cara-weaving\.MP4"/);
  assert.match(html, /css\/weaving\.css\?v=8/);
  assert.match(html, /querySelector\("\.cara-weaving__video"\)/);
  assert.ok(html.indexOf('<section class="cara-weaving"') < html.indexOf('<section class="wv-home"'), "video section should appear before interactive name weaving");
  assert.equal((html.match(/<section class="cara-weaving"/g) || []).length, 1);
  assert.equal((html.match(/<section class="wv-home"/g) || []).length, 1);
  assert.ok(html.indexOf('<section class="wv-home"') < html.indexOf('<section class="sec" id="paths">'), "live weaving must replace the old weaving section in place");
});

test("weaving script loads after the shared palette and before decor", () => {
  const html = read("index.html");
  const palette = html.indexOf('src="js/palette.js?v=34"');
  const weave = html.indexOf('src="js/weave.js?v=1"');
  const decor = html.indexOf('src="js/decor.js?v=14"');
  assert.ok(palette >= 0 && weave > palette && decor > weave);
  assert.match(html, /href="css\/weave\.css\?v=3"/);
});

test("decor keeps the shared loom dialog and restores the original homepage loom animation", () => {
  const decor = read("js/decor.js");
  assert.match(decor, /function Loom\(/);
  assert.match(decor, /function openWeave\(/);
  assert.match(decor, /sec\.id = "loom-demo"/);
  assert.match(decor, /منجوق به منجوق می‌رم و میام/);
  assert.match(decor, /steps\.insertAdjacentElement\("beforebegin", sec\)/);
});

test("homepage weaving script parses and has reduced-motion support", () => {
  const js = read("js/weave.js");
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /C\.savePattern\(/);
});

test("weaving styles include mobile layout and reduced-motion handling", () => {
  const css = read("css/weave.css");
  assert.match(css, /max-width: 560px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.wv-scroll/);
  assert.match(css, /text-align: right !important/);
  assert.match(css, /\.wv-heading h2::after/);
  assert.match(css, /width: 104px/);
  assert.match(css, /radial-gradient\(circle, var\(--gold\)/);
  assert.match(css, /direction: rtl/);
  assert.match(css, /font-family: var\(--font, "Vazirmatn"/);
  assert.match(css, /font-size: 17px !important/);
  assert.match(css, /font-weight: 700 !important/);
  assert.match(css, /font-weight: 700/);
});
