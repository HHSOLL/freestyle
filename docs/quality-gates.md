# Quality Gates

## Purpose

This document is the execution-facing summary of validation rules for the current mannequin-first FreeStyle product.

It complements `docs/MAINTENANCE_PLAYBOOK.md`.

- Use this file to decide what must run for a task.
- Use the maintenance playbook for the longer smoke and release checklists.

## Gate Levels

### L0. Baseline Gate

Run this for any non-trivial code change.

Current baseline command set:

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run build:services`
- `npm run build`

Current GitHub workflow enforcement:

- `.github/workflows/quality.yml` currently runs the same baseline set above

### L1. Surface-Specific Gate

Run these when the scope touches the matching area.

| Trigger | Commands |
| --- | --- |
| admin UI or admin build path changed | `npm run typecheck:admin`, `npm run build:admin` |
| garment metadata, runtime garment contract, or publishable garment assets changed | `npm run validate:garment3d` |
| avatar assets, avatar manifest, morph mapping, or runtime avatar calibration changed | `npm run validate:avatar3d` |
| body mapping, size charts, fit heuristics, or physical fit metadata changed | `npm run validate:fit-calibration` |
| promoted runtime GLBs changed | `npm run optimize:runtime:assets` |
| job contracts, queue runtime, or worker payload/result handling changed | targeted `tsx --test` runs for `packages/shared/src/job-contracts.test.ts`, `packages/queue/src/index.test.ts`, and `apps/api/src/modules/jobs/jobs.service.test.ts` plus `npm run build:services` |

### L2. Full Local Gate

Run this when the task spans multiple areas or when you want release-grade local coverage in one command.

- `npm run check`

This includes:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:admin`
- `npm run test:core`
- `npm run validate:garment3d`
- `npm run validate:avatar3d`
- `npm run validate:fit-calibration`
- `npm run build:services`
- `npm run build`
- `npm run build:admin`

## Smoke Expectations

Use these when a task changes routes, runtime boundaries, or release-facing behavior.

### Web routes

- `/`
- `/app`
- `/app/closet`
- `/app/canvas`
- `/app/community`
- `/app/profile`
- `/app/lab`
- `/auth/callback`
- `/share/[slug]`

### Redirects

- `/app/fitting -> /app/closet`
- `/studio -> /app/closet`
- `/trends -> /app/community`
- `/examples -> /app/community`
- `/how-it-works -> /app/community`
- `/profile -> /app/profile`
- `/app/looks -> /app/canvas`
- `/app/decide -> /app/closet`
- `/app/journal -> /app/profile`
- `/app/discover -> /app/community`

### API routes

- `/healthz`
- `/readyz`
- `/v1/profile/body-profile`
- `/v1/closet/items`
- `/v1/closet/runtime-garments`
- `/v1/canvas/looks`
- `/v1/community/looks`
- `/v1/admin/garments`
- `POST /v1/admin/garments`
- `/v1/legacy/assets`
- `GET /v1/legacy/jobs/:job_id`
- `POST /v1/lab/jobs/evaluations`
- `POST /v1/lab/jobs/tryons`
- `GET /v1/lab/evaluations/:id`
- `GET /v1/lab/tryons/:id`

### Namespace headers

- product routes return `x-freestyle-surface: product`
- legacy routes return `x-freestyle-surface: legacy` and `deprecation: true`
- lab routes return `x-freestyle-surface: lab`

## Runtime Regression Expectations

When the runtime or assets change, verify at least the relevant subset of these:

- body measurement changes remain region-specific
- garments respect render order and clearance
- body masks still hide covered geometry correctly
- low-quality mode still renders
- load failure shows a fallback instead of a blank scene
- host chunk/WebGL fallback and in-canvas asset-loading placeholder remain visible on the closet stage
- preloading stays within explicit asset budgets
- queued jobs preserve `trace_id` and return canonical `job-result.v1` envelopes on status reads

Use `docs/MAINTENANCE_PLAYBOOK.md` for the full runtime regression checklist.

## Evidence Rules

Every batch should record:

- which commands were run
- which commands were skipped
- why any skipped command was not needed

Release-oriented work should also capture:

- fresh screenshots for `Home`, `Closet`, `Canvas`, `Community`, and `Profile`
- any required route or API smoke evidence
- docs synced with the changed boundary

## Failure Policy

### Block Merge Or Release

- failing baseline gate
- failing required conditional gate
- missing required namespace behavior after a route/API change
- missing validation on changed avatar or garment assets

### Fix Before Merge

- missing fallback coverage after a runtime-facing change
- missing docs sync for a changed boundary or contract
- relying on legacy or lab paths as a primary product path

## Docs-Only Rule

For docs-only changes with no code, asset, or config impact:

- local `npm run lint` is the minimum acceptable manual check
- the PR may still run the full CI baseline automatically

Do not claim conditional gates passed for docs-only work unless they were actually run.

## Related Docs

- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/product-boundaries.md`
- `docs/contract-ownership.md`
- `package.json`
- `.github/workflows/quality.yml`

## Out Of Scope

- business KPI thresholds
- long-form performance tuning policy
- design critique or visual taste review
