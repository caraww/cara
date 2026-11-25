const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const works = JSON.parse(fs.readFileSync(path.join(root, "data/works.json"), "utf8"));

function localPath(url) {
  return path.join(root, decodeURIComponent(String(url).split("?")[0]));
}

test("all bracelet gallery and detail images use committed WebP derivatives", () => {
  assert.ok(works.length > 0, "work catalog should not be empty");

  for (const work of works) {
    assert.match(work.src, /^img\/works-view\/.*\.webp(?:\?|$)/, `${work.id} detail image should use WebP`);
    assert.match(work.thumb, /^img\/works-thumbs\/.*\.webp(?:\?|$)/, `${work.id} thumbnail should use WebP`);
    assert.ok(fs.existsSync(localPath(work.src)), `missing detail WebP for ${work.id}`);
    assert.ok(fs.existsSync(localPath(work.thumb)), `missing thumbnail WebP for ${work.id}`);

    for (const key of ["thumb240", "thumb480"]) {
      assert.match(work[key], /^img\/works-thumbs\/.*\.webp(?:\?|$)/, `${work.id} ${key} should be WebP`);
      assert.ok(fs.existsSync(localPath(work[key])), `missing ${key} for ${work.id}`);
    }
    assert.ok(work.thumb240 && work.thumb480, `${work.id} should expose responsive thumbnails`);

    assert.ok(work.source, `${work.id} should retain its original source image`);
    assert.match(work.source, /^img\/works-cutouts\//, `${work.id} original source should remain in works-cutouts`);
    assert.ok(fs.existsSync(localPath(work.source)), `missing original source for ${work.id}`);

    for (const image of work.images || []) {
      assert.match(image, /^img\/works-view\/.*\.webp(?:\?|$)/, `${work.id} gallery alternate should use WebP`);
      assert.ok(fs.existsSync(localPath(image)), `missing alternate WebP for ${work.id}`);
    }
  }
});

test("gallery cards advertise responsive thumbnail candidates", () => {
  const gallery = fs.readFileSync(path.join(root, "js/gallery.js"), "utf8");
  assert.match(gallery, /thumb240/);
  assert.match(gallery, /srcset=/);
  assert.match(gallery, /sizes="\(max-width:560px\) 44vw/);
});

test("the image builder keeps originals for photo-to-pattern and versions generated WebP URLs", () => {
  const source = fs.readFileSync(path.join(root, "tools/build-works.js"), "utf8");
  assert.match(source, /source: original/);
  assert.match(source, /enc\(d\.view\) \+ "\?v=" \+ STAMP/);
  assert.match(source, /enc\(d0\.thumb\) \+ "\?v=" \+ STAMP/);
});

test("the gallery build prefers transparent cutouts so cream cards stay clean", () => {
  const source = fs.readFileSync(path.join(root, "tools/build-works.js"), "utf8");
  assert.match(source, /const DIR = process\.env\.CARA_USE_ORIGINAL === "1" \|\| !fs\.existsSync\(TRANSPARENT_DIR\) \? ORIGINAL_DIR : TRANSPARENT_DIR/);
});
