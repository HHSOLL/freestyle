# Phase 3 / Batch 3

## Scope

This batch closes the remaining Phase 3 gap between policy-only asset tooling and an actual shipped runtime path:

1. extend committed `LOD1 / LOD2` sibling coverage to the default promoted garment and hair paths
2. make the compatibility runtime prime KTX2 support against the live renderer before runtime GLTF loads
3. add a repo-local bootstrap seam for KTX tooling and commit representative runtime `.ktx2` texture samples
4. widen the asset-budget report from file-size-only evidence into transfer, triangle, draw-call, and GPU-texture evidence for the default closet scene

## Implemented

### Runtime LOD consumption

- `packages/shared-types/src/index.ts`
  - garment runtime bindings now support `lodModelPaths` and `lodModelPathsByVariant`
- `packages/domain-garment/src/index.ts`
  - starter promoted garments can derive sibling `LOD1 / LOD2` runtime paths from the canonical `LOD0` path
  - runtime model-path collection now includes derived sibling paths
  - garment runtime model-path resolution is now quality-tier-aware
- `packages/runtime-3d/src/runtime-model-paths.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
  - compatibility runtime now resolves promoted garment and hair GLBs by `qualityTier`, not avatar-only

### Shared runtime KTX2 support

- `packages/runtime-3d/src/runtime-gltf-loader.ts`
  - now reuses the repo-owned loader policy from `packages/shared-types/src/viewer-asset-policy.ts`
  - now owns one shared `DRACOLoader` and one shared `KTX2Loader`
  - exports `primeRuntimeGLTFLoaderSupport(renderer)` and `disposeRuntimeGLTFLoaderSupport()`
- `packages/runtime-3d/src/reference-closet-stage-view.tsx`
  - now primes KTX2 support from the live renderer before runtime asset hooks mount

### Repo-local KTX tool seam

- `scripts/bootstrap-ktx-tools.mts`
  - downloads and expands a repo-local KTX-Software toolchain under the ignored `tools/ktx-software/`
- `scripts/encode-ktx2.mts`
  - now prefers the repo-local `toktx` binary and library path
- `scripts/build-phase3-texture-samples.mts`
  - generates representative committed `.ktx2` texture samples under canonical viewer-manifest asset roots

### Committed runtime artifacts

- committed promoted garment and hair sibling assets:
  - `apps/web/public/assets/garments/mpfb/female/top_soft_casual_v4.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/female/bottom_soft_wool_v1.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/female/shoes_soft_flat_v1.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/male/top_soft_casual_v4.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/male/bottom_soft_wool_v1.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/male/shoes_soft_sneaker.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/female/hair_textured_crop.lod1/.lod2.glb`
  - `apps/web/public/assets/garments/mpfb/male/hair_textured_crop.lod1/.lod2.glb`
- committed representative runtime `.ktx2` samples:
  - `apps/web/public/assets/viewer-manifests/avatars/female-base/textures/*.ktx2`
  - `apps/web/public/assets/viewer-manifests/garments/published-top-precision-tee/textures/*.ktx2`

### Wider budget evidence

- `scripts/report-asset-budget.mts`
  - now records `drawCalls`, `triangles`, and approximate `gpuTextureBytes`
  - now reports `defaultClosetSceneByVariant` for `high / balanced / low`
  - now distinguishes transfer, texture, draw-call, and triangle status per quality tier

## Evidence

Current report: `output/asset-budget-report/latest.json`

Current summary facts:

- runtime committed `.ktx2` texture count: `9`
- remaining runtime root GLBs missing sibling `LOD1 / LOD2`: `30`
- balanced-ready assets: `11`
- low-ready assets: `11`

Current default closet scene results:

- `female-base`
  - `high`: `3,695,492` bytes, `12` draw calls, `136,374` triangles, `24,117,248` texture bytes, all statuses `pass`
  - `balanced`: `2,854,272` bytes, `12` draw calls, `72,464` triangles, `24,117,248` texture bytes, all statuses `pass`
  - `low`: `2,206,456` bytes, `12` draw calls, `46,931` triangles, `24,117,248` texture bytes, all statuses `pass`
- `male-base`
  - `high`: `2,593,052` bytes, `13` draw calls, `84,016` triangles, `32,505,856` texture bytes, all statuses `pass`
  - `balanced`: `2,112,500` bytes, `13` draw calls, `62,473` triangles, `30,670,848` texture bytes, all statuses `pass`
  - `low`: `1,670,364` bytes, `13` draw calls, `42,308` triangles, `30,670,848` texture bytes, all statuses `pass`

## Why This Matters

Batch 1 locked policy and tooling.
Batch 2 made avatar `LOD` selection real in the shipped runtime.
Batch 3 closes the same loop for the default promoted garment and hair path, and proves that the compatibility runtime can now:

- resolve committed sibling assets for both avatar and equipped promoted garments
- prime KTX2 support against the real browser renderer instead of leaving it as an unverified policy seam
- generate and ship representative runtime `.ktx2` textures from one repo-owned pipeline
- measure actual default-closet transfer, triangle, draw-call, and texture budgets by quality tier

## Remaining Work After Phase 3

These items remain valid backlog, but they are no longer blockers for Phase 3 closeout:

1. widen sibling `LOD1 / LOD2` coverage from the current promoted/default runtime path to the broader catalog
2. replace representative `.ktx2` sample textures with category-wide authored runtime material maps as the asset factory expands
3. migrate the new loader/asset policy from the compatibility runtime path into later `viewer-core`-owned material loading as the staged cutover continues
