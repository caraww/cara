import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const braceletCss = readFileSync(new URL("../css/bracelet-pages.css", import.meta.url), "utf8");
const tokensCss = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");

test("bracelet pages keep the page and product image plates white", () => {
  assert.match(braceletCss, /html body \{\s*background: #ffffff;/);
  assert.match(braceletCss, /html body \.pg-img img \{[^}]*background: #ffffff;/);
});

test("the light theme page background token is white", () => {
  assert.match(tokensCss, /--cara-bg: #FFFFFF;/);
});
