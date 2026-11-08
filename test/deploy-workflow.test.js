const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Cloudflare Worker production deploy is manual, gated, and dry-run first", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "deploy-worker.yml"), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_deploy == 'DEPLOY'/);
  assert.match(workflow, /wrangler@4 deploy --dry-run/);
  assert.ok(workflow.indexOf("wrangler@4 deploy --dry-run") < workflow.indexOf("wrangler@4 deploy\n"));
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /vars\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
});
