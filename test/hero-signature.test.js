const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage hero uses a minimal signature art direction", () => {
  const html = read("index.html");
  const css = read("css/hero-signature.css");
  assert.match(html, /hero-signature\.css\?v=1/);
  assert.match(html, /id="braceletCanvas"/);
  assert.doesNotMatch(html, /class="fc fc[1-4]/);
  assert.doesNotMatch(html, /class="blob b[12]"/);
  assert.match(css, /\.hero2 \.hero-copy h1 \.gilt\s*\{[^}]*color:\s*#cfae6c/s);
  assert.match(css, /\.hero2 #heroCanvas, \.hero2 \.blob, \.hero2 \.fc, \.hero2 \.hint \{ display: none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});


test("hero bracelet uses dimensional glass-bead rendering and mobile nav is physically left anchored", () => {
  const bracelet = read("js/hero-bracelet.js");
  const polish = read("css/polish.css");
  assert.ok(bracelet.includes("Miyuki Delica"));
  assert.ok(bracelet.includes("c.width=c.height=96"));
  assert.ok(bracelet.includes("x.ellipse(48,50,7.2,10.2"));
  assert.ok(bracelet.includes("Math.min(devicePixelRatio||1,3)"));
  assert.ok(bracelet.includes("createLinearGradient"));
  assert.ok(polish.includes("left:14px !important"));
  assert.ok(polish.includes("right:auto !important"));
  assert.ok(polish.includes("inset-inline-start:auto !important"));
  assert.ok(polish.includes("left:12px !important") && polish.includes("right:auto !important"));
  assert.ok(polish.includes("top:calc(env(safe-area-inset-top, 0px) + 74px)"));
});
