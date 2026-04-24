import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runRuntimeStabilitySuite } from "./run-runtime-stability.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportDirectory = path.join(moduleDirectory, "reports");

const passReport = await runRuntimeStabilitySuite({
  fixturePath: "./fixtures/context-loss-pass.json",
  reportPath: path.join(reportDirectory, "context-loss-pass.latest.json"),
});

assert.equal(passReport.overallStatus, "passed");

const failReport = await runRuntimeStabilitySuite({
  fixturePath: "./fixtures/context-loss-fail.json",
  reportPath: path.join(reportDirectory, "context-loss-fail.latest.json"),
});

assert.equal(failReport.overallStatus, "failed");
assert.ok(failReport.summary.failureCodes.includes("context-loss"));

process.stdout.write(
  `${JSON.stringify({
    script: "test-context-loss",
    passFixture: passReport.fixtureId,
    passStatus: passReport.overallStatus,
    failFixture: failReport.fixtureId,
    failStatus: failReport.overallStatus,
    failureCodes: failReport.summary.failureCodes,
  }, null, 2)}\n`,
);

