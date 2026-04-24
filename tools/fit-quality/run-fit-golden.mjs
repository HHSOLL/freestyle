import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCategoryThresholds, isSupportedFitQualityCategory } from "./category-thresholds.mjs";
import { evaluateGoldenCase } from "./compute-metrics.mjs";
import { validateGoldenBodyCoverage } from "./golden-body-matrix.mjs";
import { validateGoldenPoseCoverage } from "./golden-pose-matrix.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, "utf8"));
}

async function writeJson(targetPath, payload) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function resolveInputPath(targetPath) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  const cwdPath = path.resolve(process.cwd(), targetPath);
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return path.resolve(moduleDirectory, targetPath);
}

function normalizeFixtureCase(caseEntry) {
  if (!caseEntry || typeof caseEntry !== "object") {
    throw new Error("fit-quality case entries must be objects");
  }

  if (!caseEntry.id || typeof caseEntry.id !== "string") {
    throw new Error("fit-quality case entries require a string id");
  }

  if (!caseEntry.category || typeof caseEntry.category !== "string") {
    throw new Error(`fit-quality case ${caseEntry.id} requires a string category`);
  }

  if (!isSupportedFitQualityCategory(caseEntry.category)) {
    throw new Error(`fit-quality case ${caseEntry.id} uses unsupported category "${caseEntry.category}"`);
  }

  return caseEntry;
}

function evaluateHardwareGpuLane(hardwareGpuLane) {
  const required = hardwareGpuLane?.required !== false;
  const supported = hardwareGpuLane?.supported === true;

  if (!required) {
    return {
      status: "not-required",
      required,
      supported,
      lane: hardwareGpuLane?.lane ?? null,
      reason: hardwareGpuLane?.reason ?? null,
      nextStep: null,
    };
  }

  if (supported) {
    return {
      status: "passed",
      required,
      supported,
      lane: hardwareGpuLane?.lane ?? null,
      reason: null,
      nextStep: null,
    };
  }

  return {
    status: "carry-forward",
    required,
    supported,
    lane: hardwareGpuLane?.lane ?? "unavailable",
    reason: hardwareGpuLane?.reason ?? "hardware GPU lane is unavailable in the current environment",
    nextStep:
      hardwareGpuLane?.nextStep ??
      "Run the same fixture on a hardware-backed GPU lane and attach the resulting report before certification.",
    owner: hardwareGpuLane?.owner ?? "fit-quality/performance gate",
    trackedBy: hardwareGpuLane?.trackedBy ?? "hardware-gpu-lane",
  };
}

function buildCoverageFailures(coverage) {
  const failures = [];

  if (coverage.bodyMatrix.missing.length > 0 || coverage.bodyMatrix.unknown.length > 0) {
    failures.push({
      code: "golden-body-matrix-coverage",
      message: "golden body matrix coverage is incomplete",
      actual: coverage.bodyMatrix,
      threshold: "B01..B12 all present and no unknown ids",
    });
  }

  if (coverage.poseMatrix.missing.length > 0 || coverage.poseMatrix.unknown.length > 0) {
    failures.push({
      code: "golden-pose-matrix-coverage",
      message: "golden pose matrix coverage is incomplete",
      actual: coverage.poseMatrix,
      threshold: "P01..P08 all present and no unknown ids",
    });
  }

  return failures;
}

function summarizeFailures(caseResults, suiteFailures) {
  return [...new Set([...suiteFailures, ...caseResults.flatMap((entry) => entry.failures)].map((entry) => entry.code))].sort();
}

export async function runFitGoldenSuite({
  fixturePath,
  reportPath,
}) {
  const resolvedFixturePath = resolveInputPath(fixturePath);
  const fixture = await readJson(resolvedFixturePath);
  const caseEntries = fixture.cases.map(normalizeFixtureCase);
  const enforceCoverage = fixture.enforceCoverage !== false;
  const coverage = {
    enforced: enforceCoverage,
    bodyMatrix: validateGoldenBodyCoverage(caseEntries),
    poseMatrix: validateGoldenPoseCoverage(caseEntries),
  };
  const suiteFailures = enforceCoverage ? buildCoverageFailures(coverage) : [];
  const caseResults = caseEntries.map((caseEntry) => ({
    id: caseEntry.id,
    category: caseEntry.category,
    bodyMatrixId: caseEntry.bodyMatrixId ?? null,
    poseMatrixId: caseEntry.poseMatrixId ?? null,
    thresholds: resolveCategoryThresholds(caseEntry.category),
    ...evaluateGoldenCase(caseEntry, resolveCategoryThresholds(caseEntry.category)),
  }));
  const hardwareGpuLane = evaluateHardwareGpuLane(fixture.hardwareGpuLane);
  const failedCases = caseResults.filter((entry) => entry.status === "failed").length;
  const overallStatus =
    suiteFailures.length > 0 || failedCases > 0
      ? "failed"
      : hardwareGpuLane.status === "carry-forward"
        ? "carry-forward"
        : "passed";

  const report = {
    fixtureId: fixture.fixtureId ?? path.basename(resolvedFixturePath, path.extname(resolvedFixturePath)),
    generatedAt: new Date().toISOString(),
    fixturePath: path.relative(process.cwd(), resolvedFixturePath),
    overallStatus,
    suiteFailures,
    hardwareGpuLane,
    coverage,
    summary: {
      caseCount: caseResults.length,
      failedCaseCount: failedCases,
      passedCaseCount: caseResults.length - failedCases,
      failureCodes: summarizeFailures(caseResults, suiteFailures),
    },
    cases: caseResults,
  };

  if (reportPath) {
    const resolvedReportPath = path.isAbsolute(reportPath) ? reportPath : path.resolve(process.cwd(), reportPath);
    await writeJson(resolvedReportPath, report);
    report.reportPath = path.relative(process.cwd(), resolvedReportPath);
  }

  return report;
}

function parseCliArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.fixture) {
    throw new Error("run-fit-golden requires --fixture <path>");
  }

  const report = await runFitGoldenSuite({
    fixturePath: args.fixture,
    reportPath: args.report,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (args.expect && report.overallStatus !== args.expect) {
    process.exitCode = 1;
    return;
  }

  if (!args.expect && report.overallStatus !== "passed") {
    process.exitCode = report.overallStatus === "carry-forward" ? 2 : 1;
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
