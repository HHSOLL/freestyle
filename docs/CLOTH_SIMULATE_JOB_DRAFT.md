# `fit_simulate_hq_v1` Contract Draft

## Status

- `Phase D / Batch 1` closed the reserved contract seam.
- the repo now has versioned request/result schemas for offline high-quality fit simulation
- there is still no active API create route, no worker handler, and no persistence flow for this job type

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
  "bodyVersionId": "uuid",
  "garmentVariantId": "uuid",
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
    { "kind": "preview_png", "url": "https://..." }
  ],
  "metrics": {
    "durationMs": 120000,
    "penetrationRate": 0.012,
    "maxStretchRatio": 1.08
  },
  "warnings": [],
  "data": {
    "schemaVersion": "fit-simulate-hq.v1",
    "bodyVersionId": "uuid",
    "garmentVariantId": "uuid",
    "qualityTier": "high"
  }
}
```

## Artifact Kinds

- `draped_glb`
- `fit_map_json`
- `preview_png`

These are reserved names and should not be widened without updating `packages/contracts`, job tests, and this document in the same change set.

## Current Code Source Of Truth

- request/result schemas: `packages/contracts/src/index.ts`
- canonical queue helpers: `packages/shared/src/index.ts`
- queue contract regression tests: `packages/shared/src/job-contracts.test.ts`

## Not Implemented Yet

The following are still future work:

- a public or admin API route that creates `fit_simulate_hq_v1` jobs
- a worker handler that claims and processes this job type
- storage/persistence for draped meshes and fit maps
- product UI that requests or renders HQ simulation artifacts

Until those land, this document describes a reserved contract only.
