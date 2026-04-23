# Phase 2 Telemetry Slice

## Scope

This note records the first browser-visible telemetry seam for the viewer-platform refactor.

Phase 2 work covered here:

1. keep `viewer-core` telemetry typed through `@freestyle/viewer-protocol`
2. let `viewer-react` derive route-level latency evidence without moving renderer ownership back into React
3. expose that evidence to browser smoke through stable host attributes and typed custom events
4. keep the seam non-blocking while `runtime-3d` remains the default production host

## Implemented Seam

The forced `viewer-react` host now derives and exposes:

- `viewer.host.first-avatar-paint`
- `viewer.host.garment-swap.preview-latency`
- `data-first-avatar-paint-ms`
- `data-last-garment-swap-ms`
- `data-last-preview-source`
- `data-last-telemetry-name`
- `data-scene-sequence`
- `data-active-scene-kind`
- browser `CustomEvent`s:
  - `freestyle:viewer-telemetry`
  - `freestyle:viewer-event`

The seam is implemented in `packages/viewer-react/src/route-telemetry.ts` and `packages/viewer-react/src/freestyle-viewer-host.tsx`.

## Evidence

### Harness route

- Route: `/app/lab/viewer-platform`
- Host mode: `viewer-react`
- Coverage:
  - initial first-avatar-paint evidence appears on the host root
  - garment selection updates `data-last-garment-swap-ms`
  - preview source stays visible through `data-last-preview-source`

Command:

```bash
npx playwright test apps/web/e2e/viewer-platform.spec.ts --project=chromium
```

### Forced product route

- Route: `/app/closet`
- Host mode: `NEXT_PUBLIC_VIEWER_HOST=viewer-react`
- Coverage:
  - forced `viewer-react` stage mounts without immediate host failure
  - first-avatar-paint evidence appears on the product-facing host root
  - preview source remains visible on the forced product path

Command:

```bash
NEXT_PUBLIC_VIEWER_HOST=viewer-react npx playwright test apps/web/e2e/closet-viewer-react.spec.ts --project=chromium
```

### Contract validation

Commands:

```bash
npm run test:core
npm --prefix apps/web run typecheck
npm --prefix apps/admin run typecheck
npm run lint
npm run build:services
npm run build
```

## Result

Phase 2 now has a real telemetry seam, but only at the adapter/evidence layer.

- `viewer-core` still owns renderer lifecycle and low-level event emission
- `viewer-react` derives route-level latency evidence from typed viewer events
- Playwright can assert first-avatar-paint and garment-swap latency evidence on both the lab harness and the forced product route

## Remaining Gaps

This note does not claim the full Phase 2 plan is complete.

Open items still tracked elsewhere:

1. the default `runtime-3d` host does not emit the same route-level latency evidence
2. cached vs uncached preview latency is not split yet
3. draw calls, visible triangles, GPU texture memory, and context-restore timing are still missing
4. no blocking latency gate exists yet; this is still non-blocking evidence
