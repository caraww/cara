import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const braceletCss = readFileSync(new URL("../css/bracelet-pages.css", import.meta.url), "utf8");
const tokensCss = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
const homeCss = readFileSync(new URL("../css/home.css", import.meta.url), "utf8");

test("bracelet pages keep the page and product image plates white", () => {
  assert.match(braceletCss, /html body \{\s*background: #ffffff;/);
  assert.match(braceletCss, /html body \.pg-img img \{[^}]*background: #ffffff;/);
});

test("the light theme page background token is white", () => {
  assert.match(tokensCss, /--cara-bg: #FFFFFF;/);
});

test("the day-mode mobile order bar is white again", () => {
  assert.match(braceletCss, /html body \.pg-cta \{[^}]*background: rgba\(255, 255, 255, \.96\)/);
  assert.match(braceletCss, /html body \.pg-cta__info b \{[^}]*color: #28243d;/);
  assert.match(braceletCss, /html\[data-theme="dark"\] body \.pg-cta \{[^}]*background: rgba\(36, 29, 49, \.97\)/);
});

test("home bracelet cards are fully white with dark names in light mode", () => {
  assert.match(homeCss, /--paper-2:#ffffff/);
  assert.match(homeCss, /html:not\(\[data-theme="dark"\]\) \.mini-gal > a \{[^}]*background: #fff !important;/);
  assert.match(homeCss, /html:not\(\[data-theme="dark"\]\) \.mini-gal > a b \{ color: #221a2c; \}/);
});
