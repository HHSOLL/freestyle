#!/usr/bin/env node
import { spawn } from "node:child_process";

const children = new Set();
let shuttingDown = false;

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const spawnProcess = (label, command, args) => {
  const child = spawn(command, args, { stdio: "inherit" });
  children.add(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev-all] ${label} exited (${signal || code}). Shutting down...`);
    shutdown(code ?? 0);
  });

  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`[dev-all] Failed to start ${label}:`, error.message);
    shutdown(1);
  });

  return child;
};

const shutdown = (code) => {
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Best effort.
    }
  }
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

spawnProcess("next-dev", npmCmd, ["run", "dev"]);
spawnProcess("api", npmCmd, ["run", "dev:api"]);
spawnProcess("worker-importer", npmCmd, ["run", "dev:worker:importer"]);
spawnProcess("worker-background-removal", npmCmd, ["run", "dev:worker:background-removal"]);
spawnProcess("worker-asset-processor", npmCmd, ["run", "dev:worker:asset"]);
spawnProcess("worker-evaluator", npmCmd, ["run", "dev:worker:evaluator"]);
spawnProcess("worker-tryon", npmCmd, ["run", "dev:worker:tryon"]);
