# FreeStyle Improvement Status

## Purpose

This document is the active execution tracker for the repository improvement program aligned to the 2026-04-18 FreeStyle review.

It is separate from `docs/replatform-v2/**`.

- `docs/replatform-v2/**` remains the historical rollout and widget/canary track.
- This file tracks the current mannequin-first product hardening program.
- When the two disagree, use this file together with `README.md`, `docs/architecture-overview.md`, `docs/repo-inventory.md`, and `docs/product-boundaries.md`.

## As Of

- Date: `2026-04-19`
- Current branch baseline: `main`
- Working overall completion estimate: `99%`

The completion estimate is a planning number, not a release gate. It reflects that the repo already has the mannequin-first product shape, contracts package, runtime package split, and early admin/runtime garment flow, while persistence hardening, worker contracts, and release-grade QA remain unfinished.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `completed` | `Batch 1` and `Batch 2` are complete |
| `Phase 1` | Product / Legacy / Lab separation hardening | `completed` | Boundary helpers, smoke guards, and historical-doc markers are aligned to the current product definition |
| `Phase 2` | contracts and domain core hardening | `completed` | `BodyProfile`, canvas, runtime garment, physical-fit assessment, and the last legacy shared-3d fit-summary drift are now closed on the active path |
| `Phase 3` | Closet and runtime-3d stabilization | `completed` | Loader, disposal, visible fallback ownership, host lifecycle coverage, and top-level stage scene policy are now centralized and regression-tested |
| `Phase 4` | server persistence and admin publishing hardening | `completed` | `BodyProfile` persistence is replaceable, and published runtime garments now have a remote Supabase backing store with RLS-ready coverage plus local fallback |
| `Phase 5` | worker, job contract, and observability hardening | `partial` | `Batch 1` is complete for the import chain; evaluator/tryon and broader route-level smoke are still open |
| `Phase 6` | QA, security, and release candidate | `not_started` | Quality gates exist, but end-to-end release evidence is incomplete for the current product definition |

## Current Batch

### `Phase 1 / Batch 1`

Status: `completed`

Completed work:

1. removed stale product-side fallback reads to non-product asset endpoints
2. made lab surface resolution explicit so `/app/lab` no longer inherits product navigation state
3. removed the historical widget canary bootstrap from the public web root layout
4. tightened boundary docs so historical widget/canary code is not treated as product shell behavior

Evidence:

- `apps/web/src/hooks/useWardrobeAssets.ts`
- `apps/web/src/lib/product-routes.ts`
- `apps/web/src/lib/product-routes.test.ts`
- `apps/web/src/components/layout/AppTopBar.tsx`
- `apps/web/src/components/layout/ProductAppShell.tsx`
- `apps/web/src/app/layout.tsx`
- `docs/product-boundaries.md`

Outcome:

- the main product shell no longer boots the historical widget canary path
- product navigation no longer treats the lab page as a primary product surface
- the first boundary hardening batch closed with code-backed fixes instead of docs-only assumptions

### `Phase 1 / Batch 2`

Status: `completed`

Completed work:

1. made `apps/web/route-map.mjs` the canonical route inventory consumed by `product-routes`
2. expanded route parity tests so every compatibility redirect resolves to the same surface as its declared destination
3. widened API boundary smoke coverage across product, admin, legacy, lab, and unscoped health routes
4. corrected the active maintenance docs to point at the implemented lab smoke path

Evidence:

