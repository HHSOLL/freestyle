# Maintenance Playbook

## 1. Daily Checklist

1. Confirm `docs/TECH_WATCH.md` was updated today.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run test:core`.
5. Run `npm run build:services`.
6. Run `npm run build`.
7. Run `npm run validate:garment3d` when asset metadata changed.

## 2. Product Smoke Checklist

### Route smoke

- `/`
- `/app`
- `/app/closet`
- `/app/fitting`
- `/app/canvas`
- `/app/community`
- `/app/profile`
- `/app/lab`
- `/auth/callback`
- `/share/[slug]`

### Redirect smoke

- `/studio -> /app/fitting`
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
- `/v1/canvas/looks`
- `/v1/community/looks`
- `/v1/legacy/assets`
- `/v1/lab/tryons`

Also confirm namespace headers:

- product routes return `x-freestyle-surface: product`
- legacy routes return `x-freestyle-surface: legacy` and `deprecation: true`
- lab routes return `x-freestyle-surface: lab`

## 3. Release Checklist

Before a release:

1. Capture fresh screenshots for `Home`, `Closet`, `Fitting`, `Canvas`, `Community`, and `Profile`.
2. Compare `Closet` against `docs/reference/wardrobe-reference.jpg`.
3. Confirm the floating top bar, bottom mode bar, left rail, right catalog rail, and centered mannequin stage still hold.
4. Confirm old routes are still redirected or removed from the main flow.
5. Confirm `lab` failures do not break any main product page.
6. Confirm `migration-notes.md` reflects the latest deleted, retained, and quarantined flows.

## 4. Avatar Runtime Regression Checklist

Verify these after any mannequin or asset change:

- both base variants load
- poses apply without broken limbs
- measurement changes update multiple rig regions, not a single global scale
- body masks hide covered mesh zones correctly
- garments respect render order and clearance
- `low` quality mode still renders on weaker devices
- asset preloading does not exceed declared budgets

If any of the above regress, stop the release.

## 5. Failure Playbooks

### WebGL or GLB load failure

- check runtime console errors first
- verify asset path and manifest entry
- verify `preloadRuntimeAssets` still references the correct files
- confirm the affected route shows a visible fallback instead of a blank stage

### Garment clipping or body poke-through spike

- confirm `bodyMaskZones` match the garment category
- confirm `surfaceClearanceCm` is still sensible
- confirm the skeleton profile is valid
- confirm the rig alias map still matches the active avatar asset

### Route leak from legacy into product

- inspect `apps/web/route-map.mjs`
- inspect `apps/web/src/lib/product-routes.ts`
- verify the main nav still shows only the five product surfaces

### Persistence regression

- verify body profile envelope compatibility
- verify closet scene still hydrates with `qualityTier`, `poseId`, and equipped items
- verify canvas compositions serialize and deserialize cleanly

### API namespace regression

- verify `apps/api/src/main.ts`
- confirm new routes were not mounted directly onto legacy or lab by mistake

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
- shell layout or tokens: `design-system.md`
- deleted or quarantined features: `migration-notes.md`
