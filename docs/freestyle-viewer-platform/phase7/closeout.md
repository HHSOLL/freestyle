# Phase 7 Closeout

## Status

- `Phase 7` is closed for the current repo-scoped compatibility preview path.
- this closeout does **not** claim browser XPBD cloth, fit-mesh vertex deformation, or browser WASM cloth truth yet

## Completed Scope

1. promoted the reduced preview frame/request/result contract into `@freestyle/fit-kernel`
2. promoted the same-origin preview worker to the canonical preview session protocol surface in `@freestyle/viewer-protocol`
   - the old raw frame-request compatibility entrypoint is removed from the active worker path
3. exposed read-only compatibility-stage evidence through:
   - `fit:preview-runtime-updated`
   - `fit:preview-engine-status`
   - `data-preview-runtime-*`
   - `data-preview-engine-*`
4. added runtime bootstrap helpers that derive compatibility preview inputs from current committed runtime metadata:
   - body signature
   - synthesized body collision capsules
   - fit-mesh proxy
   - material physics proxy
5. added a typed `PREVIEW_DEFORMATION` envelope and compatibility-stage transfer path for transform-based secondary motion
6. kept the active shipping boundary honest:
   - same-origin worker
   - reduced preview spring behavior
   - static-fit fallback
   - no `/v1` payload widening
7. seeded base preview-runtime attrs on the compatibility host so the read-only evidence surface is populated before the first worker solve lands

## Evidence Trail

- `docs/freestyle-viewer-platform/phase7/batch1.md`
- `docs/freestyle-viewer-platform/phase7/batch2.md`
- `docs/freestyle-viewer-platform/phase7/batch3.md`
- `docs/freestyle-viewer-platform/phase7/batch4.md`

## Final Evidence

- kernel seam: `packages/fit-kernel/src/index.ts`
- protocol seam: `packages/viewer-protocol/src/fit.ts`
- runtime setup helper: `packages/runtime-3d/src/preview-session-bridge.ts`
- compatibility host integration: `packages/runtime-3d/src/closet-stage.tsx`
- same-origin worker: `apps/web/public/workers/reference-closet-stage-preview.worker.js`
- product smoke: `apps/web/e2e/closet-preview-runtime.spec.ts`

## Commands

```bash
./node_modules/.bin/tsx --test packages/fit-kernel/src/index.test.ts packages/viewer-protocol/src/index.test.ts packages/runtime-3d/src/preview-session-bridge.test.ts packages/runtime-3d/src/reference-closet-stage-preview-simulation.test.ts packages/runtime-3d/src/preview-engine-status.test.ts packages/runtime-3d/src/preview-runtime-snapshot.test.ts
npm --prefix apps/web run typecheck
npm run test:core
npm run lint
npm run build:services
npm run build
NEXT_PUBLIC_VIEWER_HOST=runtime-3d npx playwright test apps/web/e2e/closet-preview-runtime.spec.ts --project=chromium
```

## Remaining Gap Handed To Later Phases

- real WASM preview bootstrap
- authoritative authored collision / fit-mesh / material-physics assets for preview solves
- authored fit-mesh topology / wrap-map transfer beyond the current normalized proxy binding
- solver-grade preview latency and fit-quality gating

Those gaps belong to later fitting-quality phases. They are not reopened inside this compatibility-path closeout.
