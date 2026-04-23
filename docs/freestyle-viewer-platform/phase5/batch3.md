# Phase 5 / Batch 3

## Scope

- extend the Phase 5 avatar publication seam from the HQ fit create path into the paired fit-simulation read path
- keep fit-simulation persistence unchanged while widening only the lab-facing read contract
- expose only a minimal publication snapshot so lab consumers can inspect avatar publication status without inheriting admin-only evidence metadata

## Implemented

1. split the fit-simulation public read contract from the stored fit-simulation record contract in `packages/contracts`
2. added a derived `avatarPublication` field to `GET /v1/lab/fit-simulations/:id`
3. sourced that field at read time from `@freestyle/runtime-3d/avatar-publication-catalog` using the persisted `avatarVariantId`
4. kept the response narrow: `avatarId`, `label`, `approvalState`, `assetVersion`, `runtimeManifestVersion`, `bodySignatureModelVersion`, and `approvedAt`
5. kept the field explicitly non-authoritative for historical lineage; it is a convenience snapshot of the current publication seam, not a persisted certification bundle

## Evidence

- public contract split: `packages/contracts/src/index.ts`
- contract coverage: `packages/contracts/src/domain-contracts.test.ts`
- read-path composition: `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- route coverage:
  - `apps/api/src/routes/fit-simulations.routes.test.ts`
  - `apps/api/src/routes/product-boundary.routes.test.ts`

## Commands

```bash
./node_modules/.bin/tsx --test packages/contracts/src/domain-contracts.test.ts apps/api/src/routes/fit-simulations.routes.test.ts apps/api/src/routes/product-boundary.routes.test.ts
npm run test:core
npm run build:services
```

## Boundary Notes

- `fitSimulationRecordSchema` remains the persistence boundary; the new field is attached only to the public GET response schema
- the lab route does **not** expose avatar evidence paths, source provenance, or the full canonical `AvatarManifest`
- if a future batch needs historical avatar publication lineage, it must add an explicit persisted snapshot instead of reinterpreting this derived read field
