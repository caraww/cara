const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { selfHostFonts } = require("../tools/self-host-fonts.js");

const css = "/* latin */ @font-face { font-family: Vazirmatn; font-style: normal; font-weight: 400; src: url(https://fonts.example/font.woff2) format('woff2'); }";
const ok = (body) => ({
  ok: true, status: 200,
  text: async () => body,
  arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
});
const fail = (status) => ({ ok: false, status, text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) });
const tempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "cara-fonts-"));

test("validates HTTP status and WOFF2 signature before writing or touching HTML", async () => {
  const root = tempRoot();
  try {
    fs.writeFileSync(path.join(root, "index.html"), '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Vazirmatn" rel="stylesheet">');
    await assert.rejects(() => selfHostFonts({ root, fetchImpl: async () => fail(503) }), /HTTP 503/);
    assert.equal(fs.existsSync(path.join(root, "css/fonts.css")), false);
    assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /fonts.googleapis.com/);
    let calls = 0;
    await assert.rejects(() => selfHostFonts({ root, fetchImpl: async () => (++calls === 1 ? ok(css) : ok(Buffer.from("not a font"))) }), /WOFF2 معتبر نیست/);
    assert.equal(fs.existsSync(path.join(root, "css/fonts.css")), false);
    assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /fonts.googleapis.com/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("writes verified font files and rewrites Google Fonts links only after all downloads succeed", async () => {
  const root = tempRoot();
  try {
    const html = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Vazirmatn" rel="stylesheet">';
    fs.writeFileSync(path.join(root, "index.html"), html);
    const font = Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(256)]);
    let calls = 0;
    const result = await selfHostFonts({ root, fetchImpl: async () => (++calls === 1 ? ok(css) : ok(font)) });
    assert.deepEqual(result, { fontFiles: 1, pages: 1 });
    assert.equal(fs.readFileSync(path.join(root, "fonts/vazirmatn-latin-400.woff2")).subarray(0, 4).toString(), "wOF2");
    assert.match(fs.readFileSync(path.join(root, "css/fonts.css"), "utf8"), /\/fonts\/vazirmatn-latin-400.woff2/);
    const updated = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(updated, /\/css\/fonts.css/);
    assert.doesNotMatch(updated, /fonts\.(googleapis|gstatic)\.com/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("primary Persian font is preloaded on all main customer pages", () => {
  for (const page of ["index.html", "builder.html", "upload.html", "gallery.html", "checkout.html", "game.html", "name-bracelet.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    assert.match(html, /<link\\b(?=[^>]*\\brel="preload")(?=[^>]*\\bas="font")(?=[^>]*\\bhref="\\/fonts\\/vazirmatn-arabic-400\\.woff2")[^>]*>/s, page + " font preload");
    assert.match(html, /href="\/?css\/fonts\.css"/, page + " local font stylesheet");
  }
});
