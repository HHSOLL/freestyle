# Phase 2.5 Closeout

## Scope

This note closes the contract-hardening layer between the Phase 2 schema foundation and the later asset-factory phases.

Phase 2.5 goals covered here:

1. asset approval states, fit-policy regions, golden matrices, and hard-fail thresholds are not prose only; they now exist as typed contract exports
2. promoted admin publication states now require minimum certification metadata on write
3. supported garment categories cannot move into fit/certified/published states without the canonical manifest seam
4. later phases can build on these contracts instead of inventing new ad-hoc gate vocabularies

## Implemented Contract Layer

### Typed approval-state helpers

`packages/asset-schema/src/approval-state.ts` now exports:

- review-state groups
- certification-required approval groups
- canonical-manifest-required approval groups
- helper predicates for these groups

### Typed fit-quality presets

`packages/asset-schema/src/quality.ts` now exports:

- `fitQualityHardFailThresholds`
- `defaultGoldenMatrix`
- `garmentFitPolicyProfiles`

Those presets now hold the minimum hard-fail numbers and the category-to-region mapping used by the current contract layer.

### Write-path certification enforcement

`apps/api/src/modules/garments/runtime-garments.service.ts` now applies a stricter publication-state validator on write:

- `CERTIFIED`, `PUBLISHED`, and `DEPRECATED` require `approvedAt`, `approvedBy`, and at least one `certificationNote`
- supported garment categories require the canonical `viewerManifest` seam and `publication.viewerManifestVersion` once approval reaches `FIT_CANDIDATE` or above
- legacy read paths remain tolerant, so old production rows still load while the certification flow is being completed

## Evidence

Commands:

```bash
npm run test:core
npm --prefix apps/web run typecheck
npm --prefix apps/admin run typecheck
npm run validate:avatar3d
npm run lint
npm run build:services
npm run build
npm run build:admin
```

Focused tests:

- `packages/asset-schema/src/index.test.ts`
- `packages/domain-garment/src/validation.test.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`

## Closeout Result

Phase 2.5 can now be treated as closed for the current refactor track.

- the quality-contract docs now have matching typed exports
- promoted garment approval states are no longer write-time suggestions only
- certification metadata and canonical manifest expectations are enforced before persistence on the active admin/API path

## Risks Carried Into Phase 3 And Beyond

The following items are intentionally not claimed as solved by this note:

1. this is still contract enforcement, not a full certification UI/workflow
2. avatar publication does not yet have a matching promoted-state enforcement seam
3. asset budgets, KTX2/LOD pipeline, and loader policy hardening belong to Phase 3
4. fit review tooling and HQ artifact certification remain later-phase work
