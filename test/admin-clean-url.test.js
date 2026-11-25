import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");
const packaging = readFileSync(new URL("../tools/package-static.js", import.meta.url), "utf8");

test("/admin resolves to the admin panel instead of a 404", () => {
  assert.match(page, /http-equiv="refresh" content="0; url=\/admin\.html"/);
  assert.match(page, /location\.replace\("\/admin\.html"/);
  assert.match(page, /noindex/);
  assert.match(packaging, /const dirs = \["admin",/);
});
