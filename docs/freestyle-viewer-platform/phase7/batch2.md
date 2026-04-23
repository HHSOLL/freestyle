# Phase 7 / Batch 2

## Scope

- keep `Phase 7` honest by exposing the **actual** reduced-preview runtime state as typed, read-only evidence
- do not introduce a real WASM cloth solver yet
- let the current `runtime-3d` compatibility host surface preview backend / execution-mode truth without widening product payloads

## Implemented

1. added `previewRuntimeSnapshotSchema` and `fit:preview-runtime-updated` to `@freestyle/viewer-protocol`
2. added `packages/runtime-3d/src/preview-runtime-snapshot.ts` as the canonical mapper from:
   - raw reduced-preview frame results
   - typed worker envelopes
   - compatibility-stage seed snapshots
3. made `ReferenceClosetStageCanvas` expose read-only runtime evidence through:
   - `data-preview-runtime-*` attributes
   - `window` `CustomEvent("freestyle:viewer-event")` with `type: "fit:preview-runtime-updated"`
4. kept the event seam compatibility-safe:
   - no `/v1` payload changes
   - no `viewer-core` dependency changes
   - no new solver authority claims
5. added runtime snapshot unit coverage and a product-route Playwright smoke for the default `runtime-3d` compatibility host

## Evidence

- protocol seam: `packages/viewer-protocol/src/fit.ts`
- event seam: `packages/viewer-protocol/src/events.ts`
- protocol coverage: `packages/viewer-protocol/src/index.test.ts`
- runtime mapper: `packages/runtime-3d/src/preview-runtime-snapshot.ts`
- runtime mapper coverage: `packages/runtime-3d/src/preview-runtime-snapshot.test.ts`
- compatibility stage integration: `packages/runtime-3d/src/closet-stage.tsx`
- product smoke: `apps/web/e2e/closet-preview-runtime.spec.ts`

## Commands

```bash
npm install --package-lock-only
npm run test:core
npm run lint
npm run build:services
npm run build
npx playwright test apps/web/e2e/closet-preview-runtime.spec.ts --project=chromium
```

## Boundary Notes

- this batch still does **not** introduce XPBD cloth, fit-mesh deformation, or browser WASM cloth truth
- `executionMode` remains `reduced-preview` or `static-fit` for the active product path
- `solverKind` is omitted when the stage is in `static-fit`
- the new event/data-attr seam is read-only evidence for debugging, telemetry, and later certification work
