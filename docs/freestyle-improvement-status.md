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
- Working overall completion estimate: `75%`

The completion estimate is a planning number, not a release gate. It reflects that the repo already has the mannequin-first product shape, contracts package, runtime package split, and early admin/runtime garment flow, while persistence hardening, worker contracts, and release-grade QA remain unfinished.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `completed` | `Batch 1` and `Batch 2` are complete |
| `Phase 1` | Product / Legacy / Lab separation hardening | `completed` | Boundary helpers, smoke guards, and historical-doc markers are aligned to the current product definition |
| `Phase 2` | contracts and domain core hardening | `partial` | `packages/contracts`, `domain-avatar`, `domain-garment`, and `domain-canvas` exist, but ownership and single-source policy need tightening |
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

- `docs/SUBAGENT_TEAM.md`
- `docs/replatform-v2/execution-status.md`
- `docs/replatform-v2/contracts-freeze.md`
- `docs/RENEWAL_APP_ARCHITECTURE.md`
- `docs/RENEWAL_INFORMATION_ARCHITECTURE.md`
- `docs/PROJECT_HEALTH_2026-02-11.md`
- `docs/api-contract.md`

Outcome:

- historical rollout and renewal docs are less likely to be mistaken for current route ownership or IA guidance
- active maintainers now have a clearer path back to the current boundary source of truth
- Phase 1 ambiguity from doc drift is reduced enough to move into contract and domain hardening work

### Next Batch

`Phase 2 / Batch 1` should focus on contracts and domain-core ownership hardening, starting with the highest-risk shared schemas and their real consumers.

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
