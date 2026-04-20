import { logger } from "@freestyle/observability";
import { assertAdminClientConfig } from "@freestyle/db";
import { runWorkerRouter } from "@freestyle/queue";
import { jobTypeList, type JobType } from "@freestyle/shared";
import { assetProcessorWorkerDefinition } from "../../asset_processor/src/worker.js";
import { backgroundRemovalWorkerDefinition } from "../../background_removal/src/worker.js";
import { evaluatorWorkerDefinition } from "../../evaluator/src/worker.js";
import { fitSimulationWorkerDefinition } from "../../fit_simulation/src/worker.js";
import { importerWorkerDefinition } from "../../importer/src/worker.js";
import { tryonWorkerDefinition } from "../../tryon/src/worker.js";

const workerDefinitions = [
  importerWorkerDefinition,
  backgroundRemovalWorkerDefinition,
  assetProcessorWorkerDefinition,
  evaluatorWorkerDefinition,
  fitSimulationWorkerDefinition,
  tryonWorkerDefinition,
] as const;

const parseConfiguredJobTypes = (): JobType[] | undefined => {
  const raw = process.env.WORKER_JOB_TYPES?.trim();
  if (!raw || raw === "*" || raw.toLowerCase() === "all") {
    return undefined;
  }

  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = values.filter((item) => !jobTypeList.includes(item as JobType));
  if (invalid.length > 0) {
    throw new Error(`Unsupported WORKER_JOB_TYPES value: ${invalid.join(", ")}`);
  }

  return values as JobType[];
};

const main = async () => {
  assertAdminClientConfig();
  const jobTypes = parseConfiguredJobTypes();

  await runWorkerRouter({
    workerName: process.env.WORKER_NAME || "worker",
    jobTypes,
    workers: [...workerDefinitions],
  });
};

main().catch((error) => {
  logger.error("worker.runtime.crash", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});
