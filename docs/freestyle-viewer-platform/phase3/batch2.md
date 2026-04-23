# Phase 3 / Batch 2

## Scope

This batch takes the first real runtime consumer of the Phase 3 LOD pipeline:

1. generate committed `LOD1 / LOD2` siblings for the two base avatar GLBs
2. make the compatibility runtime resolve avatar model paths by `qualityTier`
3. make preload use the same quality-tier-aware avatar path
4. extend the asset budget report to show quality-tier bytes for committed LOD assets

This batch does **not** claim garment-wide LOD adoption yet.

## Implemented

- committed avatar files:
  - `apps/web/public/assets/avatars/mpfb-female-base.lod1.glb`
  - `apps/web/public/assets/avatars/mpfb-female-base.lod2.glb`
  - `apps/web/public/assets/avatars/mpfb-male-base.lod1.glb`
  - `apps/web/public/assets/avatars/mpfb-male-base.lod2.glb`
- `packages/runtime-3d/src/avatar-manifest.ts`
  - now records avatar LOD sibling paths
  - exports `resolveAvatarRuntimeModelPath(...)`
- `packages/runtime-3d/src/runtime-model-paths.ts`
  - now resolves avatar preload paths by `qualityTier`
- `packages/runtime-3d/src/preload-runtime-assets.ts`
  - now accepts `qualityTier`
- `packages/runtime-3d/src/closet-stage.tsx`
  - now loads the quality-tier-resolved avatar path instead of always loading `LOD0`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
  - now passes the active `scene.qualityTier` into preload
- `scripts/report-asset-budget.mts`
  - now excludes derived `.lod1/.lod2` files from root-asset counting
  - now reports `qualityTierBytes`, `qualityTierTransferStatus`, and `qualityTierPaths`

## Evidence

Current report: `output/asset-budget-report/latest.json`

Current Phase 3 avatar facts:

- total root GLB assets analyzed: `41`
- assets with committed `LOD1`: `2`
- assets with committed `LOD2`: `2`
- remaining root assets without sibling LOD coverage: `39`
- avatar results:
  - `mpfb-female-base`
    - `LOD0`: `2,844,620` bytes
    - `LOD1`: `2,298,192` bytes
    - `LOD2`: `1,718,420` bytes
  - `mpfb-male-base`
    - `LOD0`: `2,122,616` bytes
    - `LOD1`: `1,705,836` bytes
    - `LOD2`: `1,276,348` bytes

## Why This Matters

Batch 1 only established policy and reporting.
Batch 2 makes Phase 3 real in the shipped runtime:

- the stage can now choose a smaller committed avatar asset for `balanced` and `low`
- preload and render now agree on the same effective avatar path
- budget evidence can now show which quality tier is actually within target

## Remaining Phase 3 Gaps

1. extend sibling `LOD1 / LOD2` coverage to promoted garments and hero hair
2. replace the current `runtimeKtx2TextureCount: 0` state with committed runtime KTX2 material textures
3. widen non-blocking budget evidence beyond transfer bytes into draw-call, triangle, and texture-memory telemetry
4. connect garment/hero asset authoring to the Phase 3 CLI seams so new promoted assets land with sibling LODs by default
