const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Cloudflare Worker production deploy is gated, scoped, and dry-run first", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "deploy-worker.yml"), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_deploy == 'DEPLOY'/);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /branches:\s*\n\s+- main/);
  assert.match(workflow, /paths:\s*\n[\s\S]*?index\.js[\s\S]*?lib\/\*\*/);
  assert.match(workflow, /wrangler@4 deploy --dry-run/);
  const deployAt = workflow.search(/wrangler@4 deploy(?: --tag [^\n]+)?\n/);
  assert.ok(workflow.indexOf("wrangler@4 deploy --dry-run") < deployAt);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /vars\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /^\s*pull_request:/m);
});
