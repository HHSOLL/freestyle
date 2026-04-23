# Phase 1 Closeout

## Scope

This note closes the Phase 1 browser and product-facing seam for the viewer-platform refactor.

Phase 1 goals covered here:

1. `viewer-core` owns the imperative renderer/controller lifecycle.
2. `viewer-react` owns the canonical React adapter seam.
3. the lab harness proves the direct `viewer-core + viewer-react` path.
4. the product `Closet` route can be forced onto `viewer-react` without blank-canvas regression.

## Evidence

### Browser harness

- Route: `/app/lab/viewer-platform`
- Host mode: forced `viewer-react`
- Coverage:
  - canonical `AvatarStageViewport` seam
  - stage fallback / load lifecycle
  - viewport resize propagation
  - proxy avatar / garment scene updates

Commands:

```bash
npx playwright test apps/web/e2e/viewer-platform.spec.ts --project=chromium
```

### Product-route smoke

- Route: `/app/closet`
- Host mode: `NEXT_PUBLIC_VIEWER_HOST=viewer-react`
- Coverage:
  - product shell still mounts
  - forced `viewer-react` stage appears on the product route
  - no immediate `viewer-core stage failed` regression

Commands:

```bash
NEXT_PUBLIC_VIEWER_HOST=viewer-react npx playwright test apps/web/e2e/closet-viewer-react.spec.ts --project=chromium
```

### Core validation

Commands:

```bash
npm run test:core
npm --prefix apps/web run typecheck
npm run lint
npm run build
```

## Closeout Result

Phase 1 can now be treated as closed for the current refactor track.

- `viewer-core` is no longer only a scaffold; it owns a real imperative runtime path.
- `viewer-react` is no longer a thin pass-through to `runtime-3d`; it owns the canonical adapter seam and the lab harness runs through that seam.
- `runtime-3d` remains the compatibility/default product host, but the product route now has an explicit forced-host smoke for the `viewer-react` path.

## Risks Carried Into Phase 2

The following risks are intentionally not marked resolved by this note:

1. browser-level first avatar paint and garment-swap latency telemetry are still missing
2. runtime draw-call / triangle / GPU texture metrics are still not collected from the browser path
3. context-loss recovery has code-path protection, but not full browser-level evidence
4. `runtime-3d` is still the default production host until later cutover phases

Those risks stay tracked from:

- `/Users/sol/Desktop/fsp/docs/freestyle-viewer-platform/phase0/baseline-performance.md`
- `/Users/sol/Desktop/fsp/docs/freestyle-viewer-platform/phase0/current-architecture-risk.md`
