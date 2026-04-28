#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "packages/fit-kernel/Cargo.toml");
const releaseWasmPath = path.join(
  root,
  "packages/fit-kernel/target/wasm32-unknown-unknown/release/freestyle_fit_kernel.wasm",
);
const publicOutDir = path.join(root, "apps/web/public/workers/fit-kernel-wasm");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    env: process.env,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
};

const assertBinary = (command, installHint) => {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} is required to build fit-kernel WASM. ${installHint}`);
  }
};

assertBinary("cargo", "Install Rust with rustup and add the wasm32-unknown-unknown target.");
assertBinary(
  "wasm-bindgen",
  "Install wasm-bindgen-cli 0.2.118, for example: cargo install wasm-bindgen-cli --version 0.2.118 --locked",
);

await mkdir(publicOutDir, { recursive: true });
run("cargo", ["build", "--manifest-path", manifestPath, "--target", "wasm32-unknown-unknown", "--release"]);
run("wasm-bindgen", [
  "--target",
  "no-modules",
  "--out-dir",
  publicOutDir,
  "--out-name",
  "freestyle_fit_kernel",
  releaseWasmPath,
]);

await Promise.all([
  rm(path.join(publicOutDir, "freestyle_fit_kernel.d.ts"), { force: true }),
  rm(path.join(publicOutDir, "freestyle_fit_kernel_bg.wasm.d.ts"), { force: true }),
]);

const gluePath = path.join(publicOutDir, "freestyle_fit_kernel.js");
const glue = await readFile(gluePath, "utf8");
if (!glue.startsWith("/* eslint-disable */")) {
  await writeFile(gluePath, `/* eslint-disable */\n${glue}`);
}
