# Phase 8 Closeout

## Scope

This note closes `Phase 8` for the current viewer-platform refactor track as an HQ artifact identity, lineage, and inspection phase.

It does **not** claim solver-grade cloth truth, stage swap-in of authoritative `draped_glb`, or a full HQ artifact certification workflow. The scope closed here is narrower:

1. the baseline HQ bundle now has one canonical cache identity
2. the worker persists a typed `artifact-lineage.json` sidecar for that bundle
3. lab and admin inspection seams can read that lineage without widening the main fit-simulation detail payload
4. the current web panel can consume lineage as separate read-only state

## Implemented Slices

### Batch 1. Canonical identity and persisted lineage

Covered:

- canonical `fitSimulationCacheKeyParts`
- internal `fitSimulationArtifactLineage`
- persisted `artifact-lineage.json` sidecar
- `metrics_json.artifactLineageId`

### Batch 2. Owner-scoped lab inspection

Covered:

- `GET /v1/lab/fit-simulations/:id/artifact-lineage`
- `404` for missing simulation
- `409 PRECONDITION_FAILED` for missing lineage snapshot

### Batch 3. First web consumer

Covered:

- `useFitSimulation()` now reads lineage separately from the main fit-simulation detail payload
- the current `Closet` HQ fit panel exposes `artifact_lineage`, `drapeSource`, and `storageBackend`

### Batch 4. Admin/operator inspection seam

Covered:

- `GET /v1/admin/fit-simulations/:id`
- admin-only read-only inspection of `fitSimulation + artifactLineage`
- no new persistence, no registry, no mutation workflow

## Evidence

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.test.ts`
- `apps/web/src/hooks/useFitSimulation.ts`
- `apps/web/src/components/product/closet-fit-simulation.tsx`
- `apps/web/src/components/product/closet-fit-simulation-display.ts`
- `docs/freestyle-viewer-platform/phase8/batch1.md`
- `docs/freestyle-viewer-platform/phase8/batch2.md`
- `docs/freestyle-viewer-platform/phase8/batch3.md`
- `docs/freestyle-viewer-platform/phase8/batch4.md`

## Closeout Result

`Phase 8` can now be treated as closed for the current viewer-platform refactor track.

- HQ artifact identity no longer depends on loosely matched API/worker assumptions
- lineage inspection is now available through both owner-scoped lab and admin-scoped read-only seams
- product state still keeps lineage separate from the main fit-simulation detail payload

## Risks Carried Into Phase 8.5 And Beyond

The following items are intentionally not claimed as solved by this closeout:

1. `draped_glb` can now be emitted as a starter-path deterministic `solver-output` baseline when vertex deformation is applied, but this is still not certification-grade cloth truth
2. the admin inspection seam is still read-only and detail-by-id only
3. there is still no approve/reject/certify workflow for HQ artifact bundles
4. broader asset + fit certification tooling remains the separate `Phase 8.5` track
