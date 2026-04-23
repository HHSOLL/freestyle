# Phase 2 Manifest Shadow Slice

## Scope

This note records the first `asset-schema`-backed garment manifest seam on the admin publication contract.

Phase 2 work covered here:

1. keep `PublishedGarmentAsset` as the admin/product publication envelope
2. allow that envelope to carry an optional canonical `viewerManifest` shadow typed as `GarmentManifest`
3. validate and synchronize the shadow on admin/API write paths without rewriting every legacy stored row
4. keep product routing gated by top-level `publication.approvalState`, not by the mere existence of the shadow

## Implemented Seam

The publication contract now allows:

- `PublishedGarmentAsset.viewerManifest?: GarmentManifest`
- `publication.viewerManifestVersion`

The seam is implemented across:

- `packages/shared-types/src/index.ts`
- `packages/contracts/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/admin/src/lib/publishedGarmentDraft.ts`

## Write-Path Rules

Admin/API write paths now normalize the canonical garment manifest shadow for supported garment categories.

Supported autofill categories:

- `tops`
- `bottoms`
- `outerwear`
- `shoes`
- `accessories`

Current autofill defaults:

- `tops -> tight_top`
- `bottoms -> pants`
- `outerwear -> loose_top`
- `shoes -> shoes`
- `accessories -> accessories`

On write:

- the top-level published garment `id` is the source of truth
- the top-level `publication.approvalState` is the source of truth
- `publication.viewerManifestVersion` is synchronized to `viewerManifest.schemaVersion`
- stale nested ids or approval states are rewritten to match the top-level publication envelope
- a missing manifest may be autofilled for supported categories

## Read-Path Rules

Read paths stay tolerant for legacy published rows.

- legacy rows without `viewerManifest` remain readable
- legacy rows are not auto-backfilled on read
- missing `viewerManifest` does not imply failure for existing production data
- the shadow is therefore a forward migration seam, not retroactive certification evidence

This is intentional. The repository still contains legacy published garments that predate the new `asset-schema` contracts.

## Result

Phase 2 now has a canonical garment-manifest shadow on the publication contract.

- admin drafts can start from a synchronized canonical manifest skeleton
- API writes can keep top-level publication metadata and nested manifest metadata aligned
- product closets still only receive `PUBLISHED` garments by top-level routing rules
- unsupported categories such as `hair` and `custom` are not auto-filled yet

## Evidence

Commands:

```bash
npm run test:core
npm --prefix apps/web run typecheck
npm --prefix apps/admin run typecheck
npm run lint
npm run build:services
npm run build
npm run build:admin
```

Focused tests:

- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/admin/src/lib/publishedGarmentDraft.test.ts`
- `packages/contracts/src/domain-contracts.test.ts`

## Remaining Gaps

This note does not claim the full Phase 2 plan is complete.

Open items still tracked elsewhere:

1. `viewerManifest` remains optional, so this is not yet a blocking certification gate
2. `hair` and `custom` do not have auto-generated canonical garment manifests yet
3. no avatar-side manifest shadow exists yet on the publication flow
4. no admin certification tool exists yet to approve visual, fit, and performance evidence bundles
