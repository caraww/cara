const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../js/account.js"), "utf8");

test("account API errors retain their HTTP status for correct auth handling", () => {
  assert.match(source, /error\.status = response\.status/);
  assert.match(source, /if \(error\.status === 401\) await installTelegramLogin\(\)/);
});

test("an authenticated dashboard survives an independent designs or orders request failure", () => {
  assert.match(source, /const results = await Promise\.allSettled\(\[loadDesigns\(\), loadOrders\(\)\]\)/);
  assert.match(source, /results\[0\]\.status === "rejected"/);
  assert.match(source, /results\[1\]\.status === "rejected"/);
  assert.match(source, /dashboard\.hidden = false/);
});

test("opening a saved design handles unavailable browser storage without navigating", () => {
  assert.match(source, /localStorage\.setItem\("cara-pattern", JSON\.stringify\(item\.design\)\)/);
  assert.match(source, /ذخیره‌سازی مرورگر در دسترس نیست/);
});
