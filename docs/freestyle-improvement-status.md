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
- Working overall completion estimate: `81%`

The completion estimate is a planning number, not a release gate. It reflects that the repo already has the mannequin-first product shape, contracts package, runtime package split, and early admin/runtime garment flow, while persistence hardening, worker contracts, and release-grade QA remain unfinished.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `completed` | `Batch 1` and `Batch 2` are complete |
| `Phase 1` | Product / Legacy / Lab separation hardening | `completed` | Boundary helpers, smoke guards, and historical-doc markers are aligned to the current product definition |
| `Phase 2` | contracts and domain core hardening | `partial` | `BodyProfile`, local canvas hydration, and `/v1/canvas/looks` adapter envelopes are hardened; garment publication/runtime tightening still remains |
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

### Next Batch

`Phase 2 / Batch 4` should move to the garment publication/runtime contract boundary. Keep the batch narrow to one path group and do not reopen canvas UI or persistence model changes in the same PR.

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
