# Admin Asset Publishing

## 1. Purpose

This document fixes the product boundary for garment creation.

FreeStyle should not author product garments inside the public `Closet` surface.

The intended flow is:

1. an internal or partner-facing admin domain creates and validates the 3D garment
2. the garment is published as a runtime-ready package with exact size data
3. `Closet` consumes the published package and computes fit against the active body profile

## 2. Separation Of Concerns

### Admin / publishing domain

Responsibilities:

- garment authoring and revision control
- exact measurement entry from product-detail size charts
- unit checks and measurement-mode labeling
- GLB generation and optimization
- runtime contract validation
- publication/versioning

### Public Closet domain

Responsibilities:

- load published garments
- equip and remove garments in real time
- compare body measurements with garment measurements
- surface fit states such as `compression`, `snug`, `regular`, `relaxed`, and `oversized`

`Closet` must not become the place where garment geometry is hand-authored.

## 3. Published Garment Contract

The public product now expects a `published runtime garment` shape:

- base asset fields
- `runtime`
- `palette`
- `publication`
- `metadata.measurements`
- optional `metadata.measurementModes`
- optional `metadata.sizeChart`
- optional `metadata.selectedSizeLabel`
- optional `metadata.physicalProfile`

Current source types:

- `RuntimeGarmentAsset`
- `PublishedGarmentAsset`

Source files:

- [packages/shared-types/src/index.ts](/Users/sol/Desktop/fsp/packages/shared-types/src/index.ts)
- [packages/domain-garment/src/index.ts](/Users/sol/Desktop/fsp/packages/domain-garment/src/index.ts)

## 4. Publication Rules

Every published garment must include:

1. a GLB path compatible with the shared skeleton profile
2. body mask and collision zone declarations
3. exact garment measurements
4. measurement interpretation
5. publication metadata

Recommended publication metadata:

- `sourceSystem`
- `publishedAt`
- `assetVersion`
- `measurementStandard`
- optional `provenanceUrl`

## 5. Size Entry Rules

The admin domain must not flatten all size data into one ambiguous number set.

It must record whether each measurement is:

- `body-circumference`
- `flat-half-circumference`
- `linear-length`

Example:

- shoulder width: `linear-length`
- chest flat width from ecommerce table: `flat-half-circumference`
- sleeve length: `linear-length`
- waist circumference from authored garment: `body-circumference`
- hat opening circumference: `body-circumference`
- eyewear frame width: `linear-length`
- hair base circumference or scalp-shell fit width: `body-circumference`

Without this, `Closet` cannot compute fit honestly.

## 6. Runtime Consumption

`useWardrobeAssets()` now exposes:

- `starterAssets`
- `publishedAssets`
- `closetRuntimeAssets`

`useClosetScene(catalog)` can now resolve equipped garments against a passed-in runtime catalog instead of the old starter-only map.
The product-side published garment hydration path now expects the canonical camelCase `PublishedGarmentAsset` payload directly from `GET /v1/closet/runtime-garments`; it no longer relies on legacy snake_case asset remapping for published garments.

This is the first step toward a real admin-domain publication pipeline.

## 7. Current State

As of `2026-04-14`:

- the codebase supports published runtime garments as a distinct concept
- `Closet` can consume a merged runtime catalog
- local repository support exists for published garments
- local-first API boundaries exist at `/v1/admin/garments` and `/v1/closet/runtime-garments`
- the dedicated admin UI/domain now lives in `apps/admin`
- the admin surface now supports guided create/update editing for garment identity, size-chart rows, publication metadata, runtime binding, and raw manifest inspection
- head-facing measurements such as `headCircumferenceCm` and `frameWidthCm` are now valid in the shared contract and admin workflow, covering accessories and runtime hair assets
- the admin surface now includes an archetype fit preview so operators can see `compression / snug / regular / relaxed / oversized` states across representative bodies before publish
- admin publish now runs the same semantic runtime-garment validator used by the product catalog, so schema-valid but semantically broken garments are rejected before persistence
- a brand-new guided admin draft now starts from the canonical runtime skeleton profile and normalizes the legacy invalid fallback id before publish validation
- the dedicated Vercel project is `freestyleadmin` with production alias `https://freestyleadmin.vercel.app`
- admin browser requests now require both `BACKEND_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` because the admin surface is on a separate origin from Railway

That means the public product and the admin publishing surface are now physically split inside the monorepo.

## 8. Next Steps

1. replace the current local JSON publication repository with the real admin-domain backing store
2. make the admin domain emit package manifests directly from the authoring pipeline
3. require fit validation before publication and store the calibration report with the asset revision
4. add publish history, revision diffing, and asset preview on top of the current guided editor