- `apps/web/src/lib/product-routes.ts`
- `apps/web/src/lib/product-routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/product-boundaries.md`
- `docs/quality-gates.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- route parity drift is now guarded by tests instead of spot checks
- admin namespace smoke is explicitly covered as part of the product surface
- health routes are guarded against accidentally inheriting a product/legacy/lab namespace header
- the active smoke docs now match the implemented lab route shape

### `Phase 1 / Batch 3`

Status: `completed`

Completed work:

1. marked pre-mannequin renewal and widget rollout docs as historical where they could be mistaken for active route guidance
2. added current-source-of-truth links from those historical docs back to the active tracker and boundary docs
3. clarified in active docs that older role and route labels should not override the current product boundary model
4. added an explicit scope note to the mixed `api-contract` reference so legacy sections are not mistaken for active product routes

Evidence:

- `README.md`
- `docs/SUBAGENT_TEAM.md`
- `docs/migration-notes.md`
- `docs/replatform-v2/execution-status.md`
- `docs/replatform-v2/ownership-map.md`
- `docs/replatform-v2/contracts-freeze.md`
- `docs/RENEWAL_APP_ARCHITECTURE.md`
- `docs/RENEWAL_INFORMATION_ARCHITECTURE.md`
- `docs/PROJECT_HEALTH_2026-02-11.md`
- `docs/api-contract.md`

Outcome:

- historical rollout and renewal docs are less likely to be mistaken for current route ownership or IA guidance
- active maintainers now have a clearer path back to the current boundary source of truth
- Phase 1 ambiguity from doc drift is reduced enough to move into contract and domain hardening work

### `Phase 2 / Batch 1`

Status: `completed`

Completed work:

1. converged the active `BodyProfile` web/API contract on `@freestyle/contracts` instead of leaving type truth and Zod truth split
2. taught the current `/v1/profile/body-profile` contract to accept the real web payload shape, including `version`, `gender`, and `bodyFrame`
3. normalized compatibility handling so legacy flat body-profile payloads and older stored records still land in the canonical envelope
4. tightened the product boundary test so the live profile route is verified against the shared contract schemas

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/profile.routes.ts`
- `apps/api/src/modules/profile/body-profile.repository.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `packages/domain-avatar/src/index.ts`
- `packages/domain-avatar/src/mapping.test.ts`
- `apps/web/src/hooks/useBodyProfile.ts`
- `docs/api-contract.md`
- `docs/contract-ownership.md`

Outcome:

- the live product body-profile route now accepts the same canonical shape the web client actually sends
- `BodyProfile` contract ownership is more concrete because request, response, repository, and consumer code now share the same schema surface
- Phase 2 can move next to garment or canvas contract hardening without carrying a broken body-profile path

### `Phase 2 / Batch 2`

Status: `completed`

Completed work:

1. added canonical `CanvasComposition` and `ClosetSceneState` schemas in `packages/contracts`
2. normalized legacy flat body-profile snapshots during canvas deserialization to keep older saved looks readable
3. tightened `packages/domain-canvas` repository load and save paths so invalid compositions are dropped or rejected before the hook rehydrates them
4. expanded contract and canvas serialization coverage from a single happy path to malformed snapshot and repository filtering cases

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-canvas/src/index.ts`
- `packages/domain-canvas/src/serialization.test.ts`
- `docs/architecture-overview.md`

Outcome:

- local canvas state no longer trusts raw JSON from storage, and the persisted shape now has an explicit schema source of truth
- canvas saved-look hydration now shares the same legacy body-profile compatibility behavior as the active profile boundary
- the remaining canvas gap is now the remote `/v1/canvas/looks` adapter contract, not unchecked local hydration

### `Phase 2 / Batch 3`

Status: `completed`

Completed work:

1. added canonical request and response envelope coverage for the implemented `/v1/canvas/looks` product routes
2. tightened `CanvasLookInput.data` so the route now accepts only canonical `CanvasComposition` payloads, with title drift rejected at the contract boundary
3. normalized the canvas API read-model through contract parsing before route responses are emitted, degrading malformed stored blobs to `data: null`
4. documented the active `/v1/canvas/looks` contract in the product API reference and added a narrow invalid-payload route test

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/canvas.routes.ts`
- `apps/api/src/modules/canvas/canvas.service.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- `/v1/canvas/looks` no longer relies on ad hoc success payload shapes
- the remote canvas look path now shares one canonical write contract source with the local canvas composition model
- the next canvas issue is consumer behavior, not an undocumented or unvalidated API envelope

### `Phase 2 / Batch 4`

Status: `completed`

Completed work:

1. aligned the product-side published garment hydration path with the canonical `PublishedGarmentAsset` contract instead of the old snake_case asset adapter
2. added a focused runtime-garment parser that filters malformed or semantically invalid published garments without dropping valid entries
3. added a web-side regression test so `/v1/closet/runtime-garments` contract drift is now caught from the product consumer side
4. documented that the published runtime garment route is a camelCase canonical contract, not a legacy asset payload

Evidence:

