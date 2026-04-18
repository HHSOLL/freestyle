# Contract Ownership

## Purpose

This document fixes the current contract ownership model for the mannequin-first FreeStyle program.

Use it to answer three questions before a change starts:

1. what contract area is changing
2. who owns the write scope
3. which docs and code sources must stay in sync

This is a role-based ownership map, not a people directory.

The owner roles below are logical stewardship roles. They are not a separate hard-coded system from `docs/SUBAGENT_TEAM.md`; task-level subagent selection should map into these stewardship roles for the current batch.

## Scope

This document applies to the current product program described by:

- `README.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/freestyle-improvement-status.md`
- `docs/product-boundaries.md`

It does not replace the historical rollout ownership docs under `docs/replatform-v2/**`.

## Priority Order

When documents disagree, resolve conflicts in this order:

1. `README.md`
2. `docs/DEVELOPMENT_GUIDE.md`
3. `docs/freestyle-improvement-status.md`
4. `docs/product-boundaries.md`
5. this document
6. historical rollout docs such as `docs/replatform-v2/**`

## Ownership Rules

1. One write owner per path group at a time.
2. Contract changes must update both the code source of truth and the paired docs in the same change set.
3. If one change touches more than one ownership row below, the coordinator must split or sequence the work.
4. Changes to route class, API namespace, runtime contract, or release gate require a read-only reviewer sidecar.
5. Historical widget or canary docs do not override the current mannequin-first product ownership model.

## Contract Areas

| Area | Code source of truth | Paired docs | Primary owner role | Secondary owner role | Requires explicit coordination when |
| --- | --- | --- | --- | --- | --- |
| Product IA and route boundaries | `apps/web/route-map.mjs`, `apps/web/src/lib/product-routes.ts` | `docs/product-boundaries.md`, `docs/architecture-overview.md` | Coordinator / Docs Steward | Frontend Surface Owner | a route moves between product, redirect, legacy, or lab |
| API namespace boundaries | `apps/api/src/main.ts`, `apps/api/src/lib/route-namespaces.ts` | `docs/api-contract.md`, `docs/product-boundaries.md` | API Contract Owner | Coordinator / Docs Steward | an endpoint changes prefix or surface class |
| Shared schemas and cross-app payloads | `packages/contracts/**`, `packages/shared-types/**`, `packages/shared/**` | `docs/api-contract.md` | API Contract Owner | Queue & Data Owner | a shape changes, a field is removed, or compatibility behavior changes |
| Body profile and avatar mapping | `packages/contracts/**`, `packages/domain-avatar/**`, `packages/shared-types/**` | `docs/api-contract.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/architecture-overview.md` | Avatar Domain Owner | API Contract Owner | measurement mapping or persisted body profile shape changes |
| Garment runtime contract | `packages/domain-garment/**`, `packages/contracts/**` | `docs/garment-fitting-contract.md`, `docs/admin-asset-publishing.md` | Garment Contract Owner | Admin Publishing Owner | required runtime fields, size metadata, or validation semantics change |
| 3D runtime manifest and stage behavior | `packages/runtime-3d/**` | `docs/DEVELOPMENT_GUIDE.md`, `docs/architecture-overview.md`, `docs/quality-gates.md` | Runtime Owner | Garment Contract Owner | avatar manifest, loader behavior, quality tiers, or fallback behavior changes |
| Canvas composition contract | `packages/domain-canvas/**` | `docs/architecture-overview.md` | Canvas Domain Owner | Frontend Surface Owner | serialization or stored composition shape changes |
| Admin publishing contract | `apps/admin/**`, `apps/api/src/routes/runtime-garments.routes.ts`, `apps/api/src/modules/garments/**` | `docs/admin-asset-publishing.md`, `docs/api-contract.md` | Admin Publishing Owner | API Contract Owner | publish payload shape, validation flow, or preview behavior changes |
| Worker and job lifecycle contract | `workers/runtime/**`, `packages/queue/**`, `packages/db/**`, `workers/*` | `docs/worker-playbook.md`, `docs/quality-gates.md` | Queue & Data Owner | API Contract Owner | job payloads, claim/retry rules, or persistence state transitions change |
| Quality and release gate contract | `package.json`, `.github/workflows/quality.yml` | `docs/MAINTENANCE_PLAYBOOK.md`, `docs/quality-gates.md` | Release Quality Owner | Coordinator / Docs Steward | commands, evidence requirements, or blocking criteria change |
| Historical widget and rollout contracts | `apps/api/src/routes/widget.routes.ts`, `packages/widget-sdk/**` | `docs/replatform-v2/**`, `docs/rollout-governance/**` | Deployment / Rollout Owner | API Contract Owner | widget or canary rules change; these changes stay out of the mannequin-first product tracker unless explicitly adopted |

## Approval Rules

The following changes should not merge without explicit coordination and reviewer coverage:

- moving any endpoint between `/v1`, `/v1/legacy`, and `/v1/lab`
- changing `@freestyle/contracts` or `packages/shared-types` shapes in a way that affects more than one surface
- changing required garment runtime fields or semantic garment validation behavior
- changing runtime asset loading, disposal, or quality-tier behavior
- changing documented release blockers or the minimum required evidence for a release

## Handoff Rules

- Route boundary change: Coordinator / Docs Steward -> API Contract Owner -> Frontend or Runtime owner
- Schema change: API Contract Owner -> affected domain owner -> Queue & Data owner when persistence or jobs are involved
- Garment/runtime change: Garment Contract Owner -> Runtime Owner -> Admin Publishing Owner when publish flow is affected
- Release gate change: Release Quality Owner -> Coordinator / Docs Steward

## Doc Sync Rules

When these areas change, update the paired docs immediately:

- route or IA boundary: `docs/product-boundaries.md`, `docs/architecture-overview.md`
- API namespace or cross-app schema: `docs/api-contract.md`
- avatar or body mapping: `docs/DEVELOPMENT_GUIDE.md`, `docs/architecture-overview.md`
- garment runtime rules: `docs/garment-fitting-contract.md`, `docs/admin-asset-publishing.md`
- runtime stage behavior: `docs/quality-gates.md`, `docs/MAINTENANCE_PLAYBOOK.md`
- release gates: `docs/quality-gates.md`, `docs/MAINTENANCE_PLAYBOOK.md`

## Out Of Scope

- implementation details inside a single feature PR
- people assignments, team roster, or staffing plans
- KPI targets or release business approval
