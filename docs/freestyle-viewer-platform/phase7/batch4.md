# Phase 7 / Batch 4

## Scope

- close the current repo-scoped `Phase 7` path by moving the compatibility preview worker onto the real preview session protocol
- keep the implementation honest: this batch still does **not** claim XPBD cloth, fit-mesh vertex deformation, or browser WASM cloth truth
- wire body-signature, collision, fit-mesh, material, solve, and deformation seams together for the active same-origin worker path

## Implemented

1. extended `@freestyle/viewer-protocol` with inline preview-worker setup payloads for:
   - `SET_BODY_SIGNATURE`
   - `SET_COLLISION_BODY`
   - `SET_GARMENT_FIT_MESH`
   - `SET_MATERIAL_PHYSICS`
   - `SOLVE_PREVIEW`
   - `GET_DEFORMATION`
2. added a typed `PREVIEW_DEFORMATION` envelope for compatibility-stage transform transfer
3. extended `@freestyle/fit-kernel` with a canonical deformation contract for:
   - `secondary-motion-transform`
   - session / sequence / backend / execution-mode truth
4. added `packages/runtime-3d/src/preview-session-bridge.ts` to build compatibility preview inputs from committed runtime metadata:
   - canonical body signature from `BodyProfile`
   - synthesized body collision capsules
   - runtime-derived fit-mesh proxy
   - runtime-derived material profile
5. promoted the same-origin worker at `apps/web/public/workers/reference-closet-stage-preview.worker.js` into a real session worker:
   - stores solver/bootstrap state
   - accepts the typed setup messages
   - responds to `SOLVE_PREVIEW`
   - stores and serves `GET_DEFORMATION`
   - emits both `PREVIEW_FRAME_RESULT` and `PREVIEW_DEFORMATION`
   - removes the old raw frame-request entrypoint so the active worker surface is the typed session protocol only
6. updated `runtime-3d` to bootstrap the worker with setup messages before preview solves begin, and to apply the deformation envelope as the compatibility-stage transfer path
7. seeded a base preview runtime snapshot on the compatibility host so `data-preview-runtime-*` attrs are never left empty before the first worker solve completes

## Evidence

- kernel deformation contract: `packages/fit-kernel/src/index.ts`
- kernel coverage: `packages/fit-kernel/src/index.test.ts`
- protocol seam: `packages/viewer-protocol/src/fit.ts`
- protocol coverage: `packages/viewer-protocol/src/index.test.ts`
- runtime setup helper: `packages/runtime-3d/src/preview-session-bridge.ts`
- runtime setup coverage: `packages/runtime-3d/src/preview-session-bridge.test.ts`
- compatibility integration: `packages/runtime-3d/src/closet-stage.tsx`
- worker protocol/runtime: `apps/web/public/workers/reference-closet-stage-preview.worker.js`
- product smoke: `apps/web/e2e/closet-preview-runtime.spec.ts`

## Commands

```bash
./node_modules/.bin/tsx --test packages/fit-kernel/src/index.test.ts packages/viewer-protocol/src/index.test.ts packages/runtime-3d/src/preview-session-bridge.test.ts packages/runtime-3d/src/reference-closet-stage-preview-simulation.test.ts packages/runtime-3d/src/preview-engine-status.test.ts packages/runtime-3d/src/preview-runtime-snapshot.test.ts
npm --prefix apps/web run typecheck
npm run lint
npm run build:services
npm run build
NEXT_PUBLIC_VIEWER_HOST=runtime-3d npx playwright test apps/web/e2e/closet-preview-runtime.spec.ts --project=chromium
```

## Boundary Notes

- this batch still does **not** introduce real XPBD cloth, fit-mesh vertex deformation, or browser WASM cloth truth
- the active preview worker now uses the final session protocol shape, but the compatibility solver remains a reduced secondary-motion layer
- `SET_COLLISION_BODY`, `SET_GARMENT_FIT_MESH`, and `SET_MATERIAL_PHYSICS` currently use runtime-derived compatibility inputs, not final authoritative authored solver assets
- `PREVIEW_DEFORMATION` currently transfers transform-based secondary motion only; it is not yet a cloth vertex buffer or wrap-map deformation cache
