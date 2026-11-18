const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("homepage logo images declare intrinsic dimensions to prevent layout shift", () => {
  const logos = [
    { src: "cara-logo-light.png", width: 542, height: 176 },
    { src: "cara-logo.png", width: 542, height: 176 },
    { src: "cara-logo-fa-light.png", width: 395, height: 176 },
  ];

  for (const logo of logos) {
    const tag = html.match(new RegExp(`<img\\b(?=[^>]*src="[^"]*${logo.src}")[^>]*>`, "s"));
    assert.ok(tag, `homepage should include ${logo.src}`);
    assert.match(tag[0], new RegExp(`\\bwidth="${logo.width}"`));
    assert.match(tag[0], new RegExp(`\\bheight="${logo.height}"`));
  }
});
