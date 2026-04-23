# Phase 9 / Closeout

## Status

`Phase 9` is `completed` for the current repo-scoped baseline.

This closeout is intentionally narrow. It means:

- `/app/closet` owns a route-scoped `viewer-react` release flag and kill switch
- the flagged `viewer-react` path keeps runtime preload parity plus route-level latency / preview evidence
- CI now exercises both:
  - the cutover path (`viewer-react`)
  - the rollback path (`runtime-3d`)

It does **not** mean:

- global audience rollout is complete
- `runtime-3d` has been removed
- other product surfaces are cut over
- HQ fit is promoted out of its current lab-backed boundary
- solver-grade cloth truth exists in browser runtime

## Completed Scope

### Batch 1

- explicit `/app/closet` release flag and kill switch
- hydration-stable route host resolution
- `viewer-react` preload parity
- route-level latency attrs on the product host
- static-fit preview-runtime / preview-engine attrs and typed event parity
- blocking `viewer-react` latency smoke

Primary evidence:

- `apps/web/src/lib/closet-viewer-phase9.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `packages/viewer-react/src/host-selection.ts`
- `packages/viewer-react/src/freestyle-viewer-host.tsx`
- `packages/viewer-react/src/preview-evidence.ts`
- `apps/web/e2e/closet-viewer-react.spec.ts`

See also: `docs/freestyle-viewer-platform/phase9/batch1.md`

### Batch 2

- explicit rollback smoke for the kill-switch path
- route-level runtime-3d assertions when rollback is active
- CI rollback gate proving the kill switch wins over:
  - the Phase 9 release flag
  - the global `NEXT_PUBLIC_VIEWER_HOST=viewer-react` override

Primary evidence:

- `apps/web/e2e/closet-preview-runtime.spec.ts`
- `package.json`
- `.github/workflows/quality.yml`

See also: `docs/freestyle-viewer-platform/phase9/batch2.md`

## Validation

The Phase 9 closeout baseline was validated with:

- `npm run test:core`
- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/admin run typecheck`
- `npm run lint`
- `npm run build:services`
- `npm run build`
- `npm run test:e2e:phase9:closet`
- `npm run test:e2e:phase9:rollback`

`build:admin`, `validate:garment3d`, `validate:avatar3d`, and `validate:fit-calibration` are not part of the narrow Phase 9 cutover seam and should only be rerun when their respective asset/admin/body-fit boundaries change.

## Remaining Non-Goals

The next plan step is `Phase 10. CI hard gate / production telemetry hardening`.

That future work may widen observability, hardware-backed GPU evidence, and rollout/rollback operations, but it should not reopen the current `/app/closet` cutover semantics unless the host contract itself changes.
