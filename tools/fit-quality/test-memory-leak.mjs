import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runRuntimeStabilitySuite } from "./run-runtime-stability.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportDirectory = path.join(moduleDirectory, "reports");

const passReport = await runRuntimeStabilitySuite({
  fixturePath: "./fixtures/memory-leak-pass.json",
  reportPath: path.join(reportDirectory, "memory-leak-pass.latest.json"),
});

assert.equal(passReport.overallStatus, "passed");

const failReport = await runRuntimeStabilitySuite({
  fixturePath: "./fixtures/memory-leak-fail.json",
  reportPath: path.join(reportDirectory, "memory-leak-fail.latest.json"),
});

assert.equal(failReport.overallStatus, "failed");
assert.ok(failReport.summary.failureCodes.includes("memory-growth-max"));

process.stdout.write(
  `${JSON.stringify({
    script: "test-memory-leak",
    passFixture: passReport.fixtureId,
    passStatus: passReport.overallStatus,
    failFixture: failReport.fixtureId,
    failStatus: failReport.overallStatus,
    failureCodes: failReport.summary.failureCodes,
  }, null, 2)}\n`,
);

