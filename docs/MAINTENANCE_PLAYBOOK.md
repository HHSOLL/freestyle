# Maintenance Playbook

## 1. Daily Checklist

1. Confirm `docs/TECH_WATCH.md` was updated today.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run typecheck:admin`.
5. Run `npm run test:core`.
6. Run `npm run build:services`.
7. Run `npm run build`.
8. Run `npm run build:admin`.
9. Run `npm run validate:garment3d` when asset metadata changed.
10. Run `npm run validate:avatar3d` when avatar assets or morph mapping changed.
11. Run `npm run validate:fit-calibration` when body mapping, size charts, or fit heuristics changed.
12. Run `npm run optimize:runtime:assets` when promoted runtime GLBs changed.
13. Run `npm run viewer:sync:transcoders` and `npm run report:asset-budget` when Phase 3 loader policy, public decoder assets, or promoted runtime GLBs change.

## 2. Product Smoke Checklist

### Route smoke

- `/`
- `/app`
- `/app/closet`
- `/app/canvas`
- `/app/community`
- `/app/profile`
- `/app/lab`
- `/app/lab/viewer-platform`
- `/app/lab/material-system`
- `/auth/callback`
- `/share/[slug]`

When validating the viewer-platform refactor specifically, also keep `docs/freestyle-viewer-platform/phase1/closeout.md` in sync with the latest harness and forced-host closet evidence.
When validating the Phase 9 route-scoped cutover specifically, run `NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED=true npm run test:e2e:phase9:closet` and `npm run test:e2e:phase9:rollback`, then keep the active notes under `docs/freestyle-viewer-platform/phase9/` in sync with both cutover and rollback smoke expectations.
If a schema/protocol foundation change claims to complete or reopen `Phase 2`, also update `docs/freestyle-viewer-platform/phase2/closeout.md` in the same PR.
If approval-state or fit-quality contract enforcement changes, also update `docs/freestyle-viewer-platform/phase2_5/closeout.md` in the same PR.
If Phase 3 loader policy, transcoder sync, KTX2 tooling, committed runtime `LOD` coverage, or asset budget reporting changes, also update the relevant note under `docs/freestyle-viewer-platform/phase3/` in the same PR. If the batch claims to close or reopen the phase, update `docs/freestyle-viewer-platform/phase3/closeout.md` too.
If the forced `viewer-react` host changes its latency evidence seam, also update `docs/freestyle-viewer-platform/phase2/telemetry-slice.md` and the Phase 0 risk/baseline notes in the same PR.
If admin/runtime garment publication changes the canonical manifest shadow seam, also update `docs/freestyle-viewer-platform/phase2/manifest-shadow.md` and the admin publish regression checklist in the same PR.
If compatibility-stage lighting, material calibration, or the Phase 4 lab harness changes, also update `docs/freestyle-viewer-platform/phase4/closeout.md` and `docs/material-contract.md` in the same PR.
If the Phase 5 avatar publication seam changes, also update the relevant note under `docs/freestyle-viewer-platform/phase5/` and keep `docs/freestyle-viewer-platform/phase5/closeout.md`, `docs/avatar-pipeline.md`, and `docs/avatar-production-contract.md` in sync in the same PR.
If the Phase 6 garment certification seam changes, also update `docs/freestyle-viewer-platform/phase6/batch1.md`, `docs/freestyle-viewer-platform/phase6/batch2.md`, `docs/freestyle-viewer-platform/phase6/batch3.md`, `docs/freestyle-viewer-platform/phase6/batch4.md`, `docs/freestyle-viewer-platform/phase6/closeout.md`, `docs/garment-fitting-contract.md`, and `docs/admin-asset-publishing.md` in the same PR.
If the Phase 7 preview-runtime seam changes, also update the relevant note under `docs/freestyle-viewer-platform/phase7/`, plus `docs/physical-fit-system.md` and the preview-runtime rules in `docs/DEVELOPMENT_GUIDE.md` in the same PR. If the compatibility host changes its read-only evidence surface, keep `apps/web/e2e/closet-preview-runtime.spec.ts` in sync in the same commit.
That Phase 7 note now includes `batch1.md`, `batch2.md`, `batch3.md`, `batch4.md`, and `closeout.md`; keep the snapshot seam, preview-engine fallback seam, and preview-session bootstrap seam in sync together.
If the Phase 8 HQ artifact identity seam changes, also update the relevant note under `docs/freestyle-viewer-platform/phase8/`, plus `docs/CLOTH_SIMULATE_JOB_DRAFT.md`, `docs/physical-fit-system.md`, and the HQ artifact rules in `docs/quality-gates.md` in the same PR.
If the Phase 9 `Closet` cutover seam changes, also update the relevant note under `docs/freestyle-viewer-platform/phase9/`, plus `docs/rollout-governance/feature-flag-matrix.md`, `docs/DEVELOPMENT_GUIDE.md`, and `docs/quality-gates.md` in the same PR.

### Redirect smoke

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

### API smoke

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
- `/v1/admin/garment-certifications`
- `/v1/admin/fit-simulations`
- `/v1/admin/fit-simulations/:id`
- `/v1/legacy/assets`
- `GET /v1/legacy/jobs/:job_id`
- `POST /v1/lab/jobs/evaluations`
- `POST /v1/lab/jobs/tryons`
- `POST /v1/lab/jobs/fit-simulations`
- `GET /v1/lab/evaluations/:id`
- `GET /v1/lab/fit-simulations/:id`
- `GET /v1/lab/fit-simulations/:id/artifact-lineage`
- `GET /v1/lab/tryons/:id`

Also confirm namespace headers:

- product routes return `x-freestyle-surface: product`
- legacy routes return `x-freestyle-surface: legacy` and `deprecation: true`
- lab routes return `x-freestyle-surface: lab`
- lab routes reject anonymous-header fallback and require bearer-backed auth outside non-production `DEV_BYPASS_USER_ID`
- admin garment routes reject anonymous-header fallback and non-admin callers
- explicit browser origins are rejected unless they match deployed `CORS_ORIGIN` / `CORS_ORIGIN_PATTERNS`

## 3. Release Checklist

Before a release:

1. Run `PATH="/opt/homebrew/bin:$PATH" npm run check`.
2. Run `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e:ops-closeout`.
3. Run `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e:visual`.
4. Record one current release-evidence note under `docs/qa/` with the commands, API smoke, and the committed snapshot paths or exported screenshot paths used for that run.
5. If browser smoke retries or fails, keep the Playwright trace artifact using `on-first-retry` or `retain-on-failure`.
6. Compare `Closet` against `docs/reference/wardrobe-reference.jpg`.
7. Confirm the shared top bar, bottom mode bar, left rail, right catalog rail, and centered stage hierarchy still hold.
8. Confirm the committed visual baseline set under `apps/web/e2e/visual-regression.spec.ts-snapshots/` is current for `Home`, `Canvas`, `Community`, `Profile`, and `Closet` low / balanced / high tiers.
9. Confirm old routes are still redirected or removed from the main flow.
10. Confirm `lab` failures do not break any main product page.
11. Confirm `migration-notes.md` reflects the latest deleted, retained, and quarantined flows.
12. Confirm Vercel browser env only carries low-privilege Supabase vars (`NEXT_PUBLIC_SUPABASE_URL` plus the current browser key env), while Railway API / worker keeps `SUPABASE_SERVICE_ROLE_KEY` server-side only.
13. Confirm exposed Supabase `public` schema objects used by product/admin flows still have RLS enabled and that Security Advisor findings have been reviewed for RC signoff.
14. For lab create/status release smoke, use a real backend-injected `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` source; do not count dummy or file-backed env as RC evidence.
15. When a Vercel security bulletin is active, run `vercel env ls production` and `vercel activity --since 72h --project freestyle`, then record the findings in a dated QA note before RC signoff.
16. Cut the RC tag only on the validated `main` commit, using the `rc-YYYY-MM-DD-ops-closeout` pattern.

## 4. Avatar Runtime Regression Checklist

Verify these after any mannequin or asset change:

- both base variants load
- poses apply without broken limbs
- measurement changes update multiple rig regions, not a single global scale
- body masks hide covered mesh zones correctly
- shoes with `feet` body-mask coverage still switch the avatar into segmented-body mode
- pose-aware body masks expand correctly in `stride` and `tailored`
- fit-driven adaptive body-mask expansion still widens pressure zones for tight shoulders / hips / inseam cases
- garments respect render order and clearance
- garments respect pose-aware clearance tuning
- long hair pieces (`ponytail`, `braid`, `long fall`) still sway without clipping through the head or shoulders
- loose hero garments (`City Relaxed`, `Tailored Layer`) still show secondary drape without jitter or exploding transforms
- the reduced preview backend still downgrades cleanly: `worker-reduced` falls back to `cpu-reduced` when `/workers/reference-closet-stage-preview.worker.js` is unavailable or Worker support is missing
- meshopt-compressed runtime GLBs still load in browser builds; a missing `MeshoptDecoder` is now a release blocker
- the committed base-avatar sibling files `mpfb-female-base.lod1/.lod2.glb` and `mpfb-male-base.lod1/.lod2.glb` still exist; `balanced` and `low` quality must not 404 back to a blank stage
- the committed promoted garment and hair sibling files for the default closet path still exist; `balanced` and `low` quality must not silently fall back to `LOD0` for the equipped starter path
- repeated avatar / garment swaps should not leave clone-owned runtime materials without cleanup; cleanup must target only stage-owned material clones
- secondary motion still settles back to idle under `frameloop="demand"` instead of forcing a permanent render loop
- `low` quality mode still renders on weaker devices
- asset preloading does not exceed declared budgets
- `apps/web/public/basis/basis_transcoder.js` and `.wasm` still exist and match the loader policy expected by `viewer-core`
- repo-local `toktx` bootstrap still works through `npm run viewer:bootstrap:ktx-tools` when Phase 3 scripts or committed `.ktx2` samples change
- `output/asset-budget-report/latest.json` is regenerated after promoted runtime asset changes and any new warnings are reviewed before release
- avatar quality-tier path resolution and preload continue to agree on the same effective asset path
- garment and hair quality-tier path resolution continue to agree with preload on the same effective asset path for the default promoted closet loadout
- active runtime preload stays scoped to the current avatar, equipped garments, and near-term closet candidates
- optimized runtime GLBs stay within explicit avatar / garment / hair / default-loadout budgets
- `/app/lab/material-system` still mounts a visible canvas and responds to `quality tier` plus `lighting mode` switches
- compatibility-stage studio lighting still routes through one shared rig spec instead of drifting back to duplicated inline scene literals
- compatibility-stage material tuning still routes through `packages/runtime-3d/src/material-system.ts` instead of regressing to ad-hoc per-file heuristics

If any of the above regress, stop the release.

## 5. Failure Playbooks

### WebGL or GLB load failure

- check runtime console errors first
- verify asset path and manifest entry
- verify `preloadRuntimeAssets` still references the correct files
- verify `/workers/reference-closet-stage-preview.worker.js` is still served from the same origin; if it is missing, preview motion should degrade to CPU instead of freezing or crashing
- verify runtime clone cleanup did not dispose shared loader-cache resources
- confirm `AvatarStageViewport` still shows a visible loading, error, or WebGL fallback instead of a blank route shell
- confirm `closet-stage` still shows an in-canvas loading placeholder instead of backdrop-only emptiness while runtime assets suspend

### Garment clipping or body poke-through spike

- confirm `bodyMaskZones` match the garment category
- confirm `surfaceClearanceCm` is still sensible
- confirm the skeleton profile is valid
- confirm the rig alias map still matches the active avatar asset
- confirm runtime `anchorBindings` still resolve to avatar bones; secondary-motion drift is usually an anchor-resolution bug now, not a camera bug
- confirm `secondaryMotion` is not amplifying a fit problem that should be fixed in authoring or corrective metadata first

### Route leak from legacy into product

- inspect `apps/web/route-map.mjs`
- inspect `apps/web/src/lib/product-routes.ts`
- verify the main nav still shows only the four app surfaces

### Persistence regression

- verify body profile envelope compatibility
- verify body profile reads and writes preserve canonical `revision`
- verify stale `baseRevision` writes return `409 REVISION_CONFLICT` and surface the current server profile
- verify closet scene still hydrates with `qualityTier`, `poseId`, and equipped items
- verify canvas compositions serialize and deserialize cleanly
- verify legacy-compatible asset creation still works when a remote store lags optional `assets` columns (`name`, `brand`, `source_url`, `metadata`)
- verify remote-backed job status reads normalize offset timestamps into canonical ISO `...Z` strings
- verify fit-simulation jobs dedupe on canonical `cacheKey` when the caller omits an explicit `idempotency_key`
- verify fit-simulation records persist `bodyProfileRevision`, `garmentRevision`, and `cacheKey` consistently through API and worker reads
- verify new jobs preserve `avatarVariantId` through the canonical fit-simulation payload so queue fallback and API create derive the same `cacheKey`
- verify fit-simulation create still resolves `avatarManifestUrl` from `packages/runtime-3d/src/avatar-publication-catalog.ts` rather than a local API constant
- verify succeeded fit-simulation records now persist the full artifact bundle: `draped_glb`, `fit_map_json`, `preview_png`, and `metrics_json`
- verify the internal fit-simulation store now also persists a typed `artifactLineage` snapshot with `artifactLineageId`, `cacheKeyParts`, and `artifactKinds`
- verify lab fit-simulation reads return artifacts in presentation order with `draped_glb` first

### HQ fit-simulation artifact failure

- verify `workers/fit_simulation/src/worker.ts` can resolve avatar and garment manifest URLs into readable runtime assets under `apps/web/public/assets`
- verify `node_modules/.bin/gltf-transform` is available to the worker runtime; `draped_glb` generation now depends on the merge command
- if `draped_glb` is missing but the job succeeded, treat it as a release blocker for the Phase D artifact path

### API namespace regression

- verify `apps/api/src/main.ts`
- confirm new routes were not mounted directly onto legacy or lab by mistake

### Admin publish regression

- verify `apps/admin` can create a new garment without editing raw JSON first
- verify accessory measurements (`headCircumferenceCm`, `frameWidthCm`) survive save/load
- verify the archetype fit preview updates when size rows or measurement modes change
- verify guided form edits still round-trip through the raw manifest inspector
- verify `POST` and `PUT` reject schema-valid but semantically invalid garments before they reach persistence
- verify product routes still default to `PUBLISHED` assets while admin surfaces can inspect candidate approval states
- verify `/v1/admin/garments?approval_state=...` still filters certification candidates without leaking those assets into `/v1/closet/runtime-garments`
- verify `/v1/admin/garment-certifications` still reflects the committed `output/garment-certification/latest.json` bundle and stays admin-only
- verify `/v1/admin/fit-simulations` still returns a bounded read-only catalog and stays fail-soft as `200` empty list when the persistence store is absent or has no matches
- verify `/v1/admin/fit-simulations/:id` still returns a read-only inspection envelope and does not mutate or widen the existing lab fit-simulation detail contract
- the garment-certification read seam resolves that bundle from repo-root `output/garment-certification/latest.json` by default; use `GARMENT_CERTIFICATION_BUNDLE_PATH` only when an explicit deployment/test override is required
- verify `approvalState`, `approvedAt/by`, and certification notes survive admin save/load without affecting legacy upload asset statuses
- verify legacy published rows with missing approval metadata normalize to `PUBLISHED` on read only; re-saved records must persist an explicit approval state
- verify supported garment categories persist a synchronized `viewerManifest` plus `publication.viewerManifestVersion` through admin save/load
- verify stale nested manifest ids or approval states are normalized on write instead of leaking drift into stored publication payloads
- verify unsupported categories do not get accidental auto-filled canonical garment manifests
- verify `CERTIFIED`, `PUBLISHED`, and `DEPRECATED` writes fail closed when `approvedAt`, `approvedBy`, or certification notes are missing

## 6. Operational Rules

- Do not promote legacy or lab surfaces into the product shell without a documented IA decision.
- Do not land new 3D assets without updating credits and pipeline documentation.
- Do not treat legacy converted assets as production-certified without passing the new asset-quality and fit-quality contracts.
- Do not add new large page files when the logic belongs in a domain package or UI component.
- Do not leave stale redirects, stale docs, or stale storage keys untracked.
- Do not deploy browser-facing environments without an explicit CORS allowlist once requests carry an `Origin` header.
- Do not re-enable anonymous-header auth in production unless the owning route is explicitly designed and reviewed for that posture.

## 7. Required Document Sync

When these areas change, update the paired docs:

- architecture or route boundaries: `architecture-overview.md`
- avatar asset authoring or rig rules: `avatar-pipeline.md`
- garment contract or fit logic: `garment-fitting-contract.md`
- physical fit model or source-adoption decisions: `physical-fit-system.md`
- asset production / certification criteria: `asset-quality-contract.md`, `avatar-production-contract.md`, `garment-production-contract.md`, `material-contract.md`, `fit-quality-contract.md`
- shell layout or tokens: `design-system.md`
- deleted or quarantined features: `migration-notes.md`
- release candidate evidence and deploy freeze notes: `docs/qa/*`, `DEPLOYMENT_STACK_DECISION.md`
