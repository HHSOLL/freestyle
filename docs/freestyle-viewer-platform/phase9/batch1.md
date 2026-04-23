# Phase 9 / Batch 1

## Scope

This batch starts `Phase 9` as the first honest product-route cutover slice:

1. `/app/closet` now owns an explicit route-scoped `viewer-react` release flag and kill switch
2. the flagged `viewer-react` path keeps runtime asset warm-up instead of silently dropping preload
3. the flagged `viewer-react` path exposes the same preview-runtime / preview-engine evidence surface shape that the compatibility host already used
4. the first `Closet` UX latency smoke is promoted to a blocking gate under the explicit Phase 9 flag

This batch does **not** claim full audience rollout, `runtime-3d` removal, mobile gate freeze, or solver-grade cloth truth.

## Implemented

- `apps/web/src/lib/closet-viewer-phase9.ts`
  - route-scoped `Phase 9` host selection
  - release flag: `NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED=true`
  - kill switch: `NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH=true`
  - fallback order: Phase 9 kill switch -> Phase 9 flag -> global viewer host override -> `runtime-3d`
  - reads direct `NEXT_PUBLIC_*` env values instead of passing `process.env` through wholesale so the route stays hydration-stable between the server render and client hydration
- `apps/web/src/components/product/V18ClosetExperience.tsx`
  - passes the resolved host explicitly to both `AvatarStageViewport` and `preloadViewerAssets(...)`
  - exposes route-level host / flag-source attrs on the product root
  - exposes stable `data-closet-asset-*` attrs for the blocking smoke
- `packages/viewer-react/src/host-selection.ts`
  - `viewer-react` no longer treats preload delegation as a no-op
  - it now warms runtime assets through the same runtime preload seam used by the compatibility host
- `packages/viewer-react/src/freestyle-viewer-host.tsx`
  - emits static-fit preview-runtime evidence
  - emits static-fit preview-engine evidence
  - keeps existing first-avatar-paint and garment-swap latency attrs
- `apps/web/e2e/closet-viewer-react.spec.ts`
  - now asserts:
    - route cutover attrs
    - the route leaves the outer `Preparing 3D fitting stage` fallback before latency assertions begin
    - preview-runtime / preview-engine attrs
    - preview-runtime / preview-engine typed event emission on `freestyle:viewer-event`
    - real garment-swap latency evidence
    - conservative `<= 300ms` garment-swap latency threshold
- `.github/workflows/quality.yml`
  - now installs Chromium and runs the flagged `Phase 9` `Closet` smoke as a blocking gate

## Evidence

- `apps/web/src/lib/closet-viewer-phase9.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `packages/viewer-react/src/host-selection.ts`
- `packages/viewer-react/src/freestyle-viewer-host.tsx`
- `packages/viewer-react/src/preview-evidence.ts`
- `apps/web/e2e/closet-viewer-react.spec.ts`
- `.github/workflows/quality.yml`

## Non-Goals Carried Forward

1. `runtime-3d` is still the default control host when the Phase 9 release flag is off
2. `Canvas`, `Community`, `Profile`, and admin are still outside this cutover
3. the `Closet` HQ fit panel is still lab-backed and is not promoted to a product namespace in this batch
4. current `draped_glb` remains an authored-merge artifact, not solver-grade cloth truth
