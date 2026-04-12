# FreeStyle

![Wardrobe Reference](docs/reference/wardrobe-reference.jpg)

FreeStyle is now a mannequin-first wardrobe product. The main experience is no longer old shopping-link import or AI try-on experimentation. The product is organized around a real-time 3D human fitting flow:

1. Enter body measurements and body-frame traits.
2. Map those measurements into a rig-aware mannequin runtime.
3. Dress the mannequin in real time, rotate, zoom, and change pose.
4. Move garments and items into a styling canvas.
5. Keep the whole app visually aligned to the wardrobe reference image above.

## Main IA

- `Home` at `/`
- `Closet` at `/app/closet`
- `Fitting` at `/app/fitting`
- `Canvas` at `/app/canvas`
- `Community` at `/app/community`
- `Profile` at `/app/profile`

`/app/discover` still resolves, but only as a compatibility redirect to `/app/community`.
`/app/lab` still exists, but it is quarantined as experimental. It is not part of the main product flow.

## Product, Legacy, Lab

The repository is now split into three runtime surfaces:

- `Product`: `/v1/*`
  - `/v1/profile/body-profile`
  - `/v1/closet/items`
  - `/v1/canvas/looks`
  - `/v1/community/looks`
- `Legacy`: `/v1/legacy/*`
  - old import/assets/outfits/widget APIs
  - response header `x-freestyle-surface: legacy`
  - response header `deprecation: true`
- `Lab`: `/v1/lab/*`
  - evaluation and try-on experiments
  - response header `x-freestyle-surface: lab`

Main web surfaces should use product routes only. Legacy and lab are isolated on purpose.

## Current Runtime Status

The shipped runtime now uses:

- rigged human GLB base bodies
- a body-profile normalization layer
- rig-target transforms driven by measurements
- garment runtime bindings with anchors, collision zones, body masks, and render order
- pose control and quality tiers

Preferred authoring policy is:

- `MPFB2 / MakeHuman` first
- `CharMorph` fallback
- Blender only as offline authoring/export tooling
- web runtime output as `glb` or `gltf`

Important: the repo is structurally ready for that pipeline, but it does not yet ship an MPFB2-authored morph-target mannequin asset. The current production runtime uses fallback rigged human GLBs plus measurement-driven bone transforms. That is documented explicitly in [docs/avatar-pipeline.md](docs/avatar-pipeline.md).

## Monorepo Structure

```txt
apps/web                 Next.js product shell and routes
apps/api                 Fastify API with product / legacy / lab namespaces
workers/runtime          background worker runtime
packages/design-tokens   visual tokens from the wardrobe reference language
packages/domain-avatar   body profile normalization and avatar mapping
packages/domain-garment  garment runtime contract and starter closet data
packages/domain-canvas   canvas composition models and persistence helpers
packages/runtime-3d      R3F stage runtime, avatar manifest, asset budgets
packages/ui              shared wardrobe UI primitives
packages/shared-types    canonical product types
packages/shared-utils    shared helpers
packages/contracts       supporting API/widget contracts kept outside the core product domains
```

## What Changed In This Realignment

- Old duplicate root trees `src/` and `public/` were removed.
- Main navigation was rebuilt around `Closet / Fitting / Canvas / Community / Profile`.
- Legacy public routes such as `/studio`, `/trends`, `/examples`, `/how-it-works`, `/app/looks`, `/app/decide`, `/app/journal`, and `/profile` were redirected or removed from the main IA.
- Large legacy feature trees were deleted or quarantined.
- The product shell was rebuilt around the supplied wardrobe reference image:
  - centered mannequin stage
  - slim translucent side rails
  - floating top micro-toolbar
  - bottom segmented mode bar
  - neutral gray and white glass surfaces
- A real public home surface now exists at `/` instead of redirecting directly into `Closet`.

See [docs/migration-notes.md](docs/migration-notes.md) for the detailed deletion and quarantine log.

## Persistence Model

Current persistence is intentionally split by boundary:

- local repositories for body profile, closet scene, and canvas compositions
- product API namespace ready for remote persistence adapters
- normalized payloads that preserve compatibility with older flat `bodyProfile` storage

The current local-first repositories are in:

- `packages/domain-avatar`
- `packages/domain-canvas`
- `apps/api/src/modules/*`

## Development

```bash
npm install
npm run dev
```

Useful commands:

- `npm run dev`
- `npm run dev:api`
- `npm run dev:worker`
- `npm run check`
- `npm run validate:garment3d`

## Quality Gate

CI requires all of the following:

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run build:services`
- `npm run build`

## Core Documents

- [docs/architecture-overview.md](docs/architecture-overview.md)
- [docs/avatar-pipeline.md](docs/avatar-pipeline.md)
- [docs/garment-fitting-contract.md](docs/garment-fitting-contract.md)
- [docs/design-system.md](docs/design-system.md)
- [docs/migration-notes.md](docs/migration-notes.md)
- [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)
- [docs/MAINTENANCE_PLAYBOOK.md](docs/MAINTENANCE_PLAYBOOK.md)
- [docs/TECH_WATCH.md](docs/TECH_WATCH.md)
- [docs/OPEN_ASSET_CREDITS.md](docs/OPEN_ASSET_CREDITS.md)
