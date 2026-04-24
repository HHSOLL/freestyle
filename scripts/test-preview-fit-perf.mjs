import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFitGoldenSuite } from "../tools/fit-quality/run-fit-golden.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportDirectory = path.join(scriptDirectory, "../tools/fit-quality/reports");
const fixtureDirectory = path.join(scriptDirectory, "../tools/fit-quality/fixtures");

const passReport = await runFitGoldenSuite({
  fixturePath: path.join(fixtureDirectory, "preview-fit-perf-pass.json"),
  reportPath: path.join(reportDirectory, "preview-fit-perf-pass.latest.json"),
});

assert.equal(passReport.overallStatus, "passed");

const failReport = await runFitGoldenSuite({
  fixturePath: path.join(fixtureDirectory, "preview-fit-perf-fail.json"),
  reportPath: path.join(reportDirectory, "preview-fit-perf-fail.latest.json"),
});

assert.equal(failReport.overallStatus, "failed");
assert.ok(failReport.summary.failureCodes.includes("preview-p95-latency"));
assert.ok(failReport.summary.failureCodes.includes("hq-cache-hit-p95-latency"));

const carryForwardReport = await runFitGoldenSuite({
  fixturePath: path.join(fixtureDirectory, "preview-fit-perf-carry-forward.json"),
  reportPath: path.join(reportDirectory, "preview-fit-perf-carry-forward.latest.json"),
});

assert.equal(carryForwardReport.overallStatus, "carry-forward");
assert.equal(carryForwardReport.hardwareGpuLane.status, "carry-forward");
assert.equal(carryForwardReport.hardwareGpuLane.required, true);
assert.equal(carryForwardReport.hardwareGpuLane.supported, false);

process.stdout.write(
  `${JSON.stringify({
    script: "test-preview-fit-perf",
    passFixture: passReport.fixtureId,
    passStatus: passReport.overallStatus,
    failFixture: failReport.fixtureId,
    failStatus: failReport.overallStatus,
    carryForwardFixture: carryForwardReport.fixtureId,
    carryForwardStatus: carryForwardReport.overallStatus,
    carryForwardReportPath: carryForwardReport.reportPath,
  }, null, 2)}\n`,
);
