# Maintenance Playbook

## 1. Daily Checklist

1. Confirm `docs/TECH_WATCH.md` was updated today.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run typecheck:admin`.
5. Run `npm run test:core`.
6. Run `npm run build:services`.
7. Run `npm run build`.
8. Run `npm run build:admin`.
9. Run `npm run validate:garment3d` when asset metadata changed.
10. Run `npm run validate:avatar3d` when avatar assets or morph mapping changed.
11. Run `npm run validate:fit-calibration` when body mapping, size charts, or fit heuristics changed.
12. Run `npm run optimize:runtime:assets` when promoted runtime GLBs changed.

## 2. Product Smoke Checklist

### Route smoke

- `/`
- `/app`
- `/app/closet`
- `/app/canvas`
- `/app/community`
- `/app/profile`
- `/app/lab`
- `/auth/callback`
- `/share/[slug]`

### Redirect smoke

- `/app/fitting -> /app/closet`
- `/studio -> /app/closet`
- `/trends -> /app/community`
- `/examples -> /app/community`
- `/how-it-works -> /app/community`
- `/profile -> /app/profile`
- `/app/looks -> /app/canvas`
- `/app/decide -> /app/closet`
- `/app/journal -> /app/profile`
- `/app/discover -> /app/community`

### API smoke

- `/healthz`
- `/readyz`
- `/v1/profile/body-profile`
- `/v1/closet/items`
- `/v1/closet/runtime-garments`
- `/v1/canvas/looks`
- `/v1/community/looks`
- `/v1/admin/garments`
- `POST /v1/admin/garments`
- `/v1/legacy/assets`
- `POST /v1/lab/jobs/tryons`

Also confirm namespace headers:

- product routes return `x-freestyle-surface: product`
- legacy routes return `x-freestyle-surface: legacy` and `deprecation: true`
- lab routes return `x-freestyle-surface: lab`
- admin garment routes reject anonymous-header fallback and non-admin callers

## 3. Release Checklist

Before a release:

1. Capture fresh screenshots for `Home`, `Closet`, `Canvas`, `Community`, and `Profile`.
2. Compare `Closet` against `docs/reference/wardrobe-reference.jpg`.
3. Confirm the shared top bar, bottom mode bar, left rail, right catalog rail, and centered stage hierarchy still hold.
4. Confirm old routes are still redirected or removed from the main flow.
5. Confirm `lab` failures do not break any main product page.
6. Confirm `migration-notes.md` reflects the latest deleted, retained, and quarantined flows.

## 4. Avatar Runtime Regression Checklist

Verify these after any mannequin or asset change:

- both base variants load
- poses apply without broken limbs
- measurement changes update multiple rig regions, not a single global scale
- body masks hide covered mesh zones correctly
- shoes with `feet` body-mask coverage still switch the avatar into segmented-body mode
- pose-aware body masks expand correctly in `stride` and `tailored`
- fit-driven adaptive body-mask expansion still widens pressure zones for tight shoulders / hips / inseam cases
- garments respect render order and clearance
- garments respect pose-aware clearance tuning
- long hair pieces (`ponytail`, `braid`, `long fall`) still sway without clipping through the head or shoulders
- loose hero garments (`City Relaxed`, `Tailored Layer`) still show secondary drape without jitter or exploding transforms
- meshopt-compressed runtime GLBs still load in browser builds; a missing `MeshoptDecoder` is now a release blocker
- repeated avatar / garment swaps should not leave clone-owned runtime materials without cleanup; cleanup must target only stage-owned material clones
- secondary motion still settles back to idle under `frameloop="demand"` instead of forcing a permanent render loop
- `low` quality mode still renders on weaker devices
- asset preloading does not exceed declared budgets
- active runtime preload stays scoped to the current avatar, equipped garments, and near-term closet candidates
- optimized runtime GLBs stay within explicit avatar / garment / hair / default-loadout budgets

If any of the above regress, stop the release.

## 5. Failure Playbooks

### WebGL or GLB load failure

- check runtime console errors first
- verify asset path and manifest entry
- verify `preloadRuntimeAssets` still references the correct files
- verify runtime clone cleanup did not dispose shared loader-cache resources
- confirm `AvatarStageViewport` still shows a visible loading, error, or WebGL fallback instead of a blank route shell
- confirm `closet-stage` still shows an in-canvas loading placeholder instead of backdrop-only emptiness while runtime assets suspend

### Garment clipping or body poke-through spike

- confirm `bodyMaskZones` match the garment category
- confirm `surfaceClearanceCm` is still sensible
- confirm the skeleton profile is valid
- confirm the rig alias map still matches the active avatar asset
- confirm runtime `anchorBindings` still resolve to avatar bones; secondary-motion drift is usually an anchor-resolution bug now, not a camera bug
- confirm `secondaryMotion` is not amplifying a fit problem that should be fixed in authoring or corrective metadata first

### Route leak from legacy into product

- inspect `apps/web/route-map.mjs`
- inspect `apps/web/src/lib/product-routes.ts`
- verify the main nav still shows only the four app surfaces

### Persistence regression

- verify body profile envelope compatibility
- verify closet scene still hydrates with `qualityTier`, `poseId`, and equipped items
- verify canvas compositions serialize and deserialize cleanly

### API namespace regression

- verify `apps/api/src/main.ts`
- confirm new routes were not mounted directly onto legacy or lab by mistake

### Admin publish regression

- verify `apps/admin` can create a new garment without editing raw JSON first
- verify accessory measurements (`headCircumferenceCm`, `frameWidthCm`) survive save/load
- verify the archetype fit preview updates when size rows or measurement modes change
- verify guided form edits still round-trip through the raw manifest inspector
- verify `POST` and `PUT` reject schema-valid but semantically invalid garments before they reach persistence

## 6. Operational Rules

- Do not promote legacy or lab surfaces into the product shell without a documented IA decision.
- Do not land new 3D assets without updating credits and pipeline documentation.
- Do not add new large page files when the logic belongs in a domain package or UI component.
- Do not leave stale redirects, stale docs, or stale storage keys untracked.

## 7. Required Document Sync

When these areas change, update the paired docs:

- architecture or route boundaries: `architecture-overview.md`
- avatar asset authoring or rig rules: `avatar-pipeline.md`
- garment contract or fit logic: `garment-fitting-contract.md`
- physical fit model or source-adoption decisions: `physical-fit-system.md`
- shell layout or tokens: `design-system.md`
- deleted or quarantined features: `migration-notes.md`
