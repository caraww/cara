const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const theme = read("css/theme.css");

test("every heading shares one color token", () => {
  assert.match(theme, /--cara-heading:\s*#343b64/);
  assert.match(theme, /--cara-heading-invert:\s*#f6f4fb/);
  assert.match(theme, /:root :is\(h1, h2, h3, h4, h5, h6\) \{ color: var\(--cara-heading\) !important; \}/);
});

test("no page-scoped heading color overrides survive", () => {
  assert.ok(!/--cara-heading:\s*var\(--sf-gold/.test(theme), "footer titles must use the shared heading color");
  assert.ok(!/\.cara-journal__card, \.post-card \{ --cara-heading/.test(theme), "journal cards must use the shared heading color");
});

test("dark surfaces only swap the token, never add a third heading color", () => {
  const scopes = theme.match(/\.hx, \.hero, \.wv-stage, \.pg-hero[^\n]*/);
  assert.ok(scopes, "dark-surface heading scope must exist");
  assert.match(scopes[0], /--cara-heading: var\(--cara-heading-invert\)/);
  assert.ok(!/#[0-9a-f]{3,6}/i.test(scopes[0]), "the dark-surface scope must not hard-code a color");
});