- `apps/web/src/hooks/publishedRuntimeGarment.ts`
- `apps/web/src/hooks/publishedRuntimeGarment.test.ts`
- `apps/web/src/hooks/useWardrobeAssets.ts`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`

Outcome:

- a successfully published garment can now hydrate into `Closet` through the implemented product read path instead of silently falling back to local cache
- product-side regression coverage now exists for the admin publish -> runtime catalog seam
- the next garment issue is admin draft default drift, not published garment hydration

### `Phase 2 / Batch 5`

Status: `completed`

Completed work:

1. replaced the invalid admin draft skeleton fallback with the canonical runtime default from the garment domain
2. normalized legacy invalid draft skeleton ids back onto the current registry during category-based draft normalization
3. regenerated category-owned runtime defaults for unsaved guided drafts so category changes do not keep stale model paths, anchors, collision zones, or body-mask zones
4. added admin-side regression coverage proving a brand-new guided draft is semantically publishable without raw JSON edits and that `tops -> shoes` draft normalization stays coherent
5. documented the guided draft baseline in the admin publishing notes

Evidence:

- `apps/admin/src/lib/publishedGarmentDraft.ts`
- `apps/admin/src/lib/publishedGarmentDraft.test.ts`
- `docs/admin-asset-publishing.md`

Outcome:

- the guided admin create flow no longer starts from a validator-rejected skeleton profile
- legacy draft state that still carries the old invalid skeleton id is automatically repaired during guided normalization
- unsaved guided drafts no longer keep tops-derived runtime defaults after a category change
- the next garment contract gap is API envelope hardening, not the default admin draft baseline

### `Phase 2 / Batch 6`

Status: `completed`

Completed work:

1. added canonical runtime-garment success envelope schemas in `@freestyle/contracts` for list and item responses
2. wrapped the implemented `/v1/closet/runtime-garments` and `/v1/admin/garments*` success paths in those contract parses instead of returning ad hoc objects
3. expanded garment route coverage to parse real create, list, detail, and update responses through the shared schemas
4. tightened product namespace smoke to parse representative garment list responses, not just status codes
5. corrected garment API docs so the live response shape and current valid skeleton profile match the implementation

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- runtime-garment routes now share the same envelope-hardening pattern already used by the profile and canvas boundaries
- create, detail, update, and list success responses are guarded by canonical contract tests instead of field spot checks
- active API docs no longer advertise the invalid historical skeleton id or the stale id-only admin response example
- the next garment seam is persisted-read validation, not the success envelope shape

### `Phase 2 / Batch 7`

Status: `completed`

Completed work:

1. replaced the runtime garment repository's all-or-nothing persisted read with item-level structural filtering so one malformed row no longer zeroes the whole catalog
2. added semantic garment validation on persisted read paths, not just write paths, so API reads now agree with the product consumer's published-garment parser
3. made single-item runtime garment reads degrade invalid persisted rows to `404` instead of re-emitting semantically broken data
4. added regression coverage for mixed persisted stores containing valid, malformed, and semantically invalid rows
5. documented the read-side filtering rules in the active API contract reference

Evidence:

- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- malformed persisted runtime garment rows no longer blank out the entire API catalog
- the admin/API read path and the product-side published-garment consumer now agree on which persisted garments are valid enough to surface
- invalid persisted rows are degraded predictably: filtered from list responses and treated as missing on detail reads
- the next Phase 2 gap is fit-domain contract hardening, not the runtime garment publication seam

### `Phase 2 / Batch 8`

Status: `completed`

Completed work:

1. added the first explicit runtime schemas for `GarmentFitState`, `GarmentFitRisk`, `GarmentFitDimensionAssessment`, and `GarmentFitAssessment` in `@freestyle/contracts`
2. tightened the shared contract tests so malformed fit payloads are rejected when `limitingKeys` drift away from the assessed dimensions
3. wrapped `assessGarmentPhysicalFit` in the shared fit assessment parser so the canonical domain path now emits contract-valid payloads instead of raw objects
4. added domain regression coverage for both standard garment rows and head-measured accessories against the new fit assessment contract
5. updated the active fit-system docs to point at the contract-backed physical-fit payload instead of treating it as a type-only convention

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/validation.test.ts`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`

Outcome:

- the active physical-fit payload is now a parsed contract instead of a type-only shape
- `Closet` and admin consumers that already rely on `assessGarmentPhysicalFit` now inherit the same runtime validation guarantees
- the remaining fit-domain drift is isolated to the legacy shared-3d `fitSummary` helper path rather than the product's canonical fit assessment route

### `Phase 2 / Batch 9`

Status: `completed`

Completed work:

1. removed the legacy `shared-3d/fittingCore` helper that still carried its own `tight / trim / regular / relaxed / oversized` fit vocabulary
2. removed the mannequin and studio shim exports that only re-exported that helper path
3. removed the helper-only mannequin and studio tests from `test:core` so the active core suite now tracks only canonical product and domain paths
4. closed the last known Phase 2 drift without adding another adapter layer on top of the canonical fit assessment route

Evidence:

- `package.json`
- `apps/web/src/features/shared-3d/fittingCore.ts`
- `apps/web/src/features/mannequin/fitting.ts`
- `apps/web/src/features/mannequin/fitting.test.ts`
- `apps/web/src/features/studio/fitting.ts`
- `apps/web/src/features/studio/fitting.test.ts`

Outcome:

- non-product helper paths no longer preserve a second incompatible fit vocabulary beside the canonical `assessGarmentPhysicalFit` path
- `Phase 2` can now be treated as complete on the active mannequin-first hardening track
- the next meaningful gap is no longer contracts drift; it is `Closet` and `runtime-3d` decomposition and regression hardening

### `Phase 3 / Batch 1`

Status: `completed`

Completed work:

1. extracted a shared runtime glTF loader so live stage loads and preloads now share one `DRACOLoader` + `MeshoptDecoder` configuration
2. moved runtime preload model-path collection into a pure helper instead of duplicating avatar and garment path selection inline
3. added focused runtime regression tests that lock shared decoder parity plus deduped avatar/garment preload behavior and default-model fallback semantics
4. updated the active runtime rules so future changes know the loader configuration is a single-source concern inside `packages/runtime-3d`

Evidence:

- `packages/runtime-3d/src/runtime-gltf-loader.ts`
- `packages/runtime-3d/src/runtime-gltf-loader.test.ts`
- `packages/runtime-3d/src/runtime-model-paths.ts`
- `packages/runtime-3d/src/runtime-model-paths.test.ts`
- `packages/runtime-3d/src/preload-runtime-assets.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`

Outcome:

- runtime preloads no longer drift behind the live stage loader configuration
- meshopt-capable runtime GLBs now take the same decode path whether they are preloaded or opened on demand
- the next Phase 3 batch can focus on scene decomposition or disposal policy instead of another duplicated loader seam

### Next Batch

`Phase 3 / Batch 2` should keep `Closet` and `runtime-3d` stabilization moving by extracting stage composition or disposal ownership from `packages/runtime-3d/src/closet-stage.tsx` without widening the batch back into page-shell work.

### `Phase 3 / Batch 2`

Status: `completed`

Completed work:

1. extracted runtime clone-material ownership into a shared disposal helper instead of leaving clone/cleanup responsibility implicit inside `closet-stage.tsx`
2. added scene-bound cleanup for cloned avatar and garment material instances so stage-owned resources are released when the cloned scene changes or unmounts
3. added focused runtime disposal tests that lock “dispose only clone-owned materials” behavior for single and multi-material meshes
4. updated active runtime docs so future batches keep cleanup explicit without accidentally disposing shared `useGLTF` cache resources

Evidence:

- `packages/runtime-3d/src/runtime-disposal.ts`
- `packages/runtime-3d/src/runtime-disposal.test.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- cloned runtime materials now have an explicit owner and cleanup path
- `closet-stage.tsx` no longer hides clone-material lifecycle policy inside a local helper
- the next Phase 3 batch can focus on stage composition or failure fallback ownership instead of material lifecycle ambiguity

