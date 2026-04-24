import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCategoryThresholds, isSupportedFitQualityCategory } from "./category-thresholds.mjs";
import { evaluateRuntimeStability } from "./compute-metrics.mjs";

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

function normalizeRun(runEntry) {
  if (!runEntry || typeof runEntry !== "object") {
    throw new Error("runtime stability entries must be objects");
  }

  if (!runEntry.id || typeof runEntry.id !== "string") {
    throw new Error("runtime stability entries require a string id");
  }

  if (!runEntry.category || typeof runEntry.category !== "string") {
    throw new Error(`runtime stability entry ${runEntry.id} requires a string category`);
  }

  if (!isSupportedFitQualityCategory(runEntry.category)) {
    throw new Error(`runtime stability entry ${runEntry.id} uses unsupported category "${runEntry.category}"`);
  }

  return runEntry;
}

export async function runRuntimeStabilitySuite({
  fixturePath,
  reportPath,
}) {
  const resolvedFixturePath = resolveInputPath(fixturePath);
  const fixture = await readJson(resolvedFixturePath);
  const runs = fixture.runs.map(normalizeRun);
  const runResults = runs.map((runEntry) => ({
    id: runEntry.id,
    category: runEntry.category,
    thresholds: resolveCategoryThresholds(runEntry.category),
    ...evaluateRuntimeStability(runEntry, resolveCategoryThresholds(runEntry.category)),
  }));
  const failedRuns = runResults.filter((entry) => entry.status === "failed");

  const report = {
    fixtureId: fixture.fixtureId ?? path.basename(resolvedFixturePath, path.extname(resolvedFixturePath)),
    generatedAt: new Date().toISOString(),
    fixturePath: path.relative(process.cwd(), resolvedFixturePath),
    overallStatus: failedRuns.length > 0 ? "failed" : "passed",
    summary: {
      runCount: runResults.length,
      failedRunCount: failedRuns.length,
      failureCodes: [...new Set(failedRuns.flatMap((entry) => entry.failures.map((failure) => failure.code)))].sort(),
    },
    runs: runResults,
  };

  if (reportPath) {
    const resolvedReportPath = path.isAbsolute(reportPath) ? reportPath : path.resolve(process.cwd(), reportPath);
    await writeJson(resolvedReportPath, report);
    report.reportPath = path.relative(process.cwd(), resolvedReportPath);
  }

  return report;
}
