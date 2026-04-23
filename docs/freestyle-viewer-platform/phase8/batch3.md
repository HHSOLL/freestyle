# `Phase 8 / Batch 3`

Status: `completed`

## Scope

This batch adds the first web consumer for the dedicated artifact-lineage inspection seam introduced in `Batch 2`.

The scope stays intentionally narrow:

- keep `GET /v1/lab/fit-simulations/:id` unchanged
- keep artifact lineage in separate web state
- let the current HQ fit panel expose lineage links and baseline metadata without claiming solver-grade HQ output

## Completed work

1. updated `useFitSimulation()` to fetch `/v1/lab/fit-simulations/:id/artifact-lineage` once a simulation reaches a terminal status
2. treated `404` and `409 PRECONDITION_FAILED` from that route as non-fatal inspection outcomes instead of user-facing hard errors
3. updated the HQ fit panel display helper to render:
   - `artifact_lineage` manifest link
   - `drapeSource`
   - `storageBackend`
4. kept lineage separate from the main `fitSimulation` record all the way through the current web consumer seam

## Evidence

- `apps/web/src/hooks/useFitSimulation.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `apps/web/src/components/product/closet-fit-simulation.tsx`
- `apps/web/src/components/product/closet-fit-simulation-display.ts`
- `apps/web/src/components/product/closet-fit-simulation.test.ts`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`

## Explicit non-goals

This batch does **not** claim:

- `draped_glb` stage swap-in in the active closet scene
- solver-backed cloth output
- lineage merged into `GET /v1/lab/fit-simulations/:id`
- admin certification tooling or artifact registry work

The current truth remains:

- `draped_glb` is still an authored-scene merge baseline
- the web panel now has a first read-only lineage consumer
- the main fit-simulation detail payload stays unchanged
