# Product Boundaries

## Purpose

This file freezes the current runtime boundaries for the mannequin-first FreeStyle product as of `2026-04-18`.

Use this file before changing routes, moving features, or delegating work to subagents.

## Boundary Summary

FreeStyle currently has four different route classes:

1. public product surfaces
2. compatibility redirects
3. legacy API surfaces
4. lab API surfaces

Admin publishing exists as its own operational surface and must not be treated as part of the public product shell.

## Public Product Surfaces

These are the active user-facing surfaces.

| Surface | Web path | Notes |
| --- | --- | --- |
| `Home` | `/` | public landing route |
| `Closet` | `/app/closet` | primary fitting surface |
| `Canvas` | `/app/canvas` | composition and saved look surface |
| `Community` | `/app/community` | feed/discovery surface |
| `Profile` | `/app/profile` | body profile and account-oriented surface |
| `Share` | `/share/[slug]` | public shared look surface |
| `Auth callback` | `/auth/callback` | auth bridge, not a primary surface |

## Compatibility Redirects

These are not independent product surfaces. They remain only to preserve older entry points.

| From | To |
| --- | --- |
| `/app/fitting` | `/app/closet` |
| `/studio` | `/app/closet` |
| `/trends` | `/app/community` |
| `/examples` | `/app/community` |
| `/how-it-works` | `/app/community` |
| `/profile` | `/app/profile` |
| `/app/looks` | `/app/canvas` |
| `/app/looks/new` | `/app/canvas` |
| `/app/looks/:id` | `/app/canvas` |
| `/app/decide` | `/app/closet` |
| `/app/decide/item/:id` | `/app/closet` |
| `/app/journal` | `/app/profile` |
| `/app/journal/:entryId` | `/app/profile` |
| `/app/discover` | `/app/community` |
| `/app/discover/inspiration/:id` | `/app/community` |
| `/app/closet/item/:id` | `/app/closet` |
| `/app/closet/import` | `/app/community` |

Rules:

- Do not re-promote these redirects into first-class product IA without an explicit product decision.
- Redirect health belongs in maintenance smoke checks, not in the main product surface list.

## API Surface Boundaries

### Product API

- Prefix: `/v1`
- Registered in: `apps/api/src/main.ts`
- Response header: `x-freestyle-surface: product`

Current product modules:

- auth
- profile
- closet
- runtime garments
- canvas
- community

Representative paths:

- `/v1/profile/body-profile`
- `/v1/closet/items`
- `/v1/closet/runtime-garments`
- `/v1/canvas/looks`
- `/v1/community/looks`

### Admin API

Admin routes are mounted inside the product namespace, but they are not part of the public product IA.

- Prefix: `/v1/admin`
- Current operational role: internal garment publication workflow

Representative paths:

- `/v1/admin/garments`
- `POST /v1/admin/garments`

Rules:

- Do not expose admin publishing flows through the public product shell.
- Keep admin-specific docs, forms, and validation rules separate from public closet logic.

### Legacy API

- Prefix: `/v1/legacy`
- Response headers: `x-freestyle-surface: legacy`, `deprecation: true`

Current legacy modules:

- jobs
- assets
- outfits
- widget

Rules:

- Legacy endpoints may remain for migration, replay, or compatibility work.
- Public product routes must not depend on legacy APIs as their primary data path.

### Lab API

- Prefix: `/v1/lab`
- Response header: `x-freestyle-surface: lab`

Current lab modules:

- evaluations
- tryons

Rules:

- Lab endpoints are experimental.
- Failures in lab must not break Home, Closet, Canvas, Community, or Profile.

## Source Files

These files are the current boundary source of truth:

- `apps/web/route-map.mjs`
- `apps/web/src/lib/product-routes.ts`
- `apps/api/src/lib/route-namespaces.ts`
- `apps/api/src/main.ts`
- `docs/MAINTENANCE_PLAYBOOK.md`

## Operational Rules

1. Main web surfaces may use product APIs only.
2. Legacy and lab routes stay isolated and must be visibly secondary when surfaced at all.
3. Admin publishing is operational infrastructure, not product navigation.
4. Redirects are compatibility shims, not roadmap commitments.
5. If a route changes boundary class, update this file together with the route code and the maintenance smoke list.

## Current Drift To Watch

1. Historical rollout docs under `docs/replatform-v2/**` still use older phase language that should not be read as the current improvement program.
2. Some operational baseline docs still mention redirect routes as measurement cohorts. That is acceptable only for compatibility monitoring, not as the active product IA.
