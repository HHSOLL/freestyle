# Garment Fitting Contract

## 1. Purpose

This document defines the minimum runtime contract for garments that participate in the mannequin fitting flow.

The source-of-truth implementation lives in:

- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/skeleton-profiles.ts`

This document is intentionally about the runtime product contract.

- upstream MPFB authoring summaries now have their own versioned parse contract in `packages/contracts`
- garment starter builds now also point at `authoring/garments/mpfb/specs/*.pattern-spec.json` sidecars for authoring-only pattern/material metadata
- those authoring summaries are validated by `scripts/validate-garment-3d.mjs`
- they do not widen `PublishedGarmentAsset`, `RuntimeGarmentAsset`, or `/v1` API payloads

## 1.1 Authoring Pattern Spec

The current `Phase B` seam stays upstream-only even though the metadata layer is now closed as a tracked phase.

Each committed starter garment summary may now declare:

- `patternSpec.relativePath`
- `materialProfile.relativePath`
- `simProxy.relativePath`
- `collisionProxy.relativePath`
- `hqArtifact.relativePath`

That sidecar is parsed through `garmentPatternSpecSchema` in `packages/contracts` and currently captures:

- `measurements`
- `measurementModes`
- `sizeChart`
- `selectedSizeLabel`
- `physicalProfile`
- `materialPreset`
- `anchorIds`
- optional `panels`
- optional `seams`

The new `Phase 2` authoring-contract v2 sidecars are also parsed through `packages/contracts`:

- `garmentMaterialProfileSchema`
- `garmentSimProxySchema`
- `garmentCollisionProxySchema`
- `garmentHQArtifactSpecSchema`

Their current role is still upstream-only:

- they are committed under `authoring/garments/mpfb/specs/*.material-profile.json`, `*.sim-proxy.json`, `*.collision-proxy.json`, and `*.hq-artifact.json`
- they do not widen `PublishedGarmentAsset`, `RuntimeGarmentAsset`, or `/v1` product/admin payloads
- they are regenerated through `npm run authoring:garments:mpfb:sidecars`

The active validator rule is:

- `validate:garment3d` must be able to load the sidecar
- the sidecar must parse through the shared schema
- the sidecar's starter-facing semantic parity must be enforced through `validateGarmentPatternSpecAgainstStarterCatalog` in `packages/domain-garment`
- the full authoring bundle parity (`patternSpec + materialProfile + simProxy + collisionProxy + hqArtifact`) must be enforced through `validateGarmentAuthoringBundleAgainstStarterCatalog` in `packages/domain-garment`

The current semantic parity scope is:

- `category`
- `measurements`
- `measurementModes`
- `sizeChart`
- `selectedSizeLabel`
- `physicalProfile`
- `anchorIds`

This keeps the new pattern/material metadata layer explicit without reopening the runtime product contract.

## 2. Required Contract

Every runtime garment needs:

- `modelPath`
- `skeletonProfileId`
- `anchorBindings`
- `collisionZones`
- `bodyMaskZones`
- `poseTuning` when the garment needs additional clearance or body masking in specific poses
- `secondaryMotion` when long hair or loose garments need a lightweight spring response in runtime
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
- `metadata.measurementModes`
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
At runtime, `anchorBindings` should resolve against avatar alias bones or weighted anchor targets. Sampling motion from the already animated garment subtree creates self-feedback and is not considered valid anymore.

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
- runtime effective masking should be treated as `bodyMaskZones + poseTuning.extraBodyMaskZones + fit-driven adaptive mask expansion`
- `feet` is a first-class body mask zone; shoe-only coverage must still switch the avatar to segmented-body rendering

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
- layer-aware equip resolution so bulky tops do not stay under structured outerwear and break the silhouette

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

The active runtime contract for this payload is now:

- `garmentFitStateSchema`
- `garmentFitRiskSchema`
- `garmentFitDimensionAssessmentSchema`
- `garmentFitAssessmentSchema`

This is the layer that turns “a size table exists” into “the user can see whether this size will compress, stretch, or sit relaxed on the current body”.

## 8.1 Instant Fit Report

`Phase C / Batch 1` adds a product-facing derived contract above the raw physical-fit assessment:

- `garmentInstantFitReportSchema`
- `garmentFitOverallSchema`
- `garmentInstantFitRegionSchema`

This layer is still derived-only.

- it is built from `GarmentFitAssessment`
- it does not widen current `/v1` payloads yet
- it exists so product surfaces and future APIs can share one recommendation format instead of inventing separate summary strings
- the first live product consumer is now `apps/web/src/components/product/V18ClosetExperience.tsx`, via the local display helper in `apps/web/src/components/product/closet-fit-report.ts`

The current instant-fit report contains:

- `overallFit`
- `overallState`
- `confidence`
- `primaryRegionId`
- `summary`
- `explanations`
- `regions`

The current `overallFit` buckets are:

- `good`
- `tight`
- `loose`
- `risky`

`Phase C / Batch 3` closes the product adapter seam:

- `/v1/closet/runtime-garments` now returns a product-only `closetRuntimeGarmentListResponseSchema`
- each entry is `{ item, instantFit }`
- `item` stays the canonical `PublishedGarmentAsset`
- `instantFit` is derived from the current persisted `BodyProfile` when one exists, otherwise `null`
- `/v1/admin/garments*` stays on the publication-focused response contract and does not inherit the user-scoped fit payload

The current product-consumer rule is:

- API-provided `instantFit` is a seeded recommendation for the published closet catalog
- active `Closet` review still prefers locally derived reports from the current deferred body profile so in-session edits remain authoritative

The current region layer normalizes measurement keys into product-facing regions such as:

- `chest`
- `waist`
- `hip`
- `shoulder`
- `sleeve`
- `length`
- `inseam`
- `rise`
- `hem`
- `head`
- `frame`

Current product use:

- `Closet` catalog cards now surface `overallFit`, confidence, and the top focus regions from the shared report
- equipped-garment cards in `Closet` now use the same report for summary/explanation text instead of a separate surface-local summary formatter
- API and persistence payloads remain unchanged in this batch

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

## 10. Layering Rules

The current product runtime treats `tops` and `outerwear` as a compatibility pair, not just two independent GLBs.

Rules:

- `tops` with `fitProfile.layer = base` are valid under outerwear
- bulky `mid` silhouettes are not kept under structured outerwear by default
- equipping outerwear over an incompatible top falls back to the base tee layer
- equipping a bulky top while outerwear is already active clears the outerwear instead of stacking a broken combination

This is a product safeguard, not a final simulation answer. It exists to stop obviously invalid layered looks from reaching the stage.

## 11. Pose-Aware Runtime Tuning

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

## 12. Secondary Motion Contract

`runtime.secondaryMotion` is intentionally narrow. It exists for:

- long hair
- braids
- loose tops
- loose outerwear

It is not a substitute for:

- correct size charts
- measured fit assessment
- corrective authoring
- body masking
- pose-aware clearance tuning

Current binding fields:

- `profileId`
- `stiffness`
- `damping`
- `influence`
- `maxYawDeg`
- `maxPitchDeg`
- `maxRollDeg`
- `idleAmplitudeDeg`
- `idleFrequencyHz`
- `verticalBobCm`
- `lateralSwingCm`

Current runtime behavior:

- long hair and braids use higher yaw/pitch swing and more lateral travel
- bob/crop styles use tighter, smaller motion envelopes
- loose garments use smaller, slower drape response than hair
- fit state still modulates amplitude, so `relaxed / oversized` pieces move more than `compression / snug`
- avatar scene scale also modulates stiffness and swing range, so the same hair/garment profile behaves consistently across shorter and taller customized bodies
- the stage stays on `frameloop="demand"` and only invalidates while spring energy remains above the settle threshold

## 12. Anti-Clipping Strategy

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
- selective `secondaryMotion` on long hair and loose garments so the product can show believable sway without shipping full browser cloth simulation
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
- published garments must also pass semantic runtime validation before admin publish succeeds
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
