# FreeStyle Improvement Status

## Purpose

This document is the active execution tracker for the repository improvement program aligned to the 2026-04-18 FreeStyle review.

It is separate from `docs/replatform-v2/**`.

- `docs/replatform-v2/**` remains the historical rollout and widget/canary track.
- This file tracks the current mannequin-first product hardening program.
- When the two disagree, use this file together with `README.md`, `docs/architecture-overview.md`, `docs/repo-inventory.md`, and `docs/product-boundaries.md`.

## As Of

- Date: `2026-04-18`
- Current branch baseline: `main`
- Working overall completion estimate: `65%`

The completion estimate is a planning number, not a release gate. It reflects that the repo already has the mannequin-first product shape, contracts package, runtime package split, and early admin/runtime garment flow, while persistence hardening, worker contracts, and release-grade QA remain unfinished.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `in_progress` | Current batch is `Phase 0 / Batch 1` |
| `Phase 1` | Product / Legacy / Lab separation hardening | `partial` | Core structure exists, but historical docs and residual flows still create ambiguity |
| `Phase 2` | contracts and domain core hardening | `partial` | `packages/contracts`, `domain-avatar`, `domain-garment`, and `domain-canvas` exist, but ownership and single-source policy need tightening |
| `Phase 3` | Closet and runtime-3d stabilization | `partial` | Shared runtime exists; decomposition, disposal policy, and regression coverage still need work |
| `Phase 4` | server persistence and admin publishing hardening | `partial` | Admin/API paths exist; remote persistence, RLS coverage, and publishing contract still need expansion |
| `Phase 5` | worker, job contract, and observability hardening | `partial` | Runtime worker exists; canonical job payload/result contracts and idempotency tracing need stronger enforcement |
| `Phase 6` | QA, security, and release candidate | `not_started` | Quality gates exist, but end-to-end release evidence is incomplete for the current product definition |

## Current Batch

### `Phase 0 / Batch 1`

Goal:

1. create an active improvement tracker for the new program
2. document the current repo inventory from actual code structure
3. freeze the current Product / Legacy / Lab boundaries from actual route files

Deliverables:

- `docs/freestyle-improvement-status.md`
- `docs/repo-inventory.md`
- `docs/product-boundaries.md`

Exit criteria:

- the active improvement program has a single visible tracker
- the current repo structure is documented from code, not memory
- the current route boundary rules are documented from `apps/web/route-map.mjs`, `apps/web/src/lib/product-routes.ts`, and `apps/api/src/main.ts`

## Next Batch

### `Phase 0 / Batch 2`

Planned scope:

1. add `docs/contract-ownership.md`
2. add `docs/ai-agent-playbook.md`
3. add `docs/quality-gates.md` as a concise execution-facing summary of required commands and route/runtime checks

## Stop Conditions Before Phase 1

Do not mark `Phase 0` complete until all of the following are true:

- the active improvement tracker is present and linked from the core docs
- repo inventory and route boundary docs reflect the current codebase
- contract ownership is written down
- AI agent operating rules for this improvement program are written down
- the current program no longer depends on ambiguous `Phase 0 / 0.5 / 1A / 1B` terminology from the historical rollout docs

## Notes

- The historical rollout docs are still useful for widget/canary operational context.
- They are not the current source of truth for the mannequin-first hardening program.
