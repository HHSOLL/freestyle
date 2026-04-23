# Phase 7 / Batch 1

## Scope

- start Phase 7 by promoting the current reduced preview runtime into a real `fit-kernel` seam
- keep the implementation honest: this batch does **not** claim XPBD cloth, fit-mesh deformation, or browser WASM cloth truth yet
- make the active same-origin preview worker return a typed result envelope instead of an ad-hoc raw frame only

## Implemented

1. moved the reduced preview frame state, request/result types, feature detection, step function, and metrics builder into `@freestyle/fit-kernel`
2. made `@freestyle/fit-kernel` expose an explicit current execution-mode truth:
   - `reduced-preview`
   - reserved `wasm-preview`
   - `static-fit`
3. narrowed `packages/runtime-3d/src/reference-closet-stage-preview-simulation.ts` into a compatibility wrapper:
   - quality-tier backend selection still lives there
   - spring stepping now delegates to `@freestyle/fit-kernel`
4. added a typed preview result envelope to `@freestyle/viewer-protocol`
5. updated the same-origin worker at `apps/web/public/workers/reference-closet-stage-preview.worker.js` to emit:
   - `type: "PREVIEW_FRAME_RESULT"`
   - `result`
   - `metrics`
6. kept `Closet` backward-compatible by accepting either the old raw result shape or the new typed envelope while the compatibility runtime remains in place

## Evidence

- kernel seam: `packages/fit-kernel/src/index.ts`
- kernel coverage: `packages/fit-kernel/src/index.test.ts`
- runtime wrapper: `packages/runtime-3d/src/reference-closet-stage-preview-simulation.ts`
- runtime integration: `packages/runtime-3d/src/closet-stage.tsx`
- worker: `apps/web/public/workers/reference-closet-stage-preview.worker.js`
- protocol seam: `packages/viewer-protocol/src/fit.ts`
- protocol coverage: `packages/viewer-protocol/src/index.test.ts`

## Commands

```bash
npm --prefix apps/admin run typecheck
npm run test:core
npm run lint
npm run build:services
npm run build
```

## Boundary Notes

- this batch does **not** introduce a real WASM cloth solver yet
- `wasm-preview` remains a reserved execution mode for the later Phase 7 path
- display meshes are still **not** solved directly; the current reduced preview remains a lightweight spring-style motion layer for hair and loose garments
- `SharedArrayBuffer` remains optional and untouched by this batch; the active worker path stays same-origin and reduced-preview only
