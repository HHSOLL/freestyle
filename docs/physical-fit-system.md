# Physical Fit System

## 1. Purpose

This document is the source of truth for the long-term goal of FreeStyle:

1. a human-looking customizable avatar
2. garment assets authored from real size information
3. fit behavior that changes when the body changes
4. a runtime that communicates `tight / stretched / regular / relaxed / oversized` states honestly

This is not a promise of full real-time cloth simulation on every garment. The product path is:

`measurement-driven fit assessment first -> corrective fit authoring second -> selective cloth simulation last`

Current runtime interpretation:

- measured fit remains the first truth source
- lightweight secondary motion is allowed for long hair and loose garments
- full cloth simulation remains an offline authoring/reference tool, not the default browser runtime

## 2. Product Decision

The core product is a `curated 3D fitting system`, not an unrestricted image try-on lab.

That means:

- avatar and garments must share a controlled body space
- garments need explicit size-chart data
- runtime fit decisions must be based on body-vs-garment dimensions
- physics is only meaningful after measurement contracts and collision zones exist

## 3. Adopted Foundation

### Avatar authoring

- `MPFB2 / MakeHuman` for the canonical human base
- `CharMorph` only as a fallback authoring route
- `Blender` for cleanup, segmentation, GLB export, and material normalization

Why:

- the official MakeHuman / MPFB license page states that core assets are `CC0`, while addon/source code remains GPL/AGPL licensed
- the official system asset pack page lists the shipped clothes, hair, skins, and proxy meshes with `CC0` entries
- the official MPFB clothes docs are built around authoring garments against the same human basemesh and asset library

Sources:

