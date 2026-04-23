# Phase 3 Closeout

## Scope

This note closes the asset-delivery phase for the current viewer-platform refactor track.

Phase 3 goals covered here:

1. loader, decoder, and texture-format policy are now repo-owned seams instead of local conventions
2. committed `LOD1 / LOD2` siblings are consumed by the shipped default closet path for both avatars and the promoted equipped garment/hair set
3. the runtime has a reproducible repo-local KTX2 tooling path plus committed representative `.ktx2` runtime textures
4. the non-blocking asset-budget report now measures real transfer, triangle, draw-call, and GPU-texture evidence for the default closet path by quality tier

## Implemented Slices

### Loader and decoder policy

Covered:

- canonical loader policy lives in `packages/shared-types/src/viewer-asset-policy.ts`
- `viewer-core` shared loader registry reuses that policy
- compatibility runtime loader setup in `packages/runtime-3d/src/runtime-gltf-loader.ts` now also reuses it
- KTX2 support is primed from the live browser renderer before runtime loads
- committed public decoder/transcoder assets now exist under:
  - `apps/web/public/draco`
  - `apps/web/public/basis`

### Runtime LOD adoption

Covered:

- committed avatar sibling `LOD1 / LOD2` files for the two base MPFB avatars
- committed sibling `LOD1 / LOD2` files for the default promoted starter garments and textured-crop hair
- quality-tier-aware runtime path resolution for both avatars and equipped garments/hair in the compatibility stage
- preload/runtime path agreement through `packages/runtime-3d/src/runtime-model-paths.ts`

### Repo-owned KTX2 pipeline

Covered:

- `npm run viewer:bootstrap:ktx-tools`
- `npm run encode:ktx2`
- `npm run build:phase3:texture-samples`
- committed representative runtime `.ktx2` texture samples under canonical viewer-manifest asset roots

### Budget evidence

Covered:

- `npm run report:asset-budget`
- current report summary:
  - `runtimeKtx2TextureCount: 9`
  - `missingLodCount: 30`
  - `balancedReadyAssetCount: 11`
  - `lowReadyAssetCount: 11`
- default closet scene evidence now includes:
  - transfer bytes
  - draw calls
  - triangles
  - approximate GPU texture bytes
  - per-tier pass/warn status

## Evidence

Commands:

```bash
npm run viewer:bootstrap:ktx-tools
npm run build:phase3:texture-samples
npm run generate:lods
npm run report:asset-budget
npm run test:core
npm --prefix apps/web run typecheck
npm --prefix apps/admin run typecheck
npm run validate:avatar3d
npm run validate:garment3d
npm run lint
npm run build:services
npm run build
```

Focused files:

- `packages/shared-types/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `packages/runtime-3d/src/runtime-gltf-loader.ts`
- `packages/runtime-3d/src/runtime-model-paths.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/runtime-3d/src/reference-closet-stage-view.tsx`
- `scripts/bootstrap-ktx-tools.mts`
- `scripts/build-phase3-texture-samples.mts`
- `scripts/encode-ktx2.mts`
- `scripts/generate-lods.mts`
- `scripts/report-asset-budget.mts`
- `apps/web/public/assets/garments/mpfb/**`
- `apps/web/public/assets/viewer-manifests/**`

## Closeout Result

Phase 3 can now be treated as closed for the current refactor track.

- loader policy, decoder public assets, and KTX2 support are not documentation-only anymore; they are wired into active runtime code paths
- the default closet path no longer proves quality tiers with avatar-only assets; equipped promoted garments and hair now ship real sibling `LOD1 / LOD2` files and are consumed by quality-tier runtime resolution
- the repo now owns a reproducible KTX2 tool seam instead of depending on undocumented machine-local `toktx` availability
- the non-blocking budget report can now answer whether the shipped default closet scene fits transfer, draw-call, triangle, and texture budgets for each quality tier

## Risks Carried Into Phase 4 And Beyond

The following items are intentionally not claimed as solved by this closeout:

1. the broader garment catalog still has missing sibling `LOD1 / LOD2` coverage; the current `missingLodCount: 30` is accepted backlog outside the default promoted path
2. committed `.ktx2` samples prove the pipeline and runtime path, but category-wide authored runtime material-map conversion belongs to the asset-factory phases
3. compatibility runtime still owns the active R3F load path; the full viewer-core material/runtime migration remains later work
4. material readability, lighting calibration, and golden-scene differentiation belong to Phase 4
