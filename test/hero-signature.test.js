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
