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
- Working overall completion estimate: `87%`

The completion estimate is a planning number, not a release gate. It reflects that the repo already has the mannequin-first product shape, contracts package, runtime package split, and early admin/runtime garment flow, while persistence hardening, worker contracts, and release-grade QA remain unfinished.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `completed` | `Batch 1` and `Batch 2` are complete |
| `Phase 1` | Product / Legacy / Lab separation hardening | `completed` | Boundary helpers, smoke guards, and historical-doc markers are aligned to the current product definition |
| `Phase 2` | contracts and domain core hardening | `partial` | `BodyProfile`, local canvas hydration, canvas API envelopes, and runtime garment API envelopes are hardened; persisted-read validation and fit-domain contracts still remain |
| `Phase 3` | Closet and runtime-3d stabilization | `partial` | Shared runtime exists; decomposition, disposal policy, and regression coverage still need work |
| `Phase 4` | server persistence and admin publishing hardening | `partial` | Admin/API paths exist; remote persistence, RLS coverage, and publishing contract still need expansion |
| `Phase 5` | worker, job contract, and observability hardening | `partial` | Runtime worker exists; canonical job payload/result contracts and idempotency tracing need stronger enforcement |
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

### Next Batch

`Phase 2 / Batch 7` should harden persisted runtime-garment read validation in `apps/api`, deciding explicitly how malformed or semantically invalid stored rows are filtered or failed and adding regression coverage for those read-path cases.

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
