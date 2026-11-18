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

    assert.ok(work.source, `${work.id} should retain its original source image`);
    assert.match(work.source, /^img\/works-cutouts\//, `${work.id} original source should remain in works-cutouts`);
    assert.ok(fs.existsSync(localPath(work.source)), `missing original source for ${work.id}`);

    for (const image of work.images || []) {
      assert.match(image, /^img\/works-view\/.*\.webp(?:\?|$)/, `${work.id} gallery alternate should use WebP`);
      assert.ok(fs.existsSync(localPath(image)), `missing alternate WebP for ${work.id}`);
    }
  }
});

test("the image builder keeps originals for photo-to-pattern and versions generated WebP URLs", () => {
  const source = fs.readFileSync(path.join(root, "tools/build-works.js"), "utf8");
  assert.match(source, /source: original/);
  assert.match(source, /enc\(d\.view\) \+ "\?v=" \+ STAMP/);
  assert.match(source, /enc\(d0\.thumb\) \+ "\?v=" \+ STAMP/);
});