### `Phase 3 / Batch 3`

Status: `completed`

Completed work:

1. moved host-level runtime loading, chunk-failure retry, and WebGL-unavailable fallback ownership into `AvatarStageViewport` instead of leaving the page with a silent dynamic-import hole
2. added a dedicated product-side fallback component so loading, error, and unsupported states share one visible shell outside the runtime canvas
3. added an in-canvas loading placeholder for `closet-stage` suspend paths so avatar and garment asset loads no longer collapse to backdrop-only emptiness
4. added focused regression coverage for both the host fallback component and the stage loading placeholder
5. updated active runtime docs so future batches keep fallback ownership split by seam instead of widening it into a global stage error boundary

Evidence:

- `apps/web/src/components/product/AvatarStageViewport.tsx`
- `apps/web/src/components/product/AvatarStageViewportFallback.tsx`
- `apps/web/src/components/product/AvatarStageViewportFallback.test.tsx`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/runtime-3d/src/closet-stage-fallback.tsx`
- `packages/runtime-3d/src/closet-stage-fallback.test.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/architecture-overview.md`
- `docs/quality-gates.md`

Outcome:

- `AvatarStageViewport` now owns the first visible runtime boundary for chunk load and WebGL support instead of assuming the runtime package can always mount
- asset suspend paths inside `closet-stage` now show a visible placeholder instead of a blank canvas with only backdrop state
- `Phase 3` progress is now blocked more by composition extraction and broader lifecycle regression coverage than by missing visible fallback ownership

### `Phase 3 / Batch 4`

Status: `completed`

Completed work:

1. extracted the `AvatarStageViewport` support/load/retry policy into a pure lifecycle helper instead of leaving the host state machine implicit inside the component
2. added focused lifecycle regression coverage for unsupported WebGL, quality-tier clamping, retry state transitions, and stale load-result rejection
3. kept the rendered fallback UI and runtime package ownership unchanged while making the host-side lifecycle deterministic and testable
4. extended the active core suite so host stage lifecycle regressions are caught alongside fallback markup and runtime helper tests

Evidence:

- `apps/web/src/components/product/AvatarStageViewport.tsx`
- `apps/web/src/components/product/avatar-stage-viewport-lifecycle.ts`
- `apps/web/src/components/product/avatar-stage-viewport-lifecycle.test.ts`
- `package.json`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- `AvatarStageViewport` no longer hides its load-state transition rules inside local effect code
- unsupported, retry, and stale-attempt host lifecycle regressions now have node-level coverage without mounting `Canvas`
- the next Phase 3 gap is stage composition extraction or deeper runtime-side lifecycle coverage, not the unguarded host state machine

### `Phase 3 / Batch 5`

Status: `completed`

Completed work:

1. extracted top-level `Closet` scene policy into a pure runtime helper instead of leaving `dpr`, lighting, damping, and motion gating inline inside `closet-stage.tsx`
2. reused that helper from the live stage so top-level scene composition now consumes one policy source instead of repeating quality-tier and avatar-only branching
3. added node-level regression coverage for avatar-only vs dressed stage policy, long-hair/loose-garment motion gating, and low-tier damping/shadow fallback
4. extended the active core suite so runtime stage policy regressions are caught beside loader, fallback, and disposal helpers

Evidence:

- `packages/runtime-3d/src/reference-closet-stage-policy.ts`
- `packages/runtime-3d/src/reference-closet-stage-policy.test.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `package.json`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`

Outcome:

- `closet-stage.tsx` no longer hides its top-level scene policy inside inline quality/avatar branching
- runtime stage policy now has node-level coverage without mounting the full `Canvas`
- `Phase 3` is now limited less by runtime shell drift and more by unfinished persistence, worker, and release phases outside the current batch

### `Phase 4 / Batch 1`

Status: `completed`

Completed work:

1. introduced an explicit API-side `BodyProfile` persistence port instead of leaving the profile route coupled directly to one JSON-file implementation
2. moved the current file-backed `BodyProfile` store onto a versioned envelope so later remote adapter replacement has a stable migration seam
3. added focused repository tests for memory/file adapters, legacy object-map compatibility, and versioned envelope writes
4. added a route-level regression that proves unreadable profile backing stores fail as `500` without breaking the product namespace contract

Evidence:

- `apps/api/src/modules/profile/body-profile.repository.ts`
- `apps/api/src/modules/profile/body-profile.repository.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `package.json`
- `docs/api-contract.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- `/v1/profile/body-profile` keeps the same product contract while the server-side persistence seam is now replaceable
- body-profile local file persistence is versioned instead of being an unstructured user-id map only
- the next Phase 4 gap is published runtime-garment persistence/auth hardening, not the unscoped profile backing store

### `Phase 4 / Batch 2`

Status: `completed`

Completed work:

1. split `/v1/admin/garments*` away from anonymous-capable product auth by introducing explicit admin auth for the publication boundary
2. moved published runtime-garment file persistence behind a replaceable API-side port with file and memory adapters
3. added focused repository coverage for runtime-garment persistence adapters and route coverage for anonymous rejection, unreadable backing stores, and admin-boundary failures
4. kept `/v1/closet/runtime-garments` on the existing product read contract while hardening only the admin publication seam

Evidence:

- `apps/api/src/modules/auth/auth.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.test.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `package.json`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- admin garment publication is no longer reachable through anonymous-header fallback
- published runtime-garment persistence now has the same replaceable-port seam as body profile without changing the public closet response contract
- the next Phase 4 gap is remote backing-store / RLS expansion, not an undocumented local file seam or open admin publish boundary

