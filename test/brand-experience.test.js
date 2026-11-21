const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === ".git" || entry.name === "node_modules") return [];
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

test("public HTML pages contain no unsupported messaging links", () => {
  const files = walk(root).filter((file) => file.endsWith(".html"));
  const offenders = files.flatMap((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /wa\.me|whats.?app|واتساپ/i.test(source) ? [path.relative(root, file)] : [];
  });
  assert.deepEqual(offenders, [], "remove unsupported messaging links from every public page");
});

test("shared page generators and floating contact offer Instagram and phone only", () => {
  for (const file of [
    "lib/site-footer.js",
    "lib/generated-page-layout.js",
    "tools/build-pages.js",
    "tools/build-categories.js",
    "tools/build-blog-extra.js",
    "js/contact.js",
  ]) {
    assert.doesNotMatch(read(file), /wa\.me|whats.?app|واتساپ/i, file);
  }
  const footer = read("lib/site-footer.js");
  assert.match(footer, /instagram\.com\/\_\.caraw/);
  assert.match(footer, /tel:\+989352528201/);
});

test("bracelet matcher respects the budget ranges shown to visitors", () => {
  const html = read("quiz.html");
  const js = read("js/quiz.js");
  assert.match(html, /تا ۸۰۰ هزار تومان/);
  assert.match(html, /تا ۱٫۵ میلیون تومان/);
  assert.match(js, /answers\.budget === "low" \? 800000 : answers\.budget === "mid" \? 1500000 : Infinity/);
});

test("quiz and content-page buttons share consistent shape, states, and focus treatment", () => {
  const css = read("css/premium.css");
  assert.match(css, /\.quiz__btn[\s\S]*?border-radius: 999px/);
  assert.match(css, /\.quiz__btn--primary/);
  assert.match(css, /\.quiz__btn:disabled/);
  assert.match(css, /:where\(a, button, input, select, textarea, summary, \[tabindex\]\):focus-visible/);
  assert.match(css, /\.quiz__opt\[aria-pressed="true"\]/);
});
