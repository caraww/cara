const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkedFetch, buildFonts } = require("../tools/self-host-fonts.js");

const response = (body, { ok = true, status = 200, type = "font/woff2" } = {}) => ({
  ok,
  status,
  headers: { get: (name) => name.toLowerCase() === "content-type" ? type : null },
  arrayBuffer: async () => Buffer.from(body),
});
const validWoff2 = Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(64, 1)]);

test("checkedFetch rejects HTTP errors before reading or writing content", async () => {
  await assert.rejects(
    checkedFetch("https://example.test/font.woff2", {}, "font", async () => response("not found", { ok: false, status: 404 })),
    /HTTP 404/,
  );
});

test("checkedFetch validates CSS and WOFF2 content types and signatures", async () => {
  await assert.rejects(
    checkedFetch("https://example.test/fonts.css", {}, "css", async () => response("@font-face{}", { type: "text/html" })),
    /نوع محتوای CSS نامعتبر/,
  );
  await assert.rejects(
    checkedFetch("https://example.test/font.woff2", {}, "font", async () => response("html error", { type: "text/html" })),
    /نوع محتوای فونت نامعتبر/,
  );
  await assert.rejects(
    checkedFetch("https://example.test/font.woff2", {}, "font", async () => response("not a woff2")),
    /امضای فایل WOFF2 معتبر نیست/,
  );
  const result = await checkedFetch("https://example.test/font.woff2", {}, "font", async () => response(validWoff2));
  assert.equal(result.buffer.subarray(0, 4).toString("ascii"), "wOF2");
});

test("buildFonts stages all downloads before replacing files and updates HTML only after success", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cara-font-build-"));
  const cssUrl = "https://example.test/fonts.css";
  const fontUrl = "https://example.test/vazirmatn.woff2";
  const css = `/* arabic */
@font-face { font-family: Vazirmatn; font-style: normal; font-weight: 400; src: url(${fontUrl}) format('woff2'); }`;
  try {
    fs.writeFileSync(path.join(root, "index.html"), '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Vazirmatn" rel="stylesheet">');
    const result = await buildFonts({
      root,
      cssUrl,
      fetchImpl: async (url) => url === cssUrl ? response(css, { type: "text/css" }) : response(validWoff2),
    });
    assert.deepEqual(result, { fontCount: 1, touched: 1 });
    assert.ok(fs.statSync(path.join(root, "fonts", "vazirmatn-arabic-400.woff2")).size > 4);
    assert.match(fs.readFileSync(path.join(root, "css", "fonts.css"), "utf8"), /\/fonts\/vazirmatn-arabic-400\.woff2/);
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(html, /\/css\/fonts\.css/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("failed font downloads leave existing font and HTML files untouched", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cara-font-fail-"));
  const cssUrl = "https://example.test/fonts.css";
  const fontUrl = "https://example.test/missing.woff2";
  const css = `/* arabic */
@font-face { font-family: Vazirmatn; font-style: normal; font-weight: 400; src: url(${fontUrl}) format('woff2'); }`;
  try {
    fs.mkdirSync(path.join(root, "fonts"));
    fs.writeFileSync(path.join(root, "fonts", "existing.woff2"), "keep");
    fs.writeFileSync(path.join(root, "index.html"), '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn" rel="stylesheet">');
    await assert.rejects(buildFonts({
      root,
      cssUrl,
      fetchImpl: async (url) => url === cssUrl ? response(css, { type: "text/css" }) : response("404", { ok: false, status: 404 }),
    }), /HTTP 404/);
    assert.equal(fs.readFileSync(path.join(root, "fonts", "existing.woff2"), "utf8"), "keep");
    assert.ok(!fs.existsSync(path.join(root, "css", "fonts.css")));
    assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /fonts\.googleapis\.com/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
