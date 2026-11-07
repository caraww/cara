const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");

test("build-works preserves unrelated files and writes WebP thumb/view paths", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cara-image-build-"));
  try {
    for (const dir of ["tools", "img/works-cutouts", "img/works-thumbs", "img/works-view", "js", "data"]) {
      fs.mkdirSync(path.join(temp, dir), { recursive: true });
    }
    fs.copyFileSync(path.join(root, "tools/build-works.js"), path.join(temp, "tools/build-works.js"));
    fs.writeFileSync(path.join(temp, "img/works-cutouts", "نمونه.png"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#b8975a"/></svg>');
    fs.writeFileSync(path.join(temp, "img/works-cutouts", "info.json"),
      JSON.stringify({ "نمونه.png": { note: "نمونه", price: 1000, tags: ["تست"] } }));
    fs.writeFileSync(path.join(temp, "img/works-thumbs", "unrelated.keep"), "keep thumb");
    fs.writeFileSync(path.join(temp, "img/works-thumbs", "stale.webp"), "old generated asset");
    fs.writeFileSync(path.join(temp, "img/works-view", "unrelated.keep"), "keep view");
    fs.writeFileSync(path.join(temp, "img/works-view", "stale.webp"), "old generated asset");
    fs.writeFileSync(path.join(temp, "index.html"), '<script src="js/works.js?v=old"></script>');
    fs.writeFileSync(path.join(temp, "gallery.html"), '<script src="js/works.js?v=old"></script>');

    const run = spawnSync(process.execPath, ["tools/build-works.js"], {
      cwd: temp,
      encoding: "utf8",
      env: { ...process.env, NODE_PATH: path.join(root, "node_modules"), CARA_REQUIRE_SHARP: "1" },
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);

    for (const dir of ["img/works-thumbs", "img/works-view"]) {
      assert.equal(fs.readFileSync(path.join(temp, dir, "unrelated.keep"), "utf8"), dir.endsWith("thumbs") ? "keep thumb" : "keep view");
      assert.equal(fs.readFileSync(path.join(temp, dir, "stale.webp"), "utf8"), "old generated asset");
      assert.ok(fs.statSync(path.join(temp, dir, "نمونه.webp")).size > 0);
    }
    const works = JSON.parse(fs.readFileSync(path.join(temp, "data/works.json"), "utf8"));
    assert.equal(works.length, 1);
    assert.match(works[0].src, /^img\/works-view\/.*\.webp\?v=/);
    assert.match(works[0].thumb, /^img\/works-thumbs\/.*\.webp\?v=/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("homepage does not preload an image unused by the canvas hero", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /hero-bracelet-optimized\\.webp/);
});
