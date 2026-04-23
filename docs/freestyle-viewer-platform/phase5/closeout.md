# Phase 5 Closeout

## Scope

This note closes Phase 5 for the current viewer-platform refactor track as an avatar publication and consumer-seam phase.

It does **not** claim a full avatar asset-factory rollout, persisted publication lineage, or avatar authoring write workflow. The scope closed here is narrower:

1. the committed MPFB base variants now have a typed read-only publication seam
2. admin/runtime consumers read that seam from one shared source of truth
3. the first production-adjacent lab consumer now resolves avatar publication metadata from that same seam

## Implemented Slices

### Batch 1. Avatar publication catalog

Covered:

- `packages/runtime-3d/src/avatar-publication-catalog.ts` now derives the committed base-avatar publication catalog
- `GET /v1/admin/avatars` and `GET /v1/admin/avatars/:id` expose that catalog as a dedicated read-only admin boundary
- `output/avatar-certification/latest.json` is the machine-readable certification bundle for the current base variants
- `validate:avatar3d` now fails closed on publication/evidence/LOD drift for those committed variants

### Batch 2. HQ fit create-path consumer

Covered:

- `POST /v1/lab/jobs/fit-simulations` now resolves avatar runtime metadata from the publication catalog instead of an API-local path map
- queued HQ fit jobs now inherit the same publication seam that admin/runtime inspection uses

### Batch 3. HQ fit read-path snapshot

Covered:

- `GET /v1/lab/fit-simulations/:id` now exposes a minimal `avatarPublication` snapshot in the public read contract
- the read contract remains intentionally narrower than the admin publication catalog and does not expose evidence paths or provenance

## Evidence

- `packages/runtime-3d/src/avatar-publication-catalog.ts`
- `apps/api/src/routes/runtime-avatars.routes.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `packages/contracts/src/index.ts`
- `output/avatar-certification/latest.json`
- `docs/freestyle-viewer-platform/phase5/batch1.md`
- `docs/freestyle-viewer-platform/phase5/batch2.md`
- `docs/freestyle-viewer-platform/phase5/batch3.md`

## Closeout Result

Phase 5 can now be treated as closed for the current viewer-platform refactor track.

- avatar publication metadata no longer lives only in scattered runtime constants
- admin inspection, runtime validation, and the first HQ fit consumer all share one typed publication seam
- the remaining open work moves to garment-side asset-factory certification and later fitting/runtime phases

## Risks Carried Into Phase 6 And Beyond

The following items are intentionally not claimed as solved by this closeout:

1. the avatar publication seam is still read-only
2. the lab-facing `avatarPublication` field is a current read-time snapshot, not persisted historical lineage
3. the route does **not** expose a full canonical asset-factory avatar manifest tree
4. garment-side asset-factory certification remains a separate Phase 6 track
