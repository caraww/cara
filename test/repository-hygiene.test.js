import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("installed npm dependencies stay out of version control", () => {
  const tracked = execFileSync("git", ["ls-files", "node_modules"], { encoding: "utf8" }).trim();
  assert.equal(tracked, "");
  assert.doesNotThrow(() =>
    execFileSync("git", ["check-ignore", "-q", "node_modules/.cara-ignore-probe"])
  );
});
