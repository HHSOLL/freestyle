# Phase 10 Closeout

## Status

`Phase 10` is `completed` for the current repo-scoped baseline.

This closeout means:

- GitHub CI now runs the repo-scoped Phase 10 hard gate through `npm run check:phase10`.
- `check:phase10` includes the full local gate, measured fit golden, measured visual golden, measured memory-growth, measured context-loss, asset-budget evidence, Phase 9 `viewer-react` cutover smoke, Phase 9 rollback smoke, and operational browser smoke.
- `/app/closet` viewer telemetry is forwarded from the product route to `POST /v1/telemetry/viewer` when the client API base URL is configured.
- product viewer telemetry carries Phase 9 release-flag, kill-switch, source, and active viewer-host tags.
- the API can recommend operational actions for garment, solver, material-class, and device-tier regressions without mutating serving state directly.

It does **not** mean:

- the current asset-budget report is fail-closed for the full catalog.
- runtime GPU texture memory, draw calls, triangles, and context-loss recovery are measured from real browser GPU counters.
- rollout automation can pause serving by itself without an operator or later control-plane integration.
- the current HQ `draped_glb` is solver-deformed cloth truth.

Hardware-backed GPU CI is now fail-closed in the repository workflow, but it still requires user-owned GitHub infrastructure:

- repository variable `RUN_HARDWARE_GPU_CI=true`
- a self-hosted Linux x64 runner available to this repository with labels `self-hosted`, `linux`, `x64`, `hardware-gpu`
- Chromium on that runner must report a non-software WebGL renderer; `SwiftShader`, `llvmpipe`, `softpipe`, and software rasterizers fail the probe

## Implemented Scope

### CI hard gate

The active workflow now runs one Phase 10 gate instead of a partial command list:

- `npm run check`
- `npm run test:fit-kernel:wasm`
- `npm run test:fit-golden`
- `npm run test:visual-golden`
- `npm run test:memory-leak`
- `npm run test:context-loss`
- `npm run report:asset-budget`
- `npm run test:e2e:phase9:closet`
- `npm run test:e2e:phase9:rollback`
- `npm run test:e2e:ops-closeout`

CI also retains Playwright artifacts on failure and writes quality evidence under `output/fit-quality/` plus `output/asset-budget-report/latest.json`.

The fit-quality gate now fails closed without measured input. The hard gate scripts call `scripts/collect-fit-quality-input.mjs` first and then evaluate `output/fit-quality/*.measured.json`; the old implicit default reports are not accepted by `scripts/fit-quality-gate.mjs`.

The hardware visual lane now has two jobs:

- `hardware-gpu-required`: always present, fails if `RUN_HARDWARE_GPU_CI` is not set to `true`
- `hardware-gpu-visual-gate`: runs on `[self-hosted, linux, x64, hardware-gpu]`, executes `npm run test:e2e:hardware-gpu-probe`, and only then allows `npm run test:visual-golden:hardware`

The collector no longer trusts `FIT_QUALITY_HARDWARE_GPU_SUPPORTED`; it reads `output/fit-quality/hardware-gpu-probe.latest.json` and requires `hardwareAccelerated: true`.

### Product telemetry ingress

New route:

- `POST /v1/telemetry/viewer`

The route accepts typed viewer telemetry envelopes and returns advisory recommended actions. It is intentionally non-mutating:

- `pause-garment-serving`
- `reopen-fit-certification`
- `lower-device-quality-policy`
- `review-hq-cache-policy`
- `review-material-delivery`

The current in-repo service keeps an in-memory accumulator for local and CI evidence. A later production control-plane can replace the storage/action adapter without changing the `/v1` contract.

### Phase 9 source tracing

`viewer-react` telemetry now includes route/source tags for the staged cutover:

- `phase9Enabled`
- `phase9KillSwitch`
- `phase9Source`
- `viewerHost`

This makes it possible to distinguish flagged `viewer-react` evidence from kill-switch rollback evidence when telemetry is forwarded to the API.

## Evidence

Primary code evidence:

- `packages/contracts/src/index.ts`
- `apps/api/src/routes/viewer-telemetry.routes.ts`
- `apps/api/src/modules/telemetry/viewer-telemetry.service.ts`
- `apps/web/src/lib/viewerTelemetry.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `packages/viewer-react/src/freestyle-viewer-host.tsx`
- `apps/web/e2e/closet-viewer-react.spec.ts`
- `.github/workflows/quality.yml`
- `package.json`
- `scripts/collect-fit-quality-input.mjs`
- `scripts/fit-quality-gate.mjs`
- `apps/web/e2e/hardware-gpu-visual.spec.ts`
- `scripts/verify-fit-kernel-wasm.mjs`

Test evidence:

- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/telemetry/viewer-telemetry.service.test.ts`
- `apps/api/src/routes/viewer-telemetry.routes.test.ts`
- `apps/web/src/lib/viewerTelemetry.test.ts`

QA note:

- `docs/qa/phase10-production-telemetry-2026-04-24.md`

## Remaining Carry-Forward Risks

These are intentionally documented rather than hidden:

- Hardware-backed GPU lane is fail-closed, but it cannot pass until the repository has the required self-hosted runner and `RUN_HARDWARE_GPU_CI=true`.
- `report:asset-budget` remains evidence-only while known LOD coverage debt is present.
- The product telemetry route currently recommends actions; it does not automatically stop garment serving or roll back solver/material versions.
- Real render-stat telemetry for draw calls, triangles, GPU texture memory, and context restore remains a future runtime instrumentation task.
- `starter-shoe-soft-day` is no longer in the default female product loadout and is excluded from the measured production fit-gate input until its authored shoe fit audit is repaired.

## Closeout Rule

Future Phase 10 reopen work should be treated as a production telemetry or CI-control-plane change, not as a general viewer refactor. If new hard gates are added, update:

- `package.json`
- `.github/workflows/quality.yml`
- `docs/quality-gates.md`
- this closeout note
