# Phase 9 / Batch 2

## Scope

This batch closes the remaining rollback and closeout gaps for the repo-scoped `Phase 9` baseline:

1. prove that the `/app/closet` release flag and kill switch stay authoritative over the route-scoped cutover
2. keep `runtime-3d` as the default control host and explicit rollback target while `viewer-react` remains a flagged product path
3. promote rollback evidence into CI so the cutover path and rollback path are both regression-tested

This batch does **not** widen `viewer-react` beyond `/app/closet`, remove `runtime-3d`, or promote HQ fit into a product namespace.

## Implemented

- `apps/web/e2e/closet-preview-runtime.spec.ts`
  - now asserts route-level `/app/closet` host attrs before reading compatibility preview-runtime evidence
  - when the kill switch is active, it explicitly checks:
    - `data-closet-viewer-host="runtime-3d"`
    - `data-closet-viewer-phase9-enabled="false"`
    - `data-closet-viewer-flag-source="phase9-kill-switch"`
- `package.json`
  - adds `npm run test:e2e:phase9:rollback`
  - this runs the compatibility-host smoke with:
    - `NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED=true`
    - `NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH=true`
    - `NEXT_PUBLIC_VIEWER_HOST=viewer-react`
  - the goal is to prove the kill switch wins over both the route release flag and the global host override
- `.github/workflows/quality.yml`
  - now runs the rollback smoke in addition to the flagged `viewer-react` latency gate

## Evidence

- `apps/web/e2e/closet-preview-runtime.spec.ts`
- `package.json`
- `.github/workflows/quality.yml`

## Outcome

- `Phase 9` no longer relies on cutover-only evidence
- the current repo-scoped baseline proves both:
  - the flagged `/app/closet -> viewer-react` product path
  - the route-scoped rollback back to `runtime-3d`
- with both smoke paths in CI, `Phase 9` can now be closed honestly for the current `/app/closet`-only cutover scope
