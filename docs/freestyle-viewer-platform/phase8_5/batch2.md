# Phase 8.5 / Batch 2

## Goal

Extend the admin HQ fit inspection seam from manual `detail-by-id` to a bounded read-only catalog that operators can actually triage.

The smallest safe slice is:

1. one admin-only `list + detail` pattern for fit simulations
2. no mutation workflow
3. no write-side linkage back into garment publication rows

## Implemented

1. added `fitSimulationAdminInspectionListResponseSchema`
2. added `GET /v1/admin/fit-simulations`
3. added repository/service list seams with bounded filters:
   - `garment_variant_id`
   - `status`
   - `has_artifact_lineage`
   - `limit`
4. kept store-missing behavior fail-soft as `200 { items: [], total: 0 }`

## Evidence

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.test.ts`

## Non-goals

This batch does **not** add:

- approve / reject / certify mutations
- persisted garment-to-fit foreign keys
- historical certification lineage beyond the current stored fit-simulation records
- product-path widening or solver-quality claims
