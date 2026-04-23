# Phase 10 Production Telemetry Evidence (2026-04-24)

## Verdict

`PASS` for the repo-scoped Phase 10 closeout.

## Scope

This evidence covers:

- Phase 10 CI hard-gate wiring
- product viewer telemetry forwarding from `/app/closet`
- `/v1/telemetry/viewer` contract validation and advisory action output
- Phase 9 cutover-source tags in browser telemetry

It does not claim hardware-backed GPU CI automation or automatic production serving mutation.

## Command Evidence

Closeout gate:

- `PATH="/opt/homebrew/bin:$PATH" npm run check:phase10`
- result:
  - `lint` passed
  - `typecheck` passed
  - `typecheck:admin` passed
  - `test:core` passed: `318 passed`, `1 skipped`
  - `validate:garment3d` passed for `17` starter garments
  - `validate:avatar3d` passed for `2` render variants
  - `validate:fit-calibration` passed for `17` starter garments across `6` archetypes
  - `build:services` passed
  - `build` passed
  - `build:admin` passed
  - `report:asset-budget` wrote `output/asset-budget-report/latest.json`
  - `test:e2e:phase9:closet` passed
  - `test:e2e:phase9:rollback` passed
  - `test:e2e:ops-closeout` passed

Targeted telemetry tests:

- `./node_modules/.bin/tsx --test apps/web/src/lib/viewerTelemetry.test.ts apps/api/src/modules/telemetry/viewer-telemetry.service.test.ts apps/api/src/routes/viewer-telemetry.routes.test.ts packages/contracts/src/domain-contracts.test.ts`
- result: `51 passed`

Expected Phase 10 gate expansion:

- `npm run check`
- `npm run report:asset-budget`
- `npm run test:e2e:phase9:closet`
- `npm run test:e2e:phase9:rollback`
- `npm run test:e2e:ops-closeout`

Local environment note:

- the default Codex app Node reported a `sharp` native-module code-sign mismatch during an earlier `test:core` attempt
- rerunning with the documented Homebrew Node path completed successfully

## Runtime Contract Evidence

Telemetry route:

- `POST /v1/telemetry/viewer`
- product namespace header: `x-freestyle-surface: product`
- payload schema: `viewerTelemetryEnvelopeSchema`
- response schema: `viewerTelemetryResponseSchema`

Current recommended actions:

- `pause-garment-serving`
- `reopen-fit-certification`
- `lower-device-quality-policy`
- `review-hq-cache-policy`
- `review-material-delivery`

## Browser Evidence

The `Closet` `viewer-react` path now emits Phase 9 source tags through the existing `freestyle:viewer-telemetry` event:

- `phase9Enabled`
- `phase9KillSwitch`
- `phase9Source`
- `viewerHost`

The Phase 9 e2e cutover smoke asserts that at least one viewer telemetry event carries `phase9Source=phase9-release-flag`.

## Carry-Forward

- Asset-budget report is uploaded as CI evidence but remains non-blocking until full LOD coverage debt is retired.
- Hardware-backed GPU evidence remains a required release lane outside the current GitHub-hosted CI workflow.
- Automatic serving stop / rollback is represented as advisory output only; mutation workflows require a later control-plane integration.
