# Phase 10 Closeout

## Status

`Phase 10` is `completed` for the current repo-scoped baseline.

This closeout means:

- GitHub CI now runs the repo-scoped Phase 10 hard gate through `npm run check:phase10`.
- `check:phase10` includes the full local gate, asset-budget evidence, Phase 9 `viewer-react` cutover smoke, Phase 9 rollback smoke, and operational browser smoke.
- `/app/closet` viewer telemetry is forwarded from the product route to `POST /v1/telemetry/viewer` when the client API base URL is configured.
- product viewer telemetry carries Phase 9 release-flag, kill-switch, source, and active viewer-host tags.
- the API can recommend operational actions for garment, solver, material-class, and device-tier regressions without mutating serving state directly.

It does **not** mean:

- hardware-backed GPU CI is fully automated.
- the current asset-budget report is fail-closed for the full catalog.
- runtime GPU texture memory, draw calls, triangles, and context-loss recovery are measured from real browser GPU counters.
- rollout automation can pause serving by itself without an operator or later control-plane integration.
- the current HQ `draped_glb` is solver-deformed cloth truth.

## Implemented Scope

### CI hard gate

The active workflow now runs one Phase 10 gate instead of a partial command list:

- `npm run check`
- `npm run report:asset-budget`
- `npm run test:e2e:phase9:closet`
- `npm run test:e2e:phase9:rollback`
- `npm run test:e2e:ops-closeout`

CI also retains Playwright artifacts on failure and uploads `output/asset-budget-report/latest.json` as evidence on every run.

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

Test evidence:

- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/telemetry/viewer-telemetry.service.test.ts`
- `apps/api/src/routes/viewer-telemetry.routes.test.ts`
- `apps/web/src/lib/viewerTelemetry.test.ts`

QA note:

- `docs/qa/phase10-production-telemetry-2026-04-24.md`

## Remaining Carry-Forward Risks

These are intentionally documented rather than hidden:

- Hardware-backed GPU lane is still an operational requirement, not a fully automated GitHub-hosted lane.
- `report:asset-budget` remains evidence-only while known LOD coverage debt is present.
- The product telemetry route currently recommends actions; it does not automatically stop garment serving or roll back solver/material versions.
- Real render-stat telemetry for draw calls, triangles, GPU texture memory, and context restore remains a future runtime instrumentation task.

## Closeout Rule

Future Phase 10 reopen work should be treated as a production telemetry or CI-control-plane change, not as a general viewer refactor. If new hard gates are added, update:

- `package.json`
- `.github/workflows/quality.yml`
- `docs/quality-gates.md`
- this closeout note
