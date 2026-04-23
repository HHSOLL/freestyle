# Phase 7 / Batch 3

## Scope

- keep `Phase 7` honest by exposing the active preview-engine plan/status as typed read-only evidence
- do not claim browser WASM cloth or fit-mesh deformation authority yet
- surface why the compatibility path is currently `static-fit` or `reduced-preview-compat`

## Implemented

1. extended `@freestyle/fit-kernel` with canonical preview-engine status tuples and a resolver for:
   - `engineKind`
   - `status`
   - `transport`
   - `fallbackReason`
2. added `previewEngineStatusSchema` plus `fit:preview-engine-status` to `@freestyle/viewer-protocol`
3. added `packages/runtime-3d/src/preview-engine-status.ts` as the compatibility helper for:
   - DOM data attributes
   - typed browser event envelopes
   - change detection
4. made `ReferenceClosetStageCanvas` expose read-only preview-engine evidence through:
   - `data-preview-engine-*` attributes
   - `window` `CustomEvent("freestyle:viewer-event")` with `type: "fit:preview-engine-status"`
5. kept the active compatibility path truthful:
   - `worker-reduced` reports `reduced-preview-compat`
   - `experimental-webgpu` reports fallback reason `wasm-preview-disabled`
   - no-motion / low-tier cases report `static-fit-compat`
6. added unit coverage for the engine-status contract and widened the Playwright smoke to assert both runtime snapshot and engine-status evidence

## Evidence

- kernel resolver: `packages/fit-kernel/src/index.ts`
- kernel coverage: `packages/fit-kernel/src/index.test.ts`
- protocol seam: `packages/viewer-protocol/src/fit.ts`
- event seam: `packages/viewer-protocol/src/events.ts`
- protocol coverage: `packages/viewer-protocol/src/index.test.ts`
- runtime helper: `packages/runtime-3d/src/preview-engine-status.ts`
- runtime helper coverage: `packages/runtime-3d/src/preview-engine-status.test.ts`
- compatibility integration: `packages/runtime-3d/src/closet-stage.tsx`
- compatibility backend wrapper: `packages/runtime-3d/src/reference-closet-stage-preview-simulation.ts`
- product smoke: `apps/web/e2e/closet-preview-runtime.spec.ts`

## Commands

```bash
./node_modules/.bin/tsx --test packages/fit-kernel/src/index.test.ts packages/viewer-protocol/src/index.test.ts packages/runtime-3d/src/preview-runtime-snapshot.test.ts packages/runtime-3d/src/preview-engine-status.test.ts packages/runtime-3d/src/reference-closet-stage-preview-simulation.test.ts
npm --prefix apps/web run typecheck
npm run lint
npm run build:services
npm run build
NEXT_PUBLIC_VIEWER_HOST=runtime-3d npx playwright test apps/web/e2e/closet-preview-runtime.spec.ts --project=chromium
```

## Boundary Notes

- this batch still does **not** introduce XPBD cloth, fit-mesh deformation, or browser WASM cloth truth
- `wasm-preview` remains a reserved engine kind for a later Phase 7 slice
- `fit:preview-engine-status` is read-only evidence for debug, telemetry, and later certification work
- the compatibility host may report fallback reasons such as `low-quality-tier`, `no-continuous-motion`, `worker-unavailable`, or `wasm-preview-disabled`, but those are operational truths, not solver-quality claims
