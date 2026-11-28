const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const script = path.join(root, "tools", "asset-versions.js");

/* سرویس‌ورکر دارایی‌های ?v= را برای همیشه از کش برمی‌دارد، پس یک توکن کهنه
   یعنی بعضی کاربران تا ابد نسخه‌ی قدیمی CSS/JS را می‌بینند. */
test("every css/js asset is referenced with a single cache token", () => {
  const out = execFileSync(process.execPath, [script, "check", "--no-git"], { cwd: root, encoding: "utf8" });
  assert.match(out, /توکن کش مرتب است/);
});

test("versioned assets exist on disk", () => {
  const pages = ["index.html", "gallery.html", "checkout.html", "builder.html", "upload.html"];
  const ref = /(?:href|src)=["']([^"'?#]*?(?:css|js)\/[^"'?#]+)\?v=[^"'>\s]+/g;
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    for (const m of html.matchAll(ref)) {
      const rel = m[1].replace(/^\.?\//, "");
      assert.ok(fs.existsSync(path.join(root, rel)), `${page} links a missing asset: ${rel}`);
    }
  }
});
