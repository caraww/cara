const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../js/account.js"), "utf8");

test("account API errors retain their HTTP status for correct auth handling", () => {
  assert.match(source, /error\.status = response\.status/);
  assert.match(source, /if \(error\.status === 401\) await installTelegramLogin\(\)/);
});

test("an authenticated dashboard remains visible while profile, designs, and orders load independently", () => {
  assert.match(source, /await Promise\.allSettled\(\[loadProfile\(\), loadDesigns\(\), loadOrders\(\)\]\)/);
  assert.match(source, /dashboard\.hidden = false/);
  assert.match(source, /catch \(error\) \{ message\("designMessage", error\.message\); return; \}/);
  assert.match(source, /catch \(error\) \{ message\("ordersMessage", error\.message\); return; \}/);
  assert.match(source, /\$\("profileForm"\)\.addEventListener\("submit"/);
});

test("opening a saved design handles unavailable browser storage without navigating", () => {
  assert.match(source, /localStorage\.setItem\("cara-pattern", JSON\.stringify\(item\.design\)\)/);
  assert.match(source, /ذخیره‌سازی مرورگر در دسترس نیست/);
});

test("non-authentication account API failures show an error instead of starting Telegram login", () => {
  assert.match(source, /else message\("loginMessage", error\.message/);
  assert.match(source, /return;\s*\}\s*user = data\.user/);
});
