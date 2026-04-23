# Phase 8 / Batch 4

## Goal

Close the current repo-scoped `Phase 8` baseline without overstating solver-grade HQ truth.

The missing seam after Batches 1-3 was an operator-facing inspection boundary. The repo already had:

1. canonical HQ cache-key parts and persisted `artifact-lineage.json`
2. an owner-scoped lab inspection route
3. a first web consumer in the current `Closet` HQ fit panel

What it still did not have was an admin/operator route that could inspect the persisted HQ bundle without reusing the owner-scoped lab path or widening the public detail contract.

## Implemented

1. added `GET /v1/admin/fit-simulations/:id`
2. kept the route admin-only and read-only
3. returned one typed inspection envelope:
   - `fitSimulation`
   - `artifactLineage`
4. reused the current persisted fit-simulation record and lineage snapshot instead of introducing new storage, mutation workflow, or registry semantics
5. kept `/v1/lab/fit-simulations/:id` and `/v1/lab/fit-simulations/:id/artifact-lineage` unchanged

## Evidence

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.test.ts`

## Non-goals

This batch does **not** claim:

- solver-grade `draped_glb` truth
- artifact certification or approve/reject workflow
- a global artifact registry or list route
- product-path widening for `fitSimulation` detail
