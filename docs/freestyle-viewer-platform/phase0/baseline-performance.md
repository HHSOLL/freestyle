# Freestyle Viewer Platform Phase 0 Baseline Performance

## Capture metadata

- status: `partial`
- capturedAt: `2026-04-23T01:19:36+0900`
- sourceCommit: `4bf4038`
- sourceBranch: `codex/freestyle-viewer-platform-refactor`
- intent: freeze the measurable pre-cutover baseline before `viewer-core` replaces the current `runtime-3d` hot path

## Current command baseline

| Command | Result | Wall clock |
| --- | --- | ---: |
| `npm run lint` | pass | `74.239s` |
| `npm run test:core` | pass (`196` pass, `1` skipped) | `43.236s` |
| `npm run build:services` | pass | `56.311s` |
| `npm --prefix apps/admin run typecheck` | pass | `12.616s` |
| `npm --prefix apps/web run typecheck` | pass | `14.996s` |

## Existing runtime evidence

### Preview-cloth benchmark

Source: `scripts/bench-cloth-spike.mjs`

```json
{
  "scenario": "cloth-4a-preview-benchmark",
  "fpsEquivalent": 964.95,
  "elapsedMs": 1865.38,
  "resetCount": 45,
  "failureCount": 0,
  "guard": {
    "lowFpsTrip": true,
    "invalidDeltaTrip": true
  },
  "pass": true
}
```

This is a CPU preview-cloth spike benchmark, not a product-route garment swap latency measurement.

### Runtime asset-size baseline

Source assets:

- `apps/web/public/assets/avatars/mpfb-female-base.glb`
- `apps/web/public/assets/avatars/mpfb-male-base.glb`
- `apps/web/public/assets/garments/mpfb/female/top_soft_casual_v4.glb`
- `apps/web/public/assets/garments/mpfb/female/bottom_soft_wool_v1.glb`
- `apps/web/public/assets/garments/mpfb/female/shoes_soft_sneaker.glb`
- `apps/web/public/assets/garments/mpfb/female/outer_tailored_layer.glb`
- `apps/web/public/assets/garments/mpfb/female/hair_soft_bob.glb`
- `apps/web/public/assets/garments/mpfb/female/hair_signature_ponytail.glb`

Budget source: `packages/runtime-3d/src/runtime-asset-budget.ts`

| Asset | Bytes | Budget | Status |
| --- | ---: | ---: | --- |
| `femaleAvatar` | `2,844,620` | `3,250,000` | within budget |
| `maleAvatar` | `2,122,616` | `3,250,000` | within budget |
| `defaultTop` | `81,804` | `300,000` | within budget |
| `defaultBottom` | `75,652` | `300,000` | within budget |
| `defaultShoes` | `202,516` | `300,000` | within budget |
| `heroOuterwear` | `132,308` | `300,000` | within budget |
| `heroHair` | `193,524` | `500,000` | within budget |
| `defaultHair` | `293,904` | `500,000` | within budget |
| `defaultClosetScene` | `3,204,592` | `3,800,000` | within budget |

### Runtime optimization rollup

Source: `output/runtime-optimization/latest.json`

```json
{
  "generatedAt": "2026-04-18T08:20:59.774Z",
  "optimizedCount": 41,
  "totals": {
    "beforeBytes": 50397296,
    "afterBytes": 11518936,
    "savedBytes": 38878360
  }
}
```

### Visual regression baseline

The current committed route-shell and closet-tier goldens are frozen through:

- `apps/web/e2e/visual-regression.spec.ts`
- `apps/web/e2e/visual-regression.spec.ts-snapshots/`
- `docs/qa/phase5-visual-regression-2026-04-22.md`
- `docs/freestyle-viewer-platform/phase0/baseline-visuals/manifest.json`

## Explicit instrumentation gaps

The following Phase 0 metrics are still missing and must remain marked as missing until real instrumentation exists:

1. browser-level first avatar paint for `/app/closet`
2. cached and uncached garment swap latency on the product route
3. runtime draw calls, visible triangles, and GPU texture memory telemetry
4. WebGL context loss and restore timing
5. automated mobile smoke and mobile visual baselines
6. end-to-end preview-fit latency from user click to visible swap

## Interpretation

Phase 0 is intentionally frozen as `partial`, not `complete`.

- The repo already has strong command-level, artifact-level, and visual-baseline evidence.
- The repo does not yet have the browser/runtime telemetry required by the new viewer-platform program.
- Future phases must compare against this document, but they must not over-claim that the missing latency and GPU metrics already exist.
