# Phase 6 / Batch 1

## Scope

- start the garment asset-factory phase with a machine-readable certification evidence seam
- keep the scope authoring-validation and evidence-only; do not widen product or admin publish routes yet
- make `validate:garment3d` fail closed on committed garment-authoring bundle drift while emitting one canonical certification bundle

## Implemented

1. added `garment-certification-report.v1` to `@freestyle/contracts`
2. added a shared starter-garment certification seed helper to `packages/domain-garment`
3. taught `scripts/validate-garment-3d.mjs` to aggregate committed garment authoring summaries by `runtimeStarterId`
4. made `validate:garment3d` emit `output/garment-certification/latest.json` on success and remove that bundle on failure
5. added contract and domain tests for the new evidence seam
6. narrowed certification runtime variant coverage so the bundle only includes `modelPathByVariant` / `lodModelPathsByVariant` entries backed by committed authoring summaries

## Evidence

- contract source: `packages/contracts/src/index.ts`
- contract coverage: `packages/contracts/src/domain-contracts.test.ts`
- garment-domain helper: `packages/domain-garment/src/index.ts`
- garment-domain coverage: `packages/domain-garment/src/validation.test.ts`
- validator: `scripts/validate-garment-3d.mjs`
- machine-readable bundle: `output/garment-certification/latest.json`

## Commands

```bash
npm run validate:garment3d
./node_modules/.bin/tsx --test packages/domain-garment/src/validation.test.ts packages/contracts/src/domain-contracts.test.ts
npm run test:core
npm run build:services
```

## Boundary Notes

- this batch covers only starter garments that already have committed garment-authoring bundles under `authoring/garments/exports/raw/*.summary.json`
- runtime variant coverage inside the certification bundle is intentionally limited to the committed authoring-summary variants for each starter piece
- it does **not** add admin garment certification routes, publish history, or authoring write flows
- it does **not** claim that shoes, accessories, hair, or the broader garment catalog already have equivalent authoring bundles
- `output/garment-certification/latest.json` is the canonical Phase 6 evidence seam for the currently committed garment-authoring-backed starter pieces, not proof that the full garment factory is complete
