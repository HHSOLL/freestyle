# Material Contract

## Purpose

Visual material and physical material are separate contracts.

The visual contract serves rendering quality.
The physical contract serves fit and simulation quality.

## Material Classes

Current production classes are:

- `skin`
- `hair`
- `cotton`
- `denim`
- `leather`
- `rubber`
- `knit`
- `silk`
- `synthetic`
- `metal`
- `plastic`

## Visual Contract

Visual material may include:

- base color
- normal
- ORM
- detail normal
- opacity
- sheen
- clearcoat
- anisotropy

Rules:

- KTX2 is the default runtime texture format for 3D material maps
- WebP or AVIF are for thumbnails and UI imagery, not the primary 3D material path
- color-space handling and tangent-space validity are release gates

## Active Runtime Consumption

Phase 4 closes the current material and lighting scope as a compatibility-runtime contract, not as full viewer-core parity.

Active runtime seams today:

- `packages/runtime-3d/src/material-system.ts`
  - centralizes compatibility-stage material calibration
  - classifies runtime materials into `skin`, `hair`, `eye`, `cotton`, `denim`, `leather`, `rubber`, `knit`, and `synthetic`
- `packages/runtime-3d/src/studio-lighting-rig-policy.ts`
  - defines the canonical studio-lighting spec for `avatar-only` and `dressed` modes
- `packages/runtime-3d/src/studio-lighting-rig.tsx`
  - applies PMREM environment setup, ACES tone mapping, exposure, and shader warmup
- `packages/viewer-core/src/material-system.ts`
  - mirrors the high-level material-class language for the proxy-stage harness

Current evidence route:

- `/app/lab/material-system`

Current limitation:

- authored material manifests are typed and required by the asset-quality contracts, but the shipped compatibility stage still consumes runtime heuristics rather than a full manifest-driven material loader path

## Physical Contract

Physical material must include:

- thickness
- stretch warp
- stretch weft
- bend stiffness
- shear stiffness
- damping
- friction

Optional:

- density

## Reject Criteria

Reject or hold certification when any of these are true:

- color-space handling is wrong
- normal/tangent basis is invalid
- ORM packing is wrong
- mobile fallback collapses material readability
- physical-material data is missing for production garments that enter fit certification
- compatibility-stage material calibration regresses the current material-class differentiation under the Phase 4 studio-lighting harness
