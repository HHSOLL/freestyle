# Phase 3 / Batch 1

## Scope

This batch starts Phase 3 of the viewer-platform plan with the smallest safe slice:

1. lock the canonical loader policy for `viewer-core`
2. commit the public KTX2 transcoder assets required by that policy
3. introduce a non-blocking asset-budget evidence seam
4. add first-party CLI entry points for LOD generation and KTX2 encoding

This batch does **not** claim that the runtime has already migrated to shipped KTX2 textures or full authored `LOD0 / LOD1 / LOD2` coverage.

## Implemented

- `packages/shared-types/src/viewer-asset-policy.ts` now owns:
  - DRACO decoder path
  - KTX2 transcoder path
  - KTX2 worker limit
  - runtime material texture extension preference
  - preferred UI image extensions
  - DRACO vs Meshopt priority notes
- `packages/viewer-core/src/loader-registry.ts` now resolves one canonical shared loader policy instead of embedding raw path literals
- `apps/web/public/basis/basis_transcoder.js`
- `apps/web/public/basis/basis_transcoder.wasm`
- `npm run viewer:sync:transcoders`
- `npm run report:asset-budget`
- `npm run build:display-asset`
- `npm run generate:lods`
- `npm run encode:ktx2`

## Evidence

- current non-blocking asset budget report: `output/asset-budget-report/latest.json`
- current report facts from this batch:
  - committed runtime KTX2 textures under `apps/web/public/assets`: `0`
  - runtime GLBs missing sibling `.lod1/.lod2` variants: `41`
  - first visible avatar transfer currently warns on mobile-balanced targets for both committed base avatars
  - default closet scene bytes remain under the current transfer target

## Why This Is Phase 3

The earlier phases fixed lifecycle and contract shape.
This batch begins the asset-delivery phase:

- the runtime now has an explicit repo-owned KTX2 transcoder path
- the loader policy is no longer an undocumented local convention
- budget drift is now recorded through one report instead of inferred from scattered file-size checks

## Remaining Phase 3 Gaps

1. generate and commit real sibling `LOD1 / LOD2` assets for promoted avatars and garments
2. replace placeholder runtime texture expectations with committed KTX2 material textures
3. widen the non-blocking report into route/runtime evidence that includes triangles, draw calls, and texture-memory telemetry
4. connect the new display-asset CLI seams to actual asset-factory authoring workflows
