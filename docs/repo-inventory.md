# Repo Inventory

## Purpose

This file documents the current FreeStyle repository structure from the actual tree on `2026-04-18`.

It exists to support safe phase-based work:

- avoid guessing where product logic lives
- avoid reopening archived or generated paths by mistake
- make write ownership easier to assign before using subagents

## Inventory Rules

- Treat source directories as authoritative.
- Do not treat generated directories such as `.next/`, `.vercel/`, or future `dist/` outputs as source of truth.
- When a path group changes responsibility, update this file in the same change set.

## Top-Level Areas

| Path | Purpose |
| --- | --- |
| `apps/` | deployable web, admin, and API surfaces |
| `packages/` | shared domain logic, runtime, storage, queue, UI, and contracts |
| `workers/` | background job workers and pipeline-specific worker code |
| `authoring/` | offline avatar / garment / manifest authoring assets and guides |
| `supabase/` | schema, migrations, and seed inputs |
| `docs/` | architecture, product, operations, and rollout docs |
| `plugins/` | repo-local Codex plugin source |
| `.agents/` | repo-local plugin marketplace metadata |
| `scripts/` | validation, optimization, and authoring automation scripts |

## Deployable Apps

| Path | Role | Notes |
| --- | --- | --- |
| `apps/web` | main product shell | public home plus `Closet`, `Canvas`, `Community`, `Profile` |
| `apps/admin` | internal publishing surface | garment create/update/preview/publish workflow |
| `apps/api` | Fastify API | product, legacy, and lab namespaces plus health routes |

## Domain And Shared Packages

| Path | Role |
| --- | --- |
| `packages/contracts` | zod-backed shared contracts and validation helpers |
| `packages/domain-avatar` | body profile normalization and avatar mapping logic |
| `packages/domain-garment` | garment catalog, bindings, skeleton profiles, and fit metadata |
| `packages/domain-canvas` | canvas composition models and serialization |
| `packages/runtime-3d` | shared avatar manifest, closet stage runtime, and asset preload/budget logic |
| `packages/ui` | shared UI primitives |
| `packages/design-tokens` | visual tokens aligned to the wardrobe system |
| `packages/shared-types` | canonical shared types |
| `packages/shared-utils` | generic helpers |
| `packages/shared` | older cross-boundary shared package still used by API/widget paths |
| `packages/db` | database configuration and shared DB helpers |
| `packages/storage` | storage adapters |
| `packages/queue` | queue lifecycle helpers |
| `packages/observability` | trace and logging helpers |
| `packages/widget-sdk` | legacy/widget SDK surface |
| `packages/ai` | AI-facing shared integration surface |

## Workers

| Path | Role |
| --- | --- |
| `workers/runtime` | main background runtime worker |
| `workers/importer` | import pipeline worker |
| `workers/asset_processor` | asset processing and garment profile worker |
| `workers/background_removal` | cutout/background removal worker |
| `workers/evaluator` | evaluation worker |
| `workers/tryon` | lab try-on worker |

## Authoring And Asset Areas

| Path | Role |
| --- | --- |
| `authoring/avatar` | avatar authoring guides and source assets |
| `authoring/garments` | garment authoring guides and source assets |
| `authoring/manifests` | manifest-related authoring documentation |
| `apps/web/public/assets` | shipped runtime assets consumed by the web product |

## Key Product Route Sources

| Path | Role |
| --- | --- |
| `apps/web/route-map.mjs` | redirect and navigation route source |
| `apps/web/src/lib/product-routes.ts` | product navigation and quarantined redirect helpers |
| `apps/api/src/main.ts` | API namespace registration |
| `apps/api/src/routes/*.ts` | route modules mounted under the registered namespaces |

## Key Runtime And Contract Sources

| Path | Role |
| --- | --- |
| `packages/runtime-3d/src/avatar-manifest.ts` | current avatar runtime manifest |
| `packages/runtime-3d/src/closet-stage.tsx` | current live closet stage runtime |
| `packages/domain-garment/src/skeleton-profiles.ts` | skeleton compatibility source |
| `packages/contracts/src/index.ts` | shared contract exports |
| `packages/shared-types/src/index.ts` | shared type definitions used across surfaces |

## Key Operational Docs

| Path | Role |
| --- | --- |
| `README.md` | current product definition |
| `docs/DEVELOPMENT_GUIDE.md` | engineering rules and boundaries |
| `docs/MAINTENANCE_PLAYBOOK.md` | smoke and release checks |
| `docs/TECH_WATCH.md` | daily discovery log |
| `docs/freestyle-improvement-status.md` | active improvement tracker |
| `docs/product-boundaries.md` | current route and namespace freeze |

## Current Risks Visible From The Tree

1. Historical rollout docs under `docs/replatform-v2/**` still exist alongside the current mannequin-first product docs.
2. Legacy and lab workers/routes still live in the same monorepo as the main product, so route and ownership mistakes remain possible.
3. Generated app directories are present under `apps/web/.next` and `apps/admin/.next`; they should not influence planning or ownership decisions.
