# `Phase 8 / Batch 2`

Status: `completed`

## Scope

This batch widens the current HQ artifact path in the smallest safe way:

- keep `GET /v1/lab/fit-simulations/:id` unchanged
- add a separate owner-scoped inspection route for the persisted artifact-lineage snapshot

The goal is to expose the stored baseline lineage manifest without coupling that inspection seam to the product-adjacent fit-simulation detail payload.

## Completed work

1. added `fitSimulationArtifactLineageGetResponseSchema` to `packages/contracts`
2. added `getFitSimulationArtifactLineageForUser(...)` to the API service seam
3. added `GET /v1/lab/fit-simulations/:id/artifact-lineage`
4. kept the new route owner-scoped behind the same bearer/dev-bypass auth boundary as the existing lab fit-simulation routes
5. made the route fail closed:
   - `404 NOT_FOUND` when the owned fit simulation does not exist
   - `409 PRECONDITION_FAILED` when the fit simulation exists but has no persisted lineage snapshot yet
6. kept `GET /v1/lab/fit-simulations/:id` intentionally unchanged

## Evidence

- `packages/contracts/src/index.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `docs/api-contract.md`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`

## Explicit non-goals

This batch does **not** claim:

- solver-grade HQ cloth output
- a widened `fitSimulation` detail payload
- `Closet` stage consumption of `artifactLineage`
- a global artifact registry across admin, lab, and product surfaces

The current truth remains:

- `draped_glb` is still an authored-scene merge baseline
- `artifact-lineage.json` is now inspectable, but only through a separate owner-scoped lab route
- `GET /v1/lab/fit-simulations/:id` remains the same product-adjacent detail shape
