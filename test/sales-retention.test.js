const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Worker wires verified reviews and hashed order tracking before the generic API 404", () => {
  const worker = read("index.js");
  assert.match(worker, /handleReviewRequest/);
  assert.match(worker, /handleTrackRequest/);
  assert.ok(worker.indexOf("handleTrackRequest") < worker.indexOf('p.startsWith("/api/")'));
  assert.match(worker, /\/api\/admin\/system/);
  assert.match(worker, /issueOrderToken\(env, order\.id\)/);
  assert.match(worker, /trackToken/);
});

test("review and tracking migrations keep unique ownership and expiry", () => {
  const reviews = read("migrations/0006_reviews.sql");
  const tokens = read("migrations/0007_order_tokens.sql");
  assert.match(reviews, /UNIQUE \(work_id, user_id, order_id\)/);
  assert.match(reviews, /status IN \('pending', 'approved', 'rejected'\)/);
  assert.match(reviews, /CHECK \(rating BETWEEN 1 AND 5\)/);
  assert.match(tokens, /token_hash TEXT PRIMARY KEY/);
  assert.match(tokens, /expires_at > created_at/);
  assert.match(tokens, /revoked_at/);
});

test("checkout collects gift options and sends them without trusting price fields", () => {
  const html = read("checkout.html");
  const js = read("js/checkout.js");
  assert.match(html, /name="giftWrap"/);
  assert.match(html, /name="hidePrice"/);
  assert.match(html, /name="giftMessage"/);
  assert.match(js, /giftOf/);
  assert.match(js, /gift: giftOf\(f\)/);
  assert.match(js, /gift: giftOf\(fd\)/);
  assert.doesNotMatch(js, /gift.*priceToman/);
});

test("public tracking page is noindex and exposes no customer contact fields", () => {
  const html = read("track.html");
  const js = read("js/track.js");
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /referrer" content="no-referrer"/);
  assert.match(js, /\/api\/track\?t=/);
  assert.doesNotMatch(js, /phone|address|firstName|lastName/);
});

test("gallery and generated work pages mount the review surface", () => {
  const gallery = read("gallery.html");
  const layout = read("lib/generated-page-layout.js");
  const builder = read("tools/build-pages.js");
  assert.match(gallery, /id="lbReviews" data-reviews/);
  assert.match(gallery, /js\/reviews\.js/);
  assert.match(layout, /reviews\.js/);
  assert.match(layout, /reviews\.css/);
  assert.match(builder, /data-reviews data-work=/);
  assert.match(builder, /data-share-work/);
  assert.match(layout, /work-share\.js/);
});

test("account order actions cover tracking, reorder, and verified reviews", () => {
  const js = read("js/account.js");
  assert.match(js, /track\.html\?t=/);
  assert.match(js, /review\.href = "\/bracelet\//);
  assert.match(js, /سفارش دوباره/);
  assert.match(js, /checkout\.html\?work=/);
  assert.match(js, /workSlug/);
});

test("wishlist syncs across devices for signed-in customers", () => {
  assert.match(read("migrations/0008_favorites.sql"), /CREATE TABLE IF NOT EXISTS user_favorites/);
  assert.match(read("lib/accounts.mjs"), /\/api\/account\/favorites/);
  assert.match(read("js/gallery.js"), /mergeRemoteFavs/);
  assert.match(read("js/gallery.js"), /syncFav\(/);
});

test("daily challenge, wrist-size helper, and admin review moderation are present", () => {
  assert.match(read("game.html"), /id="daily"/);
  assert.match(read("game.html"), /js\/daily\.js/);
  assert.match(read("size.html"), /js\/size\.js/);
  assert.match(read("admin.html"), /admin-reviews\.html/);
  assert.match(read("admin-reviews.html"), /\/api\/admin\/reviews/);
});

test("private admin pages do not load the public analytics bridge", () => {
  for (const file of ["admin.html", "customers.html", "challenge-admin.html", "admin-reviews.html"]) {
    assert.doesNotMatch(read(file), /js\/analytics\.js/, file + " must stay analytics-free");
  }
});

test("deploy metadata reports the Worker version and CI tag", () => {
  assert.match(read("wrangler.jsonc"), /version_metadata/);
  assert.match(read(".github/workflows/deploy-worker.yml"), /deploy --tag "\$GITHUB_SHA"/);
  assert.match(read("index.js"), /\/api\/version/);
  assert.match(read(".github/workflows/deploy-drift.yml"), /PRODUCTION_URL/);
});

test("PWA shortcuts, RSS feed, and crawl directives cover the new surfaces", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.ok(manifest.shortcuts.some((item) => item.url.startsWith("/builder.html")));
  assert.ok(manifest.shortcuts.some((item) => item.url.startsWith("/gallery.html")));
  assert.ok(manifest.shortcuts.some((item) => item.url.startsWith("/track.html")));
  const feed = read("feed.xml");
  assert.match(feed, /<rss version="2.0"/);
  assert.equal((feed.match(/<item>/g) || []).length, 4);
  assert.match(read("blog/index.html"), /href="\/feed\.xml"/);
  const robots = read("robots.txt");
  assert.match(robots, /Disallow: \/track\.html/);
  assert.match(robots, /Disallow: \/admin-reviews\.html/);
  assert.match(robots, /Feed: https:\/\/caraw\.ir\/feed\.xml/);
});