- [MakeHuman / MPFB license](https://static.makehumancommunity.org/about/license.html)
- [MakeHuman system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
- [MPFB creating clothes](https://static.makehumancommunity.org/mpfb/docs/assets/creating_clothes.html)
- [MPFB clothes, hair and body parts concepts](https://static.makehumancommunity.org/mpfb/docs/assets/concept_clothes_hair_bodyparts.html)
- [MakeClothes introduction](https://static.makehumancommunity.org/assets/creatingassets/makeclothes/introduction.html)

### Runtime geometry support

- the runtime keeps using `GLB + rig + morph targets`
- coarse collision and future physically reactive layers may use `Rapier`

Why:

- Rapier is permissively licensed under Apache-2.0 and is suitable for coarse collision volumes and scene constraints
- it is not a replacement for garment authoring or garment-specific corrective shapes

Source:

- [Rapier repository](https://github.com/dimforge/rapier)

## 4. Official Blender Guidance We Should Actually Follow

The Blender manual already provides the right authoring vocabulary for this product:

- `Shrinkwrap` for first-pass garment conforming to the target body
- `Data Transfer` for transferring normals and other mesh-linked data across matching surfaces
- `Corrective Smooth` for reducing deformation artifacts after rigging and fitting
- `Cloth` for selected offline bake or reference passes, not for every live garment in the browser

Sources:

- [Shrinkwrap Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/shrinkwrap.html)
- [Data Transfer Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/modify/data_transfer.html)
- [Corrective Smooth Modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/corrective_smooth.html)
- [Cloth Physics](https://docs.blender.org/manual/en/latest/physics/cloth/introduction.html)

## 5. Research And OSS Evaluation

### Use now

1. `MPFB2 / MakeClothes / MakeHuman system assets`
- Status: adopted
- Reason: official ecosystem, redistributable core assets, already active in repo
- License: assets CC0, source code GPL/AGPL split

2. `Rapier`
- Status: approved candidate for future coarse body-garment collision volumes
- Reason: permissive Apache-2.0 license and good runtime fit for rigid/capsule collision layers
- License: Apache-2.0

### Research only, not to ship directly

1. `TailorNet`
- Status: research reference only
- Reason: technically relevant for 3D garment prediction from body shape, pose, and style, but the repository license is explicitly non-commercial
- License risk: cannot be incorporated into the commercial product pipeline as-is
- Sources:
  - [TailorNet paper](https://arxiv.org/abs/2003.04583)
  - [TailorNet repository](https://github.com/chaitanya100100/TailorNet)

2. `GarmentMeasurements / GarmentCode`
- Status: research reference only for measurement extraction ideas and made-to-measure garment generation
- Reason: useful for offline pipeline thinking, but the repository is GPL-3.0 and the toolchain is offline/native rather than browser-runtime friendly
- License risk: do not copy code into the shipping monorepo
- Sources:
  - [GarmentMeasurements repository](https://github.com/mbotsch/GarmentMeasurements)
  - [GarmentCode repository](https://github.com/maria-korosteleva/GarmentCode)

3. `ClothFit`
- Status: research reference only
- Reason: relevant because it explicitly studies body proportions and garment sizes, but it is a 2D image VTO paper, not the runtime 3D fitting system we are building
- Source:
  - [ClothFit paper](https://arxiv.org/abs/2306.13908)

## 6. What This Means For Our Architecture

The product needs three separate layers.

### Layer A. Body space

- `BodyProfile`
- `AvatarNormalizedParams`
- `AvatarMorphPlan`

This layer answers:

- what is the body size?
- how does it deform the avatar?

### Layer B. Garment size space

- `metadata.measurements`
- `metadata.measurementModes`
- `metadata.sizeChart`
- `metadata.selectedSizeLabel`
- `metadata.physicalProfile`

This layer answers:

- what does the garment measure in the real world?
- are the dimensions linear, circumference, or flat-width values?
- how much stretch is materially plausible?

### Layer C. Runtime fit result

- `GarmentFitAssessment`
- per-dimension ease
- stretch load
- clipping risk
- overall fit state

This layer answers:

- does the garment fit the current body?
- which dimension is the limiting one?
- is the garment merely snug, or is it visibly under tension?

## 7. Authoring Boundary

Garment generation belongs in a separate admin or publishing domain.

That upstream domain is responsible for:

- building or importing the garment mesh
- attaching exact product measurements
- declaring measurement interpretation
- publishing the runtime package

`Closet` should only consume the published package and perform fitting.

Companion document:

- [admin-asset-publishing.md](./admin-asset-publishing.md)

## 8. Current Implementation Status

As of `2026-04-17`:

- the repo ships MPFB-authored avatar GLBs with runtime shape keys
- the repo ships MPFB starter garments
- the repo now ships MPFB starter accessories for both base variants:
  - `city bucket hat`
  - `oval shades`
- the repo now ships MPFB starter hair assets for both base variants:
  - `signature ponytail`
  - `soft bob`
  - `long fall`
  - `textured crop`
  - `studio braid`
  - `volume bob`
  - `clean sweep`
  - `afro cloud`
- the domain contract now supports:
  - `measurementModes`
  - `sizeChart`
  - `selectedSizeLabel`
  - `physicalProfile`
  - `GarmentFitAssessment`
- the contracts package now ships runtime parse schemas for:
  - `GarmentFitState`
  - `GarmentFitDimensionAssessment`
  - `GarmentFitAssessment`
- `validate:fit-calibration` now snapshots the committed MPFB avatar `measurements.json` sidecars next to the starter garment fit matrix, so calibration evidence includes the authored base-avatar reference measurements and derivation metadata without widening runtime consumers
- the full starter catalog now carries publication-grade sample size charts, measurement interpretation, and physical profiles
- `Closet` can surface fit summaries and pre-equip fit previews derived from the current body profile and garment metadata
- `Closet` now surfaces the limiting body dimensions per garment so users can see whether the pressure comes from chest, waist, hip, shoulder, inseam, or hem space
- `Closet` now also surfaces head-aware fit for accessories, so hats and eyewear can report pressure against `headCircumferenceCm` or `frameWidthCm`
- `Closet` now also surfaces head-aware fit for selectable hair assets, so hairstyle shells can react to `headCircumferenceCm` rather than being treated as static cosmetics
- `Closet` now also uses a lightweight spring layer for long hair and loose garments, so the product can show sway/drape without shipping full cloth simulation in the browser
- the spring layer now samples weighted avatar anchor bindings and keeps the stage on `frameloop="demand"` with settle-aware invalidation instead of reverting the whole canvas to a permanent render loop
- the avatar export now preserves MPFB helper-hiding mask modifiers, because stripping them caused the nude/fullbody runtime mesh to collapse into a skirt-like silhouette
- the avatar segmentation pass now pulls clavicle and neck-base influence into the torso zone, so shoulder coverage for fitted tops can be hidden by the authored `bodyMaskZones` instead of over-hiding the whole arm zone
- the stage runtime now applies subtle fit cues to equipped garments so `tight / regular / relaxed` states are visible beyond text alone
- the runtime now also supports `metadata.correctiveFit`, so each garment can react with its own width/depth/height/clearance adjustments instead of relying on one generic fit-scale hint
- the runtime now supports `poseTuning` in the garment binding, so `stride` and `tailored` can expand body masking and clearance without affecting the neutral pose
- the runtime now supports `secondaryMotion` in the garment binding, so long hair and loose hero garments can move as product assets instead of reading as rigid shells
- the runtime now expands collision and body-mask pressure zones from the garment's limiting dimensions, so chest, shoulder, hip, inseam, and hem bottlenecks influence protection zones instead of only category defaults
- the runtime now keeps `bodyMaskZones` and adaptive collision escalation separate, so fit pressure can expand collision protection without accidentally zeroing unrelated body regions
- the runtime now merges authored masks, pose masks, and fit-driven adaptive mask zones before applying avatar visibility, so tight shoulders, hips, inseams, and shoe pressure can hide the correct body regions
- `feet`-only masks now force segmented-body visibility, so shoe assets can actually hide feet instead of leaving poke-through on the fullbody mesh
- the runtime now adds an adaptive wrapper-adjustment pass for hero garments and accessories, so pose plus limiting dimensions can nudge width/depth/height even after the authored corrective profile is applied
- the runtime now hides baked base-hair meshes when a runtime hair asset is equipped, allowing multiple hairstyles to be swapped without rebuilding the avatar base GLB
- the MPFB mapping layer now derives lean / body-mass / soft-frame / curve / tall / long-leg / proportion signals from the normalized body profile, and uses those to drive the exported female and male shape keys more selectively
- the current female baked base now uses a shorter `short04` haircut and the default equipped runtime hair is `Soft Bob`, which keeps the face open more reliably for fitting review
- the current Blender hair pass now applies style-specific opening and offset adjustments for bob, long, braid, and sweep silhouettes before export instead of treating every hairstyle as a static scalp shell
- the current hair authoring path can now take an explicit `MPFB_DATA_DIR`, so the pipeline no longer depends on one hardcoded local user path
- shipped runtime GLBs now pass through a browser-delivery optimization step (`meshopt` geometry compression plus texture recompression), and `Closet` now preloads only the active avatar and near-term garment set instead of whole-catalog eager preload
- the repo now has a representative fit-calibration harness, so starter garments are checked across multiple body archetypes instead of only one default profile
- garment authoring summaries now emit `fitAudit` data from Blender itself:
  - minimum body distance
  - close-contact penetrating vertex count (`<= 3mm` negative-normal hits)
  - `<= 1mm / 3mm / 5mm / 10mm` contact buckets
  - top hot-spot zones as coarse authoring hints, not canonical anatomical truth
- `validate:garment3d` now enforces regression budgets for the measured hero-garment summaries and the default equipped `Soft Casual` top so source corrective passes cannot silently drift backward
- hero structured garments now use a helper-aware projection target during Blender corrective passes, so fitted tops and outerwear conform against MPFB's helper-inclusive body space instead of a stripped body shell
- the stage now switches to a warmer avatar-review lighting pass when no garments are equipped so silhouette review is easier before dressing
- the avatar-review mode now also uses tighter camera framing and warmer skin/hair material treatment so `Remove All` reads like a product avatar review state instead of a raw fallback scene
- the current female MPFB preset was rebuilt around `short04 + eyebrow001 + eyelashes01` with one subdivision level in export, improving face readability in the Closet avatar review mode
- the current hero garments were retuned in Blender before export:
  - `Soft Casual` is now tracked as a guarded default-loadout top with current measured proximity of female `90 / 134 / 495` and male `67 / 92 / 281` for `<= 3mm / <= 5mm / <= 10mm`
  - `City Relaxed` now reduces female `<= 3mm / <= 5mm / <= 10mm` contact from `408 / 411 / 539` to `336 / 347 / 394`
  - `Soft Wool` now reduces female `<= 3mm / <= 5mm / <= 10mm` contact from `38 / 78 / 340` to `35 / 76 / 244`
  - `Tailored Layer` helper-aware corrective now reports female `0 / 54 / 65` and male `0 / 172 / 245` for `<= 3mm / <= 5mm / <= 10mm`, with close-contact penetration back to `0` on both variants

## 9. Next Technical Steps

1. keep promoting product-grade size charts for every newly shipped garment, not only starter samples
2. expand `correctiveFit` and `poseTuning` from starter metadata into authoring-time partner/admin publish payloads
3. calibrate the shape-signal layer against more partner garments and body-review captures so the MPFB mapping stops being heuristic-heavy
4. add coarse collision volumes per garment category, including head-worn assets
5. keep re-measuring and re-labeling garment size charts so `fit-calibration` and fallback metadata track the post-corrective geometry instead of older size contracts
6. keep all adopted external sources tracked in `docs/OPEN_ASSET_CREDITS.md`

## 10. Rules For Future Adoption

- do not import any repository into the shipping codebase without checking license text directly
- do not treat research code as product-safe by default
- do not ship a new garment without measurement modes and a declared size basis
- do not claim “physical fit” unless the result is grounded in body-vs-garment dimensions
