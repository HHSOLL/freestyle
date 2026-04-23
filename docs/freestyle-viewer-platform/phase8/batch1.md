# `Phase 8 / Batch 1`

Status: `completed`

## Scope

This batch starts `Phase 8` by hardening the existing HQ fit-simulation artifact path without overstating current fidelity.

The repo already had a working baseline bundle:

- `draped_glb`
- `fit_map_json`
- `preview_png`
- `metrics_json`

What was still missing was a canonical identity seam for that bundle. The API create path, shared queue fallback, and worker all depended on `cacheKey`, but the derivation inputs were not yet fully aligned and there was no persisted lineage manifest describing how the current artifact bundle was produced.

## Completed work

1. introduced a canonical `fitSimulationCacheKeyParts` contract in `packages/contracts` and moved `buildFitSimulationCacheKey(...)` onto that shared shape
2. widened the canonical HQ fit job payload to carry `avatarVariantId` so queue normalization can preserve the same cache identity the API create path already uses
3. added a baseline-safe `fitSimulationArtifactLineage` schema for the current bundle, including:
   - `artifactLineageId`
   - `cacheKey`
   - `cacheKeyParts`
   - `avatarManifestUrl`
   - `garmentManifestUrl`
   - `storageBackend`
   - `drapeSource`
   - ordered `artifactKinds`
   - `manifestKey`
   - `manifestUrl`
4. taught `worker_fit_simulate_hq` to persist an internal `artifact-lineage.json` sidecar next to the existing artifact bundle and to store that lineage snapshot on the internal fit-simulation record
5. added `artifactLineageId` to the typed `metrics_json` payload so the summary artifact can point back to the baseline lineage manifest
6. kept `/v1/lab/fit-simulations/:id` unchanged on purpose; this batch does **not** widen the product-adjacent lab read contract

## Evidence

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/job-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`

## Explicit non-goals

This batch does **not** claim:

- solver-deformed cloth output
- a full HQ artifact registry shared across product/admin/runtime surfaces
- public lab route widening for lineage metadata
- direct `Closet` stage swap-in of `draped_glb`
- `deformation_cache.bin` support

The current truth remains unchanged:

- `draped_glb` is still an authored-scene merge baseline
- `preview_png` is still a review artifact, not a rendered cloth-solver image
- `metrics_json` now points at lineage, but does not certify solver-grade HQ quality
