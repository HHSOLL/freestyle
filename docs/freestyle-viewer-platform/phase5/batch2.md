# Phase 5 / Batch 2

## Scope

- make the Phase 5 avatar publication seam serve one production-adjacent consumer
- remove duplicate avatar runtime path knowledge from the HQ fit-simulation create path
- keep the external fit-simulation API contract unchanged while sourcing avatar metadata from the published runtime avatar catalog

## Implemented

1. updated `apps/api/src/modules/fit-simulations/fit-simulations.service.ts` to resolve avatar metadata from `@freestyle/runtime-3d/avatar-publication-catalog`
2. removed the local avatar model-path map from the fit-simulation create path
3. added route evidence that persisted fit-simulation records now use the catalog-derived avatar manifest URL
4. split the runtime render-catalog version literal from the canonical asset-factory `avatar-manifest.v1` contract so the Phase 5 publication seam no longer overclaims full manifest coverage

## Evidence

- fit-simulation consumer: `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- test coverage:
  - `apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts`
  - `apps/api/src/routes/fit-simulations.routes.test.ts`
- catalog source of truth: `packages/runtime-3d/src/avatar-publication-catalog.ts`

## Commands

```bash
./node_modules/.bin/tsx --test apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts apps/api/src/routes/fit-simulations.routes.test.ts
npm run test:core
npm run build:services
```

## Boundary Notes

- this batch keeps `avatarManifestUrl` as the existing GLB-oriented field used by the current HQ fit path
- this batch does **not** introduce a full canonical `AvatarManifest` tree into the fit-simulation worker contract
- the runtime avatar publication seam now uses `runtime-avatar-render-manifest.v1`, which is intentionally distinct from the asset-factory `avatar-manifest.v1`
- later phases can swap the HQ worker over to richer avatar artifacts without reintroducing local avatar-path maps in API code
