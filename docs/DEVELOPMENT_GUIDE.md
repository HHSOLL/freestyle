# Development Guide

## 1. Required Reading

Before changing the product, read these in order:

1. `README.md`
2. `docs/architecture-overview.md`
3. `docs/design-system.md`
4. `docs/avatar-pipeline.md`
5. `docs/garment-fitting-contract.md`
6. `docs/migration-notes.md`
7. `docs/TECH_WATCH.md`

## 2. Product Boundary

The main product is the five-surface wardrobe runtime:

- `Closet`
- `Fitting`
- `Canvas`
- `Discover`
- `Profile`

Do not reintroduce old IA into the main shell.

Allowed exceptions:

- `Legacy`: only through redirects, migration shims, or explicitly deprecated surfaces
- `Lab`: explicitly experimental and isolated from the main navigation

## 3. Package Boundaries

The minimum domain structure is fixed:

- `apps/web`
  - page orchestration only
  - no direct domain logic embedded in large page files
- `apps/api`
  - product, legacy, and lab namespace registration
  - persistence and repository boundaries
- `packages/design-tokens`
  - palette, radii, spacing, surface treatment
- `packages/ui`
  - shared wardrobe UI primitives
- `packages/domain-avatar`
  - body profile normalization
  - local repository adapters
  - measurement-to-avatar transform logic
- `packages/domain-garment`
  - garment starter catalog
  - skeleton profile registry
  - runtime binding validation
- `packages/domain-canvas`
  - canvas composition schema and serialization
- `packages/runtime-3d`
  - avatar render manifest
  - runtime asset budget
  - pose, rig, and scene control
- `packages/shared-types`
  - canonical types shared across app boundaries
- `packages/shared-utils`
  - shared utilities only

Cross-domain imports should remain narrow and directional. `runtime-3d` may consume domain packages, but `domain-avatar` and `domain-garment` must not depend on page or shell code.

## 4. Page Rules

Pages are orchestration only.

A page may:

- compose panels
- fetch or hydrate data
- connect hooks and repositories
- choose the active surface and route state

A page may not:

- hold large chunks of reusable visual logic
- implement rig math inline
- own shared persistence schema
- mix UI state and low-level 3D scene mutation logic

When a page grows, split it into:

- presentation components
- domain hooks
- repository adapters
- runtime scene components

## 5. Body Profile Lifecycle

The canonical lifecycle is:

`user input -> BodyProfile -> normalized avatar params -> rig targets -> runtime mannequin`

Use these boundaries:

- `BodyProfile` is the canonical storage object in `packages/shared-types`
- `bodyProfileToAvatarParams` converts measurements into normalized control space
- `avatarParamsToRigTargets` converts normalized values into rig-level transforms
- `AvatarStageCanvas` applies those transforms to the active skeleton

Do not use a single global XYZ scale as a body-measurement shortcut. Height, shoulder width, chest, waist, hip, arm length, torso length, and leg volume must travel through the mapping layer.

## 6. Garment Runtime Rules

Use `packages/domain-garment` as the garment contract source of truth.

Required runtime fields:

- `modelPath`
- `skeletonProfileId`
- `anchorBindings`
- `collisionZones`
- `bodyMaskZones`
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
- `metadata.fitProfile`

Current registry:

- skeleton profiles live in `packages/domain-garment/src/skeleton-profiles.ts`
- starter garments live in `packages/domain-garment/src/index.ts`

Every new garment asset must validate before product use. Use `npm run validate:garment3d` and keep the runtime contract aligned with [garment-fitting-contract.md](./garment-fitting-contract.md).

## 7. 3D Runtime Rules

`packages/runtime-3d` is the only place that should directly mutate the avatar scene graph.

Current source-of-truth files:

- `packages/runtime-3d/src/avatar-manifest.ts`
- `packages/runtime-3d/src/index.tsx`

Rules:

- keep humanoid alias patterns with the avatar manifest
- preload runtime assets through `preloadRuntimeAssets`
- preserve quality tiers: `low`, `balanced`, `high`
- keep asset budgets explicit
- handle load failure with UI fallbacks, not silent crashes
- keep body masking and render-order rules aligned with garment bindings

## 8. Persistence Rules

Current persistence is local-first but versioned for remote migration.

Keep separate repositories for:

- body profile
- closet scene
- canvas compositions

Compatibility rules:

- old flat body profile payloads must normalize into the current envelope shape
- storage keys must stay versioned
- future API adapters must match the same repository boundary instead of rewriting page logic

## 9. API Usage Rules

Main product UI must talk to product routes only:

- `/v1/profile/*`
- `/v1/closet/*`
- `/v1/canvas/*`
- `/v1/discover/*`

Legacy and lab must remain isolated:

- `/v1/legacy/*` for deprecated import/assets/outfits/widget paths
- `/v1/lab/*` for experimental evaluation and try-on paths

If a surface needs legacy or lab data, the page must present it as secondary or quarantined behavior, never as the primary product loop.

## 10. Design System Rules

Use the wardrobe reference image as the visual truth source.

Required visual characteristics:

- centered full-height mannequin stage
- slim translucent side rails
- floating top control rail
- floating bottom mode bar
- dense catalog controls
- restrained neutral palette
- thin dividers
- glassmorphism without heavy neon color

Implementation source-of-truth:

- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`
- `apps/web/src/components/layout/ProductAppShell.tsx`

## 11. Performance Rules

Every substantial change must consider:

- route-level code splitting
- lazy loading for non-critical surfaces
- runtime asset preloading
- 3D asset and texture budgets
- selector and derived-state cleanup
- avoiding unnecessary rerenders
- mobile fallback quality tiers
- load/error/empty/invalid states

Do not hide performance debt behind visual polish.

## 12. Testing Rules

The minimum product gate is:

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run build:services`
- `npm run build`

Core tests that must stay healthy:

- body profile mapping
- garment runtime validation
- scene serialization
- route smoke coverage
- runtime asset budget
- critical shared UI rendering

## 13. Documentation Sync

If you change:

- product IA
- API namespaces
- runtime mannequin contract
- garment fitting contract
- design tokens or shell layout
- persistence shape

you must update the corresponding document in the same change.
