# Phase 6 / Batch 3

## Scope

- keep the new certification seam admin-only and read-only
- add the first `apps/admin` consumer for `/v1/admin/garment-certifications*`
- keep garment editor/save state separate from certification inspection state

## Implemented

1. added an admin-side certification helper for coverage lookup and summary aggregation
2. added a dedicated read-only `GarmentCertificationPanel` component
3. taught `AdminWorkspace` to:
   - load the starter certification catalog
   - fetch certification detail for the selected garment only when the bundle covers that id
   - show starter-only certification badges and a read-only inspection panel
4. kept the publish editor contract unchanged; certification data never feeds back into draft/edit payloads

## Evidence

- admin helper: `apps/admin/src/lib/garmentCertification.ts`
- admin helper coverage: `apps/admin/src/lib/garmentCertification.test.ts`
- admin consumer: `apps/admin/src/components/GarmentCertificationPanel.tsx`
- admin workspace integration: `apps/admin/src/components/AdminWorkspace.tsx`

## Commands

```bash
npm run lint
npm --prefix apps/admin run typecheck
npm run test:core
npm run build:admin
```

## Boundary Notes

- this batch consumes only `/v1/admin/garment-certifications*`
- it does not widen `/v1/admin/garments*`
- it does not widen `/v1/closet/runtime-garments`
- it does not mutate publication metadata or certification lineage
- a missing certification record means “not covered by the current starter bundle”, not “publish failed”