### `Phase 4 / Batch 3`

Status: `completed`

Completed work:

1. added a dedicated `published_runtime_garments` Supabase table plus authenticated-read RLS policy and trigger/index coverage for runtime publication rows
2. wired the API-side published runtime-garment persistence port to a real Supabase-backed adapter while preserving the file fallback for isolated dev/test workflows
3. propagated admin actor context through garment create/update writes and added focused repository coverage for the new remote adapter seam
4. documented the new driver selection and native-module execution workaround so local validation remains reproducible under Codex desktop

Evidence:

- `supabase/migrations/007_published_runtime_garments.sql`
- `supabase/schema.sql`
- `packages/db/src/index.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.test.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `README.md`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- admin garment publication now has a real remote backing-store seam instead of only a local JSON publication file
- the public closet contract did not change while the admin publishing path gained an RLS-ready Supabase store
- `Phase 4` is now closed at the current program scope, and the next highest-signal work moves to worker/job contracts instead of persistence plumbing

### Next Batch

### `Phase 5 / Batch 1`

Status: `completed`

Completed work:

1. added canonical `job-payload.v1` and `job-result.v1` envelope contracts and wired the import-chain workers to normalize legacy rows before handling them
2. moved `createJob` to user-scoped idempotency lookup and added a follow-up migration that changes the uniqueness boundary to `(user_id, job_type, idempotency_key)`
3. wrapped worker success/failure results before persistence so status reads stop exposing arbitrary raw blobs as the primary contract
4. normalized `GET /v1/jobs/:job_id` responses through a dedicated serializer with `trace_id` and canonical result envelopes

Evidence:

- `packages/contracts/src/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/job-contracts.test.ts`
- `packages/db/src/index.ts`
- `packages/queue/src/index.ts`
- `packages/queue/src/index.test.ts`
- `apps/api/src/modules/jobs/jobs.service.ts`
- `apps/api/src/modules/jobs/jobs.service.test.ts`
- `workers/importer/src/worker.ts`
- `workers/background_removal/src/worker.ts`
- `workers/asset_processor/src/worker.ts`
- `supabase/migrations/008_jobs_user_scoped_idempotency.sql`
- `docs/api-contract.md`
- `docs/worker-playbook.md`
- `docs/quality-gates.md`

Outcome:

- the import-chain queue path now has a canonical payload/result contract instead of relying on ad hoc casts and raw result blobs
- trace propagation survives import -> background removal -> asset processing fan-out
- duplicate replay of the same idempotency key can no longer collide across different users

### Next Batch

`Phase 5 / Batch 2` should extend the same contract discipline to `evaluator.outfit` and `tryon.generate`, then add route-level jobs smoke before moving into `Phase 6 / Batch 1`.

## Phase 0 Closeout

`Phase 0` is complete when all of the following are true:

- the active improvement tracker is present and linked from the core docs
- repo inventory and route boundary docs reflect the current codebase
- contract ownership is written down
- AI agent operating rules for this improvement program are written down
- quality gates are written down as an execution-facing summary
- the current program no longer depends on ambiguous `Phase 0 / 0.5 / 1A / 1B` terminology from the historical rollout docs

## Notes

- The historical rollout docs are still useful for widget/canary operational context.
- They are not the current source of truth for the mannequin-first hardening program.
