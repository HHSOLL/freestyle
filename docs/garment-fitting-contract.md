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
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
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

## 6. Fit Semantics

Garment metadata should capture at least:

- chest, waist, hip, shoulder, sleeve, length, inseam, rise, or hem values where relevant
- `fitProfile.layer`
- `fitProfile.silhouette`
- `fitProfile.structure`
- stretch and drape hints when available

Current runtime helpers:

- `computeGarmentEaseSummary`
- `computeGarmentRuntimeScale`

These let the UI communicate whether a garment reads as tight, regular, relaxed, or oversized relative to the current body profile.

## 7. Anti-Clipping Strategy

Current mitigation stack:

- shared skeleton profile
- shared rig transforms for body and garments
- body masking by zone
- per-garment `surfaceClearanceCm`
- explicit `renderPriority`

This does not equal full cloth simulation. It is a runtime fitting approximation designed to avoid the worst bind and poke-through failures.

## 8. Validation Rules

`validateGarmentRuntimeBinding` currently enforces:

- `.glb` model path
- valid `skeletonProfileId`
- non-empty anchor bindings
- anchor validity against the chosen skeleton profile
- valid collision zones
- valid body mask zones
- positive clearance

`validateStarterGarment` additionally enforces:

- `metadata.measurements`
- `metadata.fitProfile.layer`

## 9. Failure Policy

If a garment contract is invalid:

- do not silently promote it into the main closet
- surface the issue during validation or test time
- keep the product route healthy by falling back to known-good garments

Main product routes should prefer degraded fitting over broken stage rendering.

## 10. Persistence And Sharing

Garment metadata should remain portable across:

- closet scene state
- canvas compositions
- future API-backed persistence

This is why measurement metadata and fit hints live with the garment object instead of only inside transient UI state.
