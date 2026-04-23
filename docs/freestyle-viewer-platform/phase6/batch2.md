# Phase 6 / Batch 2

## Scope

- keep the garment asset-factory seam read-only
- add an admin-only certification inspection surface backed by `output/garment-certification/latest.json`
- keep `/v1/closet/runtime-garments` and `/v1/admin/garments*` unchanged

## Implemented

1. added admin-only certification response envelopes to `@freestyle/contracts`
2. added a read-only API service that loads and parses `output/garment-certification/latest.json`
   - default path resolution is repo-root-relative from `process.cwd()`
   - `GARMENT_CERTIFICATION_BUNDLE_PATH` may override the bundle path for explicit deployments/tests
3. exposed:
   - `GET /v1/admin/garment-certifications`
   - `GET /v1/admin/garment-certifications/:id`
4. added route coverage for list, detail, category filtering, and auth rejection

## Evidence

- contracts: `packages/contracts/src/index.ts`
- contract coverage: `packages/contracts/src/domain-contracts.test.ts`
- service: `apps/api/src/modules/garments/garment-certification.service.ts`
- routes: `apps/api/src/routes/garment-certification.routes.ts`
- route coverage: `apps/api/src/routes/garment-certification.routes.test.ts`
- source bundle: `output/garment-certification/latest.json`

## Commands

```bash
npm run validate:garment3d
./node_modules/.bin/tsx --test packages/contracts/src/domain-contracts.test.ts apps/api/src/routes/garment-certification.routes.test.ts
npm run test:core
npm run build:services
```

## Boundary Notes

- this batch is admin-only and read-only
- it does not persist certification lineage or modify garment publication rows
- it does not widen `/v1/closet/runtime-garments`
- it does not widen existing `/v1/admin/garments*` response payloads
- the route currently reflects only the committed starter garments covered by `output/garment-certification/latest.json`
