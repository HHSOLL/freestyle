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
| promoted runtime GLBs changed | `npm run optimize:runtime:assets`, `npm run report:asset-budget` |
| viewer-core loader policy, decoder public assets, or Phase 3 asset pipeline scripts changed | `npm run viewer:sync:transcoders`, `npm run viewer:bootstrap:ktx-tools`, `npm run report:asset-budget`, targeted `tsx --test` runs for `packages/viewer-core/src/loader-registry.test.ts` and the runtime loader/model-path tests, plus `npm run build:services` |
| compatibility-stage material or lighting system changed | targeted `tsx --test` runs for `packages/runtime-3d/src/material-system.test.ts`, `packages/runtime-3d/src/studio-lighting-rig.test.ts`, `packages/runtime-3d/src/reference-closet-stage-policy.test.ts`, `packages/viewer-core/src/proxy-stage.test.ts`, plus `npx playwright test apps/web/e2e/material-system.spec.ts --project=chromium`, `npm run build:services`, and `npm run build` |
| job contracts, queue runtime, or worker payload/result handling changed | targeted `tsx --test` runs for `packages/contracts/src/domain-contracts.test.ts`, `packages/shared/src/job-contracts.test.ts`, `packages/queue/src/index.test.ts`, and `apps/api/src/modules/jobs/jobs.service.test.ts` plus `npm run build:services` |
| asset-quality, fit-kernel, viewer-protocol, or viewer-host seams changed | targeted `tsx --test` runs for `packages/asset-schema/src/index.test.ts`, `packages/fit-kernel/src/index.test.ts`, `packages/viewer-protocol/src/index.test.ts`, `packages/viewer-react/src/route-telemetry.test.ts`, `packages/viewer-react/src/bridge.test.ts`, plus `npm run build:services` and the relevant forced-host Playwright smoke |

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

## Progressive Gate Rollout

The viewer-platform refactor grows gates forward instead of leaving everything for one final hardening batch:

- `Phase 0`: benchmark harness and baseline reports start as non-blocking evidence
- `Phase 2`: the forced `viewer-react` seam emits non-blocking first-avatar-paint and garment-swap latency evidence
- `Phase 2.5`: approval-state, body-signature, material, and fit-contract tests start
- `Phase 2.5`: promoted garment approval states fail closed on write when certification metadata or the canonical manifest seam is missing
- `Phase 3`: asset budget gate becomes non-blocking
- `Phase 3`: shared loader policy and KTX2 transcoder public assets become explicit repo-owned seams instead of implicit local tooling assumptions
- `Phase 3`: the shipped default closet path now consumes real committed `LOD1 / LOD2` siblings for avatars plus the promoted garment/hair loadout, and the non-blocking report measures transfer, draw calls, triangles, and texture bytes by quality tier
- `Phase 4`: compatibility-stage studio lighting and material calibration become explicit repo-owned seams with unit tests plus a dedicated lab smoke route
- `Phase 5 / Batch 1`: avatar publication metadata now has a blocking read-only seam through `/v1/admin/avatars` plus `output/avatar-certification/latest.json`, and `validate:avatar3d` fails closed on publication/evidence/LOD drift for the committed base variants
- `Phase 5`: avatar certification gate is blocking for the committed base variants
- `Phase 6 / Batch 1`: `validate:garment3d` now emits `output/garment-certification/latest.json` and fails closed on committed garment-authoring bundle drift for the starter garments that already have authoring summaries
- `Phase 6 / Batch 2`: `/v1/admin/garment-certifications*` now exposes that bundle as a read-only admin inspection seam without widening product payloads or publication persistence
- `Phase 6 / Batch 3`: `apps/admin` now consumes that seam as a read-only starter certification inspector while keeping editor/save state isolated from certification payloads
- `Phase 6 / Batch 4`: `apps/admin` now exposes starter coverage triage over the current admin garment list without widening `/v1/admin/garments*`
- `Phase 6`: garment certification gate is closed for the current starter-bundle-backed scope
- `Phase 7 / Batch 1`: the active reduced preview spring contract now lives in `@freestyle/fit-kernel`, and the same-origin worker returns a typed `PREVIEW_FRAME_RESULT` envelope without claiming browser WASM cloth truth
- `Phase 7 / Batch 2`: the `runtime-3d` compatibility host now exposes a typed read-only preview runtime snapshot through `data-preview-runtime-*` attrs and `fit:preview-runtime-updated` viewer events, without widening `/v1` payloads
- `Phase 7 / Batch 3`: the compatibility host now also exposes typed preview-engine status through `data-preview-engine-*` attrs and `fit:preview-engine-status`, including explicit fallback reasons when the active path is not real WASM preview
- `Phase 7 / Batch 4`: the same-origin worker now runs on the typed preview session protocol with body/collision/fit-mesh/material bootstrap messages plus a typed `PREVIEW_DEFORMATION` envelope for transform-only secondary motion
- `Phase 7`: the repo-scoped compatibility preview path is now closed; later phases may replace the compatibility inputs with authoritative authored assets and real cloth deformation, but should not reopen the current evidence surface casually
- `Phase 7`: preview fit performance gate becomes blocking
- `Phase 8 / Batch 1`: the HQ fit worker now writes an internal `artifact-lineage.json` sidecar and canonical cache-key parts for the current four-artifact bundle without widening the lab read contract
- `Phase 8 / Batch 2`: `/v1/lab/fit-simulations/:id/artifact-lineage` now exposes that persisted lineage as a separate owner-scoped inspection seam while keeping `/v1/lab/fit-simulations/:id` unchanged
- `Phase 8 / Batch 3`: the current `Closet` HQ fit panel now consumes that lineage seam as separate read-only state, proving a first web consumer without widening the main fit-simulation detail contract
- `Phase 8 / Batch 4`: `/v1/admin/fit-simulations/:id` now exposes the same persisted HQ bundle + lineage snapshot through an admin-only read-only inspection seam
- `Phase 8`: HQ artifact identity and lineage inspection gate is closed for the current baseline bundle and becomes blocking
- `Phase 8.5 / Batch 1`: `apps/admin` now consumes the admin HQ artifact inspection seam in a separate read-only panel without mixing that state into garment publication editing
- `Phase 8.5 / Batch 2`: `/v1/admin/fit-simulations` now exposes a bounded read-only HQ fit catalog for operator triage without widening garment publication payloads
- `Phase 8.5 / Batch 3`: `apps/admin` now shows current-garment HQ fit evidence, local status/lineage filters, and one-click open into the existing detail inspector
- `Phase 8.5`: the current repo-scoped admin HQ fit tooling track is closed as a read-only inspection + triage gate, not as a certification mutation workflow
- `Phase 9`: UX latency gate becomes blocking
- `Phase 10`: CI, hardware-backed GPU, and production telemetry rules freeze as the full hard gate set

