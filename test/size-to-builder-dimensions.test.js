const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

const sizeHtml = fs.readFileSync(path.join(root, "size.html"), "utf8");
const sizeJs = fs.readFileSync(path.join(root, "js/size.js"), "utf8");
const builderJs = fs.readFileSync(path.join(root, "js/builder.js"), "utf8");

test("size helper links to the builder with the computed bead count as the length", () => {
  assert.match(sizeJs, /\/builder\.html\?w=\d+&h=\$\{result\.rows\}/);
});

test("builder applies the size link dimensions before a saved pattern", () => {
  const sizeBranch = builderJs.indexOf("else if (sizeLink)");
  const savedBranch = builderJs.indexOf("else if (saved)");
  assert.ok(sizeBranch > 0, "builder must keep a size-link branch");
  assert.ok(savedBranch > sizeBranch, "size-link dimensions must win over the saved pattern");
  assert.match(builderJs, /qp\.has\("w"\)/);
});

test("builder keeps the previous artwork when the length changes", () => {
  assert.match(builderJs, /Math\.min\(saved\.height, h\)/);
  assert.match(builderJs, /Math\.min\(saved\.width, w\)/);
});

test("builder does not shadow window.history with the undo stack", () => {
  assert.ok(!/(?<!window\.)history\.replaceState/.test(builderJs));
});

test("size page buttons stay compact and full width on mobile", () => {
  assert.match(sizeHtml, /\.size-wrap \.btn \{ min-height: 48px/);
  assert.match(sizeHtml, /\.btns \{ display: grid; grid-template-columns: 1fr/);
  assert.match(sizeHtml, /body \{ font-size: 16px; \}/);
});
