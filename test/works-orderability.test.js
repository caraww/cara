const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const sourceInfo = JSON.parse(fs.readFileSync(path.join(root, "img/works-cutouts/info.json"), "utf8"));
const works = JSON.parse(fs.readFileSync(path.join(root, "data/works.json"), "utf8"));
const browserSource = fs.readFileSync(path.join(root, "js/works.js"), "utf8");
const browserContext = { window: { CARA: {} } };
browserContext.CARA = browserContext.window.CARA;
vm.runInNewContext(browserSource, browserContext);
const browserWorks = JSON.parse(JSON.stringify(browserContext.window.CARA.works));
const baseline = require("./fixtures/works-main-baseline.json");

function sourceMeta(work) {
  const normalize = (value) => String(value).normalize("NFC").replace(/ي/g, "ی").replace(/ك/g, "ک").trim();
  const file = decodeURIComponent(String(work.src).split("?")[0].split("/").pop());
  const fileStem = file.replace(/\.[^.]+$/, "");
  const bySource = Object.entries(sourceInfo).find(([key]) => {
    const keyStem = key.replace(/\.[^.]+$/, "");
    return normalize(keyStem) === normalize(work.id) || normalize(keyStem) === normalize(fileStem);
  });
  return bySource ? bySource[1] : {};
}

function runGalleryOrderPath(workId) {
  const nodes = new Map();
  const node = (id) => {
    if (id === "tagbar") return null; // Stop the unrelated gallery UI setup; the order IIFE below still runs.
    if (!nodes.has(id)) nodes.set(id, {
      style: { display: "" }, textContent: "", href: "",
      addEventListener() {}, querySelectorAll() { return []; },
    });
    return nodes.get(id);
  };
  const apiWorks = baseline.works
    .filter((w) => w.orderable && w.id !== "آلبوم")
    .map((w) => ({ id: w.id, price: w.price || 2127000 }));
  const window = { CARA: { works: browserWorks } };
  const context = {
    window, CARA: window.CARA,
    document: {
      getElementById: node,
      querySelectorAll() { return []; },
      createElement() { return {}; },
      head: { appendChild() {} },
      body: { appendChild() {} },
    },
    location: { hash: "#" + encodeURIComponent(workId), origin: "https://caraw.ir", pathname: "/gallery.html", search: "" },
    localStorage: { getItem() { return null; }, setItem() {} },
    MutationObserver: class { observe() {} },
    fetch: async () => ({ ok: true, json: async () => apiWorks }),
    console: { error() {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/gallery.js"), "utf8"), context);
  return new Promise((resolve) => setImmediate(() => resolve({
    orderDisplay: node("lbOrder").style.display,
    priceText: node("lbPrice").textContent,
  })));
}

test("Album noOrder flag in source metadata matches both generated catalogs", () => {
  assert.ok(works.length > 0);
  assert.equal(browserWorks.length, works.length);
  assert.deepEqual(browserWorks.map((w) => w.id), works.map((w) => w.id));

  for (const work of works) {
    const sourceNoOrder = sourceMeta(work).noOrder === true;
    assert.equal(work.noOrder === true, sourceNoOrder, work.id + " data/works.json");
    const browserWork = browserWorks.find((item) => item.id === work.id);
    assert.ok(browserWork, work.id + " must exist in js/works.js");
    assert.equal(browserWork.noOrder === true, sourceNoOrder, work.id + " js/works.js");
  }

  assert.equal(sourceInfo["آلبوم.JPG"].noOrder, true);
});

test("all non-Album IDs, prices and orderability match the main-branch baseline", () => {
  const currentById = new Map(browserWorks.map((w) => [w.id, w]));
  const baselineById = new Map(baseline.works.map((w) => [w.id, w]));
  assert.equal(currentById.size, baselineById.size, "work count must not change");
  assert.deepEqual([...currentById.keys()].sort(), [...baselineById.keys()].sort());

  for (const [id, before] of baselineById) {
    const after = currentById.get(id);
    const current = {
      id: after.id,
      price: Number.isFinite(after.price) ? after.price : null,
      orderable: after.noOrder !== true,
    };
    if (id === "آلبوم") {
      assert.equal(before.orderable, true, "main baseline should show Album was orderable");
      assert.equal(current.orderable, false, "Album alone becomes non-orderable");
      assert.equal(current.price, before.price, "Album price data must not be changed");
    } else {
      assert.deepEqual(current, before, id + " must remain unchanged");
    }
  }
});

test("the real page generator creates a non-orderable Album page with alternatives", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cara-build-pages-"));
  try {
    for (const dir of ["tools", "lib", "data", "js", "css"]) fs.mkdirSync(path.join(temp, dir), { recursive: true });
    fs.copyFileSync(path.join(root, "tools/build-pages.js"), path.join(temp, "tools/build-pages.js"));
    fs.mkdirSync(path.join(temp, "lib"), { recursive: true });
    fs.copyFileSync(path.join(root, "lib/works-pricing.js"), path.join(temp, "lib/works-pricing.js"));
    fs.copyFileSync(path.join(root, "lib/generated-page-layout.js"), path.join(temp, "lib/generated-page-layout.js"));
    fs.copyFileSync(path.join(root, "lib/works-pricing.js"), path.join(temp, "lib/works-pricing.js"));
    fs.copyFileSync(path.join(root, "js/palette.js"), path.join(temp, "js/palette.js"));
    fs.copyFileSync(path.join(root, "js/beads.js"), path.join(temp, "js/beads.js"));
    fs.copyFileSync(path.join(root, "data/works.json"), path.join(temp, "data/works.json"));
    for (const file of ["index.html", "builder.html", "upload.html", "game.html", "checkout.html", "name-bracelet.html"]) {
      fs.writeFileSync(path.join(temp, file), "<!doctype html><html><body><main></main></body></html>");
    }
    fs.writeFileSync(path.join(temp, "gallery.html"),
      "<!doctype html><html><head><!-- GALLERY-JSON-LD:START --><!-- GALLERY-JSON-LD:END --></head><body><main></main></body></html>");
    const run = spawnSync(process.execPath, ["tools/build-pages.js"], { cwd: temp, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const albumPath = path.join(temp, "bracelet", "آلبوم.html");
    assert.ok(fs.existsSync(albumPath), "generator must create the Album page");
    const html = fs.readFileSync(albumPath, "utf8");
    assert.ok(!html.includes("سفارش این دستبند"), "Album page must not show its direct order CTA");
    assert.ok(!html.includes("checkout.html?work="), "Album page must not link to direct work checkout");
    assert.ok(html.includes('href="/upload.html"'), "Album page must link to photo-to-pattern upload");
    assert.ok(html.includes('href="/builder.html"'), "Album page must link to manual design");
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ldMatch, "generated Album page must include JSON-LD");
    const ld = JSON.parse(ldMatch[1]);
    const product = ld["@graph"].find((entry) => entry["@type"] === "Product");
    assert.ok(product);
    assert.equal(product.offers, undefined, "non-orderable Album must not publish an Offer");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("the actual gallery order-button code hides Album and keeps orderable works visible", async () => {
  const album = await runGalleryOrderPath("آلبوم");
  assert.equal(album.orderDisplay, "none");
  assert.equal(album.priceText, "");

  const orderableId = baseline.works.find((w) => w.orderable && w.id !== "آلبوم").id;
  const orderable = await runGalleryOrderPath(orderableId);
  assert.equal(orderable.orderDisplay, "");
});
