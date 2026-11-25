import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pages = [
  "starter.html",
  ...fs.readdirSync(path.join(root, "bracelet")).filter((f) => f.endsWith(".html")).map((f) => `bracelet/${f}`),
  ...fs.readdirSync(path.join(root, "colors")).filter((f) => f.endsWith(".html")).map((f) => `colors/${f}`),
];

test("generated pages keep titles, descriptions and image boxes within limits", () => {
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, " ").trim() || "";
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || "";
    assert.ok([...title].length <= 60, `${rel}: title is ${[...title].length} chars`);
    assert.ok([...desc].length <= 165, `${rel}: description is ${[...desc].length} chars`);
    for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
      assert.match(tag, /\bwidth=/i, `${rel}: image missing width`);
      assert.match(tag, /\bheight=/i, `${rel}: image missing height`);
    }
  }
});
