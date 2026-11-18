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
    const srcIndex = html.indexOf(logo.src);
    assert.notEqual(srcIndex, -1, `homepage should include ${logo.src}`);
    const tagStart = html.lastIndexOf("<img", srcIndex);
    const tagEnd = html.indexOf(">", srcIndex);
    assert.ok(tagStart !== -1 && tagEnd !== -1, `could not locate img tag for ${logo.src}`);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.match(tag, new RegExp(`\\bwidth="${logo.width}"`));
    assert.match(tag, new RegExp(`\\bheight="${logo.height}"`));
  }
});
