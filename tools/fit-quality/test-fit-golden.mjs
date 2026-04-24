import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFitGoldenSuite } from "./run-fit-golden.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportDirectory = path.join(moduleDirectory, "reports");

const passReport = await runFitGoldenSuite({
  fixturePath: "./fixtures/fit-golden-pass.json",
  reportPath: path.join(reportDirectory, "fit-golden-pass.latest.json"),
});

assert.equal(passReport.overallStatus, "passed");
assert.deepEqual(passReport.summary.failureCodes, []);
assert.equal(passReport.coverage.bodyMatrix.complete, true);
assert.equal(passReport.coverage.poseMatrix.complete, true);

const failReport = await runFitGoldenSuite({
  fixturePath: "./fixtures/fit-golden-fail.json",
  reportPath: path.join(reportDirectory, "fit-golden-fail.latest.json"),
});

assert.equal(failReport.overallStatus, "failed");
assert.ok(failReport.summary.failureCodes.includes("golden-body-matrix-coverage"));
assert.ok(failReport.summary.failureCodes.includes("visible-penetration-p95"));

process.stdout.write(
  `${JSON.stringify({
    script: "test-fit-golden",
    passFixture: passReport.fixtureId,
    passStatus: passReport.overallStatus,
    failFixture: failReport.fixtureId,
    failStatus: failReport.overallStatus,
  }, null, 2)}\n`,
);

