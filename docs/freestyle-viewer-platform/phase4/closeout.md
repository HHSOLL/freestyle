# Phase 4 Closeout

## Scope

This note closes Phase 4 for the current viewer-platform refactor track as a compatibility-runtime material and lighting closeout.

It does **not** claim full `viewer-core` parity with the production `runtime-3d` path, and it does **not** claim that runtime materials are already driven end-to-end from authored manifest JSON. The active scope closed here is narrower:

1. the shipped compatibility stage now has an explicit studio-lighting rig seam instead of inline scene literals
2. active runtime material calibration is now centralized, testable, and named by material class instead of scattered mesh-name heuristics
3. the `viewer-core` proxy stage now has a matching material-preset library for browser-harness evidence
4. a dedicated lab route now exists for Phase 4 material readability and lighting verification

## Implemented Slices

### Studio lighting rig extraction

Covered:

- pure lighting spec and backdrop derivation now live in `packages/runtime-3d/src/studio-lighting-rig-policy.ts`
- the active compatibility stage consumes that policy through `packages/runtime-3d/src/reference-closet-stage-policy.ts`
- the active browser scene now mounts one reusable `StudioLightingRig` component from `packages/runtime-3d/src/studio-lighting-rig.tsx`
- PMREM environment setup, ACES tone mapping, exposure control, and shader warmup now sit behind one explicit runtime seam

### Runtime material calibration seam

Covered:

- runtime material-class inference and calibration now live in `packages/runtime-3d/src/material-system.ts`
- `packages/runtime-3d/src/closet-stage.tsx` now routes compatibility-stage material tuning through that helper instead of inline roughness/metalness/env-map heuristics
- the current active classes covered by the compatibility stage are:
  - `skin`
  - `hair`
  - `eye`
  - `cotton`
  - `denim`
  - `leather`
  - `rubber`
  - `knit`
  - `synthetic`

### Viewer-core proxy presets

Covered:

- `packages/viewer-core/src/material-system.ts` now owns proxy-stage material presets by class
- `packages/viewer-core/src/proxy-stage.ts` consumes those presets instead of hardcoded `MeshStandardMaterial` values
- this is a harness-facing preset library only; it is evidence for class readability, not a claim that the product runtime has already migrated off the compatibility stage

### Phase 4 lab harness

Covered:

- `/app/lab/material-system` now renders the current material-class preset grid under the canonical studio-lighting rig
- the harness exposes `quality tier` and `lighting mode` switches for deterministic smoke coverage
- the lab route is evidence-only and remains outside the main product flow

## Evidence

Commands:

```bash
npm run test:core
npm --prefix apps/web run typecheck
npm --prefix apps/admin run typecheck
npm run lint
npm run build:services
npm run build
npx playwright test apps/web/e2e/material-system.spec.ts --project=chromium
```

Focused files:

- `packages/runtime-3d/src/studio-lighting-rig-policy.ts`
- `packages/runtime-3d/src/studio-lighting-rig.tsx`
- `packages/runtime-3d/src/material-system.ts`
- `packages/runtime-3d/src/reference-closet-stage-policy.ts`
- `packages/runtime-3d/src/reference-closet-stage-view.tsx`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/viewer-core/src/material-system.ts`
- `packages/viewer-core/src/proxy-stage.ts`
- `apps/web/src/components/product/MaterialSystemHarnessExperience.tsx`
- `apps/web/src/app/app/lab/material-system/page.tsx`
- `apps/web/e2e/material-system.spec.ts`

## Closeout Result

Phase 4 can now be treated as closed for the current refactor track.

- the active compatibility stage no longer hides studio-lighting and material-calibration policy inside large runtime files
- material readability for the current compatibility stage is backed by explicit unit-tested calibration helpers
- the repo now has a dedicated browser harness for Phase 4 evidence instead of relying only on the main closet path for visual inspection
- the viewer-core proxy stage now speaks the same high-level material-class language as the Phase 4 contracts, which makes later migration work less lossy

## Risks Carried Into Phase 5 And Beyond

The following items are intentionally not claimed as solved by this closeout:

1. the active product runtime still consumes compatibility-stage mesh-name heuristics rather than fully authored manifest-driven material bundles
2. `viewer-core` remains a proxy-stage harness and is not yet the shipping product renderer
3. skin, hair, and fabric readability are calibrated at the runtime stage level, but asset-factory quality and authored texture/material production still belong to Phases 5 and 6
4. this phase adds a lab smoke route, not a full hardware-backed golden-scene visual gate; broader visual/fit certification remains later work
