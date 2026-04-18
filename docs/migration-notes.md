# Migration Notes

## 2026-04-16

- Bumped local closet scene persistence from `freestyle:closet-scene:v2` through `v7`.
- Reason: ship a cleaner try-on baseline for deployed users with a refreshed default avatar state, high-quality desktop default, base inner top layering fallback, a visible default female runtime hair (`Soft Bob`), preserved avatar helper masks, and the newer relaxed default pose after the asset/segmentation reset.
- Impact: previously saved local closet scene selections are reset once so the upgraded baseline is actually visible in production.

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
- dead legacy feature directories under `apps/web/src/features/*`
- duplicate legacy runtime stage implementation formerly embedded in `packages/runtime-3d/src/index.tsx`
- stale Railway service docs and Dockerfiles for dedicated `worker_background_removal`, `worker_asset_processor`, `worker_evaluator`, and `worker_tryon`
- the old multi-service Railway topology is no longer a valid target; only `api + worker_importer` remains the intended main project shape

## 3. Redirected Or Quarantined

Legacy redirects now live in `apps/web/route-map.mjs`.

Current quarantine behavior:

- `/app/fitting -> /app/closet`
- `/studio -> /app/closet`
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
- the public web root layout no longer boots the historical widget canary telemetry path

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
- `v18/` source snapshot retained as a direct UI reference for the Closet shell
- supporting packages such as `packages/contracts`, `packages/db`, `packages/storage`, and worker runtime

They are no longer allowed to define the main product narrative.

## 7. New Product Source-Of-Truth Files

- `apps/web/src/lib/product-routes.ts`
- `apps/web/route-map.mjs`
- `apps/api/src/main.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/domain-avatar/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/skeleton-profiles.ts`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `packages/design-tokens/src/index.ts`

## 8. Honest Blockers

The remaining important blocker is no longer "missing MPFB assets". Those now ship in-repo. The real blockers are quality blockers:

- measurement-to-morph calibration now reaches exported MPFB runtime shape keys, but it still uses heuristic weight mapping and needs tighter fit against the actual MPFB shape-key space
- per-garment body mask coverage is not fully tuned across every starter silhouette, so non-default outfits can still reveal weak spots
- the starter catalog now carries sample size-chart data, but partner-grade garment publishing is still limited and the measured outerwear authoring path is not yet strong enough for a commercial-quality structured-layer claim

This is a real gap. It is documented in `docs/avatar-pipeline.md` and should not be hidden.

Operationally, the remote Railway cleanup has now been executed as well. As of `2026-04-14`, the main `freestyle` Railway project only retains `api` and `worker_importer`. The older dedicated `worker_background_removal`, `worker_asset_processor`, `worker_evaluator`, and `worker_tryon` services were removed from the live project, not just from the repo.

## 9. Next Migration Targets

- tighten MPFB morph calibration and garment coverage tuning
- expand product-detail size-chart coverage across the starter catalog
- continue shrinking or removing obsolete legacy packages once no longer needed
- keep local-first web flows from probing dead relative `/v1/*` paths when no public API base URL is configured
- keep page files thin and move additional logic into domain packages where necessary
- keep every new surface inside the same wardrobe design language
- keep `/` home, `/app/closet`, `/app/canvas`, `/app/community`, and `/app/profile` aligned to the same shell hierarchy
- keep fitting inside `Closet` instead of splitting it back into a standalone page
