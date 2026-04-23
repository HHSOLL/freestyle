# Phase 5 / Batch 1

## Scope

- establish the first read-only avatar publication seam for the committed MPFB base avatars
- keep runtime avatar manifest metadata, admin/API catalog output, and machine-readable certification evidence on one typed boundary
- harden `validate:avatar3d` so avatar publication drift fails closed before later asset-factory work expands the surface

## Implemented

1. added a dedicated read-only avatar catalog contract in `@freestyle/contracts`
2. added `packages/runtime-3d/src/avatar-publication-catalog.ts` as the runtime/admin catalog source of truth for `female-base` and `male-base`
3. exposed admin read-only routes:
   - `GET /v1/admin/avatars`
   - `GET /v1/admin/avatars/:id`
4. added machine-readable publication evidence under `output/avatar-certification/`
5. extended `validate:avatar3d` to fail on:
   - publication catalog drift
   - missing publication evidence files
   - declared avatar `lod1 / lod2` drift
   - variant-set mismatch between runtime catalog and committed publication bundle

## Evidence

- runtime catalog source: `packages/runtime-3d/src/avatar-publication-catalog.ts`
- admin route: `apps/api/src/routes/runtime-avatars.routes.ts`
- validator: `scripts/validate-avatar-3d.mjs`
- machine-readable bundle: `output/avatar-certification/latest.json`
- per-variant reports:
  - `output/avatar-certification/female-base.visual-report.json`
  - `output/avatar-certification/female-base.fit-compatibility-report.json`
  - `output/avatar-certification/female-base.body-signature-model.json`
  - `output/avatar-certification/male-base.visual-report.json`
  - `output/avatar-certification/male-base.fit-compatibility-report.json`
  - `output/avatar-certification/male-base.body-signature-model.json`

## Commands

```bash
npm run build:services
./node_modules/.bin/tsx --test apps/api/src/routes/runtime-avatars.routes.test.ts packages/runtime-3d/src/avatar-publication-catalog.test.ts packages/contracts/src/domain-contracts.test.ts
npm run validate:avatar3d
```

## Boundary Notes

- this batch does **not** claim a full asset-factory `AvatarManifest` delivery tree
- this batch does **not** add avatar write paths, admin editing UI, or new Blender exports
- `/v1/admin/avatars` is a dedicated read-only publication catalog and must not be consumed as a full canonical avatar manifest
