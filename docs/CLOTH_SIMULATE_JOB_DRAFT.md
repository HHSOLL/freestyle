# `fit_simulate_hq_v1` Contract Draft

## Status

- `Phase D / Batch 1` closed the reserved contract seam.
- `Phase D / Batch 2` closed the baseline implementation seam.
- `Phase D / Batch 3` closed the preview artifact seam and promoted the fit-map payload into a typed overlay contract that also seeds `Phase E`.
- `Phase D / Batch 4` closed the HQ artifact-bundle seam with a baseline `draped_glb` plus `metrics_json`.
- the repo now has:
  - versioned request/result schemas for offline high-quality fit simulation
  - active lab create/read routes
  - a queued worker handler
  - persisted `draped_glb`, `fit_map_json`, `preview_png`, and `metrics_json` artifact output
  - a first-party `Closet` consumer seam that can request a run, poll the persisted record, render `preview_png`, and expose the ordered artifact bundle
- the current worker is still a baseline snapshot-driven path, not a full cloth solver

## Purpose

`fit_simulate_hq_v1` is the future offline cloth-simulation path for:

- shareable draped garments
- repeatable fit-map generation
- reference previews that are too heavy for the browser runtime

This contract exists so later worker and storage work can build on a fixed schema instead of ad-hoc JSON blobs.

## Reserved Request Contract

The upstream orchestration request is versioned as `fit-simulate-hq.v1`.

```json
{
  "jobType": "fit_simulate_hq_v1",
  "schemaVersion": "fit-simulate-hq.v1",
  "bodyVersionId": "body-profile:user-id:timestamp",
  "garmentVariantId": "starter-top-soft-casual",
  "avatarManifestUrl": "https://...",
  "garmentManifestUrl": "https://...",
  "materialPreset": "cotton_woven_light",
  "qualityTier": "balanced"
}
```

Notes:

- this is the design-facing request shape used by docs and future orchestrators
- queued jobs still use the canonical `job-payload.v1` envelope around the normalized payload data
- the queue payload strips `jobType` and `schemaVersion` after validation because the outer queue envelope already carries `job_type` and `schema_version`

## Reserved Result Contract

Worker results are expected to use the canonical `job-result.v1` envelope with `fit-simulate-hq.v1` data and typed artifacts.

```json
{
  "schema_version": "job-result.v1",
  "job_type": "fit_simulate_hq_v1",
  "trace_id": "uuid",
  "progress": 100,
  "artifacts": [
    { "kind": "draped_glb", "url": "https://..." },
    { "kind": "fit_map_json", "url": "https://..." },
    { "kind": "preview_png", "url": "https://..." },
    { "kind": "metrics_json", "url": "https://..." }
  ],
  "metrics": {
    "durationMs": 120000,
    "penetrationRate": 0.012,
    "maxStretchRatio": 1.08
  },
  "warnings": [],
  "data": {
    "schemaVersion": "fit-simulate-hq.v1",
    "bodyVersionId": "body-profile:user-id:timestamp",
    "garmentVariantId": "starter-top-soft-casual",
    "qualityTier": "high"
  }
}
```

## Artifact Kinds

- `draped_glb`
- `fit_map_json`
- `preview_png`
- `metrics_json`

These are reserved names and should not be widened without updating `packages/contracts`, job tests, and this document in the same change set.

## Current Code Source Of Truth

- request/result schemas: `packages/contracts/src/index.ts`
- canonical queue helpers: `packages/shared/src/index.ts`
- queue contract regression tests: `packages/shared/src/job-contracts.test.ts`
- active API create/read path:
  - `apps/api/src/routes/fit-simulations.routes.ts`
  - `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
  - `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- active baseline worker:
  - `workers/fit_simulation/src/worker.ts`
  - `workers/runtime/src/worker.ts`

## Active Baseline Behavior

- `POST /v1/lab/jobs/fit-simulations`
  - requires an authenticated user
  - requires a persisted `BodyProfile`
  - requires a published runtime garment id
  - queues `fit_simulate_hq_v1`
- `GET /v1/lab/fit-simulations/:id`
  - returns the persisted simulation record
  - exposes typed artifacts, warnings, and metrics
- the current worker writes:
  - `draped_glb`
  - `fit_map_json`
  - `preview_png`
  - `metrics_json`

The current `draped_glb` artifact is an authored-scene merge baseline built from the avatar and garment runtime GLBs. It is a real persisted binary artifact for cache/persistence/swap-in plumbing, but it is not yet solver-deformed cloth output.

The current `fit_map_json` artifact is a baseline evidence payload built from:

- persisted body-profile snapshot
- published runtime-garment snapshot
- shared `GarmentFitAssessment`
- shared `garmentInstantFitReport`
- typed overlay maps:
  - `easeMap`
  - `stretchMap`
  - `collisionRiskMap`
  - `confidenceMap`

The current `preview_png` artifact is a generated raster summary card built from the same typed fit-map payload. It is a review artifact, not a rendered cloth-solver image.

The current `metrics_json` artifact is a typed summary blob containing the recorded HQ metrics, dominant fit-map summary, artifact set, and current drape-source mode.

This keeps `Phase D` honest: there is now a working async/offline artifact path with a full bundle, but it is still not a full cloth-simulation runtime.

## Still Not Implemented

- true solver-backed cloth state instead of authored-scene merge baseline output
- material-calibrated draped mesh deformation rather than authored-scene merge assembly
- live stage swap-in that renders `draped_glb` directly inside the active `Closet` scene instead of the current preview-image + artifact-link surface

Until those land, this document describes the active baseline plus the remaining fidelity gap.
