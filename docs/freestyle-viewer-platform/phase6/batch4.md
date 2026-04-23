# Phase 6 / Batch 4

## Scope

- keep the garment certification seam admin-only and read-only
- add one operator-facing triage step so the admin catalog can separate starter-covered garments from uncovered ones
- keep `/v1/admin/garments*`, `/v1/closet/runtime-garments`, and the mutable publish editor contract unchanged

## Implemented

1. added admin-side certification coverage helpers for:
   - starter-covered id indexing
   - local covered / missing filtering
   - current-list coverage summary counts
2. taught `AdminWorkspace` to:
   - expose `All coverage / Starter covered / Bundle missing` local filters
   - keep the visible garment list aligned with the active starter certification filter
   - show current-list coverage counts without widening API payloads
3. kept the certification seam read-only:
   - the coverage filter is derived entirely from `/v1/admin/garment-certifications*`
   - no certification data is written back into garment manifests
   - no certification data is injected into `/v1/admin/garments*` or `/v1/closet/runtime-garments`

## Evidence

- admin helper: `apps/admin/src/lib/garmentCertification.ts`
- admin helper coverage: `apps/admin/src/lib/garmentCertification.test.ts`
- admin workspace integration: `apps/admin/src/components/AdminWorkspace.tsx`

## Commands

```bash
npm --prefix apps/admin run typecheck
npm run test:core
npm run lint
npm run build:admin
npm run build
npm run build:services
```

## Boundary Notes

- this batch is still admin-only and read-only
- the coverage filter is local UI state only; it does not widen or mutate server contracts
- a garment missing from the starter bundle remains “not covered by the current starter bundle”, not “publish failed”
