# Phase 2 Closeout

## Scope

This note closes the schema and protocol foundation for the viewer-platform refactor.

Phase 2 goals covered here:

1. `asset-schema` is the canonical source of truth for avatar, garment, material, fit-artifact, approval-state, and body-signature contracts
2. `viewer-protocol` is the canonical source of truth for viewer commands, events, telemetry, viewer manifests, and preview/HQ protocol envelopes
3. admin publication and forced-host telemetry both use those canonical contracts on active write/evidence paths
4. validators and low-level transport seams no longer carry avoidable duplicate version or transport literals

## Implemented Slices

### Adapter telemetry seam

Evidence note:

- `docs/freestyle-viewer-platform/phase2/telemetry-slice.md`

Covered:

- first-avatar-paint telemetry seam
- garment-swap preview-latency telemetry seam
- typed browser host attrs and custom events through `viewer-react`

### Admin publication manifest shadow

Evidence note:

- `docs/freestyle-viewer-platform/phase2/manifest-shadow.md`

Covered:

- optional canonical `viewerManifest` shadow on `PublishedGarmentAsset`
- write-path synchronization for supported garment categories
- legacy read-path tolerance for older published rows

### Canonical schema/protocol hot path

Covered:

- `packages/asset-schema/src/schema-versions.ts` now owns canonical manifest and body-signature version literals
- `packages/runtime-3d/src/avatar-manifest.ts` and `scripts/validate-avatar-3d.mjs` now reuse the canonical avatar manifest version instead of keeping an isolated runtime-only literal
- `packages/viewer-protocol/src/fit.ts` now reuses the `fit-kernel` transport tuple so preview worker transport names do not drift from the kernel seam
- `packages/fit-kernel/src/index.test.ts` is now part of `npm run test:core`

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

Focused files:

- `packages/asset-schema/src/**`
- `packages/viewer-protocol/src/**`
- `packages/fit-kernel/src/**`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `scripts/validate-avatar-3d.mjs`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/admin/src/lib/publishedGarmentDraft.ts`

## Closeout Result

Phase 2 can now be treated as closed for the current refactor track.

- the schema layer is not only scaffolded; it now supplies canonical version literals and validation shapes used by active paths
- protocol transport names are aligned with the fit-kernel seam
- admin publication and forced-host telemetry both have concrete evidence notes
- Phase 2 no longer depends on runtime-only duplicate manifest constants to stay consistent

## Risks Carried Into Phase 2.5 And Beyond

The following items are intentionally not claimed as solved by this closeout:

1. certification remains partial; `viewerManifest` is still optional and candidate approval flows are not yet a full admin certification tool
2. avatar publication does not yet have a product/admin manifest-shadow seam equivalent to garments
3. asset budget enforcement, KTX2/LOD policy, and decoder preload hardening belong to Phase 3
4. fit preview/HQ quality gates remain later-phase work even though the protocol and schema envelopes now exist
