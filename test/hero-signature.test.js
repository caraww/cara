const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero uses a minimal signature art direction", () => {
  const html = read("index.html");
  const css = read("css/hero-signature.css");
  assert.ok(html.includes("hero-signature.css?v=4"));
  assert.match(html, /id="caraBraceletLineup"/);
  assert.doesNotMatch(html, /class="fc fc[1-4]/);
  assert.doesNotMatch(html, /class="blob b[12]"/);
  assert.match(css, /\.hero2 \.hero-copy h1 \.gilt\s*\{[^}]*color:\s*#cfae6c/s);
  assert.match(css, /\.hero2 #heroCanvas, \.hero2 \.blob, \.hero2 \.fc, \.hero2 \.hint \{ display: none/);
  assert.match(css, /content: "دست‌ساز با امضای تو"/);
  assert.match(css, /border-radius: 999px/);
  assert.match(css, /font-family: "Vazirmatn"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});


test("legacy hero canvas stays hidden while mobile navigation remains left anchored", () => {
  const html = read("index.html");
  const polish = read("css/polish.css");
  assert.match(html, /id="braceletCanvas"[^>]*hidden/);
  assert.ok(polish.includes("left:14px !important"));
  assert.ok(polish.includes("right:auto !important"));
  assert.ok(polish.includes("inset-inline-start:auto !important"));
  assert.ok(polish.includes("left:12px !important") && polish.includes("right:auto !important"));
  assert.ok(polish.includes("top:calc(env(safe-area-inset-top, 0px) + 74px)"));
});


test("homepage hero keeps bracelet and copy side by side on desktop and compact on mobile", () => {
  const html = read("index.html");
  const css = read("css/hero-signature.css");
  assert.ok(html.includes("hero-signature.css?v=4"));
  assert.ok(css.includes("grid-template-columns: minmax(0, .94fr) minmax(0, 1.06fr)"));
  assert.ok(css.includes("text-align: right;"));
  assert.ok(css.includes("padding: 76px 18px 20px;"));
  assert.ok(css.includes("width:min(78vw,300px)"));
  assert.ok(css.includes("width:min(100%,300px,44vh) !important"));
});


test("mobile bracelet lineup final sizing overrides lineup CSS and uses a fresh stylesheet URL", () => {
  const html = read("index.html");
  const css = read("css/hero-signature.css");
  assert.ok(html.includes("/css/hero-signature.css?v=4"));
  assert.ok(html.indexOf("css/hero-lineup.css?v=4") < html.indexOf("/css/hero-signature.css?v=4"));
  assert.match(css, /\.hero2 \.cara-bracelet-lineup\s*\{[^}]*width:min\(100%,360px\) !important;/s);
  assert.match(css, /\.hero2 \.cara-bracelet-lineup__viewport\s*\{[^}]*width:min\(88vw,340px,44svh\) !important;/s);
});
