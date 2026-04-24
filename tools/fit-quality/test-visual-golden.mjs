import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFitGoldenSuite } from "./run-fit-golden.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportDirectory = path.join(moduleDirectory, "reports");

const passReport = await runFitGoldenSuite({
  fixturePath: "./fixtures/visual-golden-pass.json",
  reportPath: path.join(reportDirectory, "visual-golden-pass.latest.json"),
});

assert.equal(passReport.overallStatus, "passed");

const failReport = await runFitGoldenSuite({
  fixturePath: "./fixtures/visual-golden-fail.json",
  reportPath: path.join(reportDirectory, "visual-golden-fail.latest.json"),
});

assert.equal(failReport.overallStatus, "failed");
assert.ok(failReport.summary.failureCodes.includes("visible-critical-penetration-max"));
assert.ok(failReport.summary.failureCodes.includes("visible-penetration-p95"));
assert.ok(failReport.summary.failureCodes.includes("forbidden-visible-body-mask"));
assert.ok(failReport.summary.failureCodes.includes("sandals-visible-foot-mask"));

process.stdout.write(
  `${JSON.stringify({
    script: "test-visual-golden",
    passFixture: passReport.fixtureId,
    passStatus: passReport.overallStatus,
    failFixture: failReport.fixtureId,
    failStatus: failReport.overallStatus,
    failureCodes: failReport.summary.failureCodes,
  }, null, 2)}\n`,
);

