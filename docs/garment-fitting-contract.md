# Garment Fitting Contract

## 1. Purpose

This document defines the minimum runtime contract for garments that participate in the mannequin fitting flow.

The source-of-truth implementation lives in:

- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/skeleton-profiles.ts`

## 2. Required Contract

Every runtime garment needs:

- `modelPath`
- `skeletonProfileId`
- `anchorBindings`
- `collisionZones`
- `bodyMaskZones`
- `poseTuning` when the garment needs additional clearance or body masking in specific poses
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
- `metadata.measurementModes` when measurements come from flat-width or mixed size charts
- `metadata.sizeChart` when the garment is shipped with selectable product sizes
- `metadata.selectedSizeLabel` when one chart row is currently active
- `metadata.physicalProfile` for stretch and compression budget hints
- `metadata.correctiveFit` for garment-specific runtime shell response by fit state
- `metadata.fitProfile`

The current runtime binding type is `GarmentRuntimeBinding`.

## 3. Coordinate And Pose Rules

All garment assets are expected to follow:

- `Y-up`
- `meter` units
- `A-pose`
- the shared skeleton profile declared by `skeletonProfileId`

Current default:

- `freestyle-rig-v2`

## 4. Anchor System

Supported anchor IDs:

- `neckBase`
- `headCenter`
- `foreheadCenter`
- `leftTemple`
- `rightTemple`
- `leftShoulder`
- `rightShoulder`
- `chestCenter`
- `waistCenter`
- `hipCenter`
- `leftKnee`
- `rightKnee`
- `leftAnkle`
- `rightAnkle`
- `leftFoot`
- `rightFoot`

Garments do not free-float. They are expected to align to a shared body frame.

## 5. Collision And Mask Zones

Supported zones:

- `torso`
- `arms`
- `hips`
- `legs`
- `feet`

Usage:

- `collisionZones` identify where fitting logic should respect avatar volume
- `bodyMaskZones` identify which base-body mesh regions should be hidden to reduce poke-through
- `poseTuning.extraBodyMaskZones` expands masking for poses such as `stride` or `tailored`, where static masks are usually insufficient

## 6. Fit Semantics

Garment metadata should capture at least:

- chest, waist, hip, shoulder, sleeve, length, inseam, rise, hem, head circumference, or frame width values where relevant
- whether those values are circumference, flat-half width, or linear lengths
- a size-chart row when the source is an ecommerce-style product chart
- `fitProfile.layer`
- `fitProfile.silhouette`
- `fitProfile.structure`
- stretch and drape hints when available

Current runtime helpers:

- `computeGarmentEaseSummary`
- `computeGarmentRuntimeScale`
- `computeGarmentCorrectiveTransform`
- `assessGarmentPhysicalFit`
- `formatGarmentFitSummary`

These let the UI communicate whether a garment reads as `compression`, `snug`, `regular`, `relaxed`, or `oversized` relative to the current body profile and the selected garment size.

The current `Closet` surface now uses this output in two places:

- catalog-card fit preview before equip
- subtle stage cues on equipped garments so the active look does not read as a generic static GLB
- garment-specific corrective transform so width, depth, and clearance react differently for `compression / snug / regular / relaxed / oversized`

## 7. Size-Chart Measurement Modes

Supported measurement interpretations:

- `body-circumference`
- `flat-half-circumference`
- `linear-length`

This matters because many apparel detail pages expose mixed values such as:

- chest flat width
- shoulder width
- sleeve length
- total length

The fitting system must normalize these before comparing them against the body profile.

Accessory examples now follow the same rule:

- hat head opening: `body-circumference`
- eyewear frame width: `linear-length`
- hair base opening or fitted scalp circumference: `body-circumference`

## 8. Physical Fit Assessment

`assessGarmentPhysicalFit` produces:

- selected size label
- per-dimension effective garment size
- body size
- ease in centimeters
- required stretch ratio
- limiting dimensions
- overall fit state
- tension/clipping risk hints

This is the layer that turns “a size table exists” into “the user can see whether this size will compress, stretch, or sit relaxed on the current body”.

## 9. Corrective Fit Contract

`metadata.correctiveFit` is a per-state profile keyed by:

- `compression`
- `snug`
- `regular`
- `relaxed`
- `oversized`

Each entry may provide:

- `widthScale`
- `depthScale`
- `heightScale`
- `clearanceBiasCm`
- `offsetY`

The runtime uses `computeGarmentCorrectiveTransform` to merge:

1. measured fit state from `assessGarmentPhysicalFit`
2. garment-authored corrective values
3. category bias for tops, bottoms, outerwear, shoes, accessories, or hair

This is intentionally lighter than full cloth simulation. The goal is to make size-driven fit visibly read on stage while keeping the browser runtime stable.

## 10. Pose-Aware Runtime Tuning

`runtime.poseTuning` is keyed by avatar pose:

- `neutral`
- `relaxed`
- `contrapposto`
- `stride`
- `tailored`

Each entry may provide:

- `widthScale`
- `depthScale`
- `heightScale`
- `clearanceMultiplier`
- `offsetY`
- `extraBodyMaskZones`

Use this when a garment is generally valid, but certain poses need extra room or more aggressive body hiding to stay believable.

## 11. Anti-Clipping Strategy

Current mitigation stack:

- shared skeleton profile
- shared rig transforms for body and garments
- body masking by zone
- pose-aware body masking by pose
- limiting-dimension-aware body masking and collision expansion
- per-garment `surfaceClearanceCm`
- pose-aware clearance multipliers
- limiting-dimension-aware adaptive clearance multipliers
- runtime adaptive wrapper tuning for hero garments and accessories, driven by pose plus limiting dimensions
- runtime adaptive wrapper tuning for head-worn assets, so hair, hats, and eyewear can react to head circumference or frame-width pressure
- explicit `renderPriority`
- garment-specific corrective transform from measured fit state
- offline Blender fit passes for hero garments before export, using shape-safe widening, hem drop, and shrinkwrap/projection offsets where needed

Current measured hero-garment result in the source `.blend` files:

- `City Relaxed` top: vertices within `<= 1mm` of the body reduced from `448` to `341`
- `Tailored Layer` outerwear: vertices within `<= 1mm` of the body reduced from `803` to `553`

This does not equal full cloth simulation. It is a runtime fitting approximation designed to avoid the worst bind and poke-through failures.

## 12. Validation Rules

`validateGarmentRuntimeBinding` currently enforces:

- `.glb` model path
- valid `skeletonProfileId`
- non-empty anchor bindings
- anchor validity against the chosen skeleton profile
- valid collision zones
- valid body mask zones
- valid pose-aware body mask zones
- positive clearance

`validateStarterGarment` additionally enforces:

- `metadata.measurements`
- `metadata.measurementModes`
- `metadata.sizeChart`
- `metadata.selectedSizeLabel`
- `metadata.physicalProfile`
- `metadata.correctiveFit`
- `metadata.fitProfile.layer`
- unique `sizeChart` labels
- `selectedSizeLabel` membership when a size chart is present

Starter garments are no longer treated as loose demo assets. They are now expected to behave like `publish-ready sample garments` that model the admin-domain publication contract end to end.

## 13. Failure Policy

If a garment contract is invalid:

- do not silently promote it into the main closet
- surface the issue during validation or test time
- keep the product route healthy by falling back to known-good garments

Main product routes should prefer degraded fitting over broken stage rendering.

## 14. Persistence And Sharing

Garment metadata should remain portable across:

- closet scene state
- canvas compositions
- future API-backed persistence

This is why measurement metadata, size-chart rows, and physical fit hints live with the garment object instead of only inside transient UI state.