### L3. Operational Closeout Gate

Run this when freezing an RC or closing an operations batch.

- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e:ops-closeout`
- `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e:visual`
- `PATH="/opt/homebrew/bin:$PATH" vercel env ls production`
- `PATH="/opt/homebrew/bin:$PATH" railway variable list --json`

Expected evidence:

- one dated release or operational closeout note under `docs/qa/`
- route/browser smoke result plus any retained Playwright trace artifact
- committed Playwright visual baseline coverage for `Home`, `Canvas`, `Community`, `Profile`, and `Closet` low / balanced / high tiers
- explicit browser-vs-backend Supabase key posture
- explicit RC tag name if the run is used to freeze `main`

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
- `/v1/admin/avatars`
- `/v1/admin/garments`
- `POST /v1/admin/garments`
- `/v1/legacy/assets`
- `GET /v1/legacy/jobs/:job_id`
- `POST /v1/lab/jobs/evaluations`
- `POST /v1/lab/jobs/fit-simulations`
- `POST /v1/lab/jobs/tryons`
- `GET /v1/lab/evaluations/:id`
- `GET /v1/lab/fit-simulations/:id`
- `GET /v1/lab/tryons/:id`

### Namespace headers

- product routes return `x-freestyle-surface: product`
- legacy routes return `x-freestyle-surface: legacy` and `deprecation: true`
- lab routes return `x-freestyle-surface: lab`

## Runtime Regression Expectations

When the runtime or assets change, verify at least the relevant subset of these:

- body measurement changes remain region-specific
- garments respect render order and clearance
- `/v1/admin/garments` save/load keeps supported-category `viewerManifest` shadows synchronized with top-level publication metadata
- `/v1/admin/avatars` stays a dedicated publication catalog boundary and does not drift from `packages/runtime-3d/src/avatar-manifest.ts` or `output/avatar-certification/latest.json`
- `validate:garment3d` keeps `output/garment-certification/latest.json` in parity with the committed garment authoring bundle and starter runtime metadata
- `/v1/closet/runtime-garments` continues to tolerate legacy published rows without a manifest shadow while still excluding non-`PUBLISHED` assets
- body masks still hide covered geometry correctly
- low-quality mode still renders
- load failure shows a fallback instead of a blank scene
- product closet catalog hides non-`PUBLISHED` certification candidates while admin catalog queries may filter approval states explicitly
- host chunk/WebGL fallback and in-canvas asset-loading placeholder remain visible on the closet stage
- preloading stays within explicit asset budgets
- queued jobs preserve `trace_id` and return canonical `job-result.v1` envelopes on status reads
- remote-backed job status reads normalize timestamp formats into canonical ISO `...Z` strings before emitting public envelopes
- `fit_simulate_hq_v1` create/read paths preserve the current persisted body-profile snapshot and emit typed `fit_map_json` plus `preview_png` artifacts, with `draped_glb` still warning-backed until a real solver output exists

Use `docs/MAINTENANCE_PLAYBOOK.md` for the full runtime regression checklist.

## Security Expectations

When release, auth, or remote-store work changes, verify at least the relevant subset of these:

- exposed Supabase `public` schema tables, views, and functions used by the product keep RLS enabled
- browser-facing surfaces use only `NEXT_PUBLIC_SUPABASE_URL` plus a low-privilege browser key; the repo still names that key `NEXT_PUBLIC_SUPABASE_ANON_KEY` for compatibility
- `SUPABASE_SERVICE_ROLE_KEY` remains backend-only on Railway API / worker surfaces and is never required for Vercel/browser smoke
- admin garment routes still reject anonymous-header fallback and non-admin callers
- release evidence clearly says whether smoke used dummy/local env or backend-injected live env
- Security Advisor review status is called out when RC notes are frozen

## Evidence Rules

Every batch should record:

- which commands were run
- which commands were skipped
- why any skipped command was not needed

Release-oriented work should also capture:

- fresh screenshots for `Home`, `Closet`, `Canvas`, `Community`, and `Profile`
- the current committed Playwright snapshot set under `apps/web/e2e/visual-regression.spec.ts-snapshots/`
- any required route or API smoke evidence
- any browser trace artifact kept from `on-first-retry` or `retain-on-failure` smoke runs when a retry/failure occurs
- docs synced with the changed boundary
- the active remote-store / key-separation posture used for the run
- the RC tag name when the run freezes a release candidate

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
