# Migration Notes

## 1. Goal Of This Migration

The repo was realigned from an older shopping-link import and AI experiment shape into a mannequin-first product:

- body profile input
- rigged human fitting
- live dressing and pose changes
- styling canvas
- shared design language across the app

## 2. Deleted Or Removed From Main Flow

Routes deleted or removed from the main IA:

- `/app/closet/import`
- `/app/decide/*`
- `/app/journal/*`
- `/app/looks/*`
- `/examples`
- `/how-it-works`
- `/profile`
- `/studio`
- `/trends`

Duplicate or dead trees removed:

- root `src/`
- root `public/`
- `v18/` snapshot
- dead legacy feature directories under `apps/web/src/features/*`

## 3. Redirected Or Quarantined

Legacy redirects now live in `apps/web/route-map.mjs`.

Current quarantine behavior:

- `/studio -> /app/fitting`
- `/trends -> /app/community`
- `/examples -> /app/community`
- `/how-it-works -> /app/community`
- `/profile -> /app/profile`
- `/app/looks* -> /app/canvas`
- `/app/decide* -> /app/closet`
- `/app/journal* -> /app/profile`
- `/app/discover* -> /app/community`

## 4. API Realignment

The API is now intentionally split:

- `Product`: `/v1/*`
- `Legacy`: `/v1/legacy/*`
- `Lab`: `/v1/lab/*`

Result:

- import/assets/outfits/widget remain available only as deprecated or supporting flows
- AI evaluation and try-on moved behind lab isolation
- main product routes expose body profile, closet, canvas, and community

## 5. State Migration

Body profile moved from flat storage toward the canonical envelope:

- old shape: flat measurement object
- new shape: `BodyProfile` with `simple` and optional `detailed`

Compatibility remains in place through normalization helpers so older local data does not break hydration.

## 6. What Was Kept, But Reduced

These areas were not deleted outright because they still provide supporting value:

- auth callback flow
- import and asset infrastructure under legacy
- evaluation and try-on experiments under lab
- supporting packages such as `packages/contracts`, `packages/db`, `packages/storage`, and worker runtime

They are no longer allowed to define the main product narrative.

## 7. New Product Source-Of-Truth Files

- `apps/web/src/lib/product-routes.ts`
- `apps/web/route-map.mjs`
- `apps/api/src/main.ts`
- `packages/domain-avatar/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/skeleton-profiles.ts`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `packages/design-tokens/src/index.ts`

## 8. Honest Blockers

The remaining important blocker is the avatar authoring pipeline:

- the runtime contract is ready for MPFB2 or MakeHuman authored assets
- the repo currently ships fallback human GLBs instead of a true MPFB2-authored morph-target mannequin

This is a real gap. It is documented in `docs/avatar-pipeline.md` and should not be hidden.

## 9. Next Migration Targets

- replace fallback avatar assets with a promoted MPFB2-authored base
- continue shrinking or removing obsolete legacy packages once no longer needed
- keep page files thin and move additional logic into domain packages where necessary
- keep every new surface inside the same wardrobe design language
- keep `/` home, `/app/closet`, `/app/canvas`, `/app/community`, and `/app/profile` aligned to the same shell hierarchy
