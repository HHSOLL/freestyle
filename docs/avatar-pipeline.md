# Avatar Pipeline

## 1. Policy

The preferred authoring pipeline is:

1. `MPFB2 / MakeHuman`
2. `CharMorph` fallback
3. Blender for cleanup, export, and validation only
4. runtime delivery as `glb` or `gltf`

The Blender addon itself is not part of the web product. It is an offline authoring step.

## 2. Current Repo Truth

Current shipped runtime assets:

- `apps/web/public/assets/avatars/mpfb-female-base.glb`
- `apps/web/public/assets/avatars/mpfb-male-base.glb`

These are generated in-repo from the MPFB pipeline and are now the default visible human bases for the runtime.

## 3. Output Contract

Every promoted mannequin asset must satisfy:

- humanoid skeleton
- `Y-up`
- `meter` units
- `A-pose` bind state
- clean UVs and materials
- stable bone aliases for shoulders, spine, hips, limbs, feet, head
- mesh segmentation for body masking
- metadata for authoring source and runtime compatibility:
  - contract schema version
  - source provenance (preset + summary + sidecar + output GLB parity)
  - build provenance (MPFB repo revision + asset-pack checksum + builder version)
  - explicit variant/runtime model path coupling

Current runtime source-of-truth files:

- `packages/runtime-3d/src/avatar-manifest.ts`
- `packages/domain-garment/src/skeleton-profiles.ts`
- `packages/runtime-3d/src/closet-stage.tsx`

## 4. Measurement Mapping Layer

The runtime control chain is:

`BodyProfile -> bodyProfileToAvatarParams -> avatarParamsToMorphTargets + avatarParamsToRigTargets -> applyMorphPlan`

This layer exists so measurements do not directly manipulate the stage with a single global scale.

Current normalized controls include:

- stature
- shoulder width
- chest volume
- waist volume
- hip volume
- arm length
- inseam
- torso length
- leg volume

Current runtime behavior:

- MPFB base avatars now ship with exported shape keys intact
- runtime applies calibrated MPFB morph weights first, then a lighter rig-target pass
- the current morph calibration derives lean, body-mass, soft-frame, curve, tall, long-leg, and proportion signals from the normalized body profile instead of relying on a single average-weight heuristic
- segmented body meshes (`fullbody / torso / arms / hips / legs / feet / exposed`) share the same morph space so covered zones can still follow the customized body
- the segmented torso zone now explicitly absorbs `clavicle + neck-base` influence so fitted tops can hide the shoulder shelf without blanking the whole arm zone
- helper-hiding body mask modifiers are preserved through avatar export, because stripping them makes the shipped fullbody mesh visibly collapse into a sheet-like silhouette
- the promoted female preset now uses `short04 + eyebrow001 + eyelashes01` as the baked base so the face stays more readable in avatar-review mode and under runtime hair overrides
- avatar rebuilds now use `--subdiv-levels 1` so the shipped base surface reads less faceted in `Remove All` review mode without breaking the current runtime asset budget
- `Closet` can now override the baked base hair with shipped runtime hair GLBs, so hairstyle selection does not require regenerating the whole avatar base asset
- `Closet` now ships eight swappable runtime hair styles and a lightweight spring-motion layer, so long hair and braids can read as live assets instead of static shells
- the current default female runtime hair is `Soft Bob`, which keeps the face readable without the forehead-covering curtain effect the earlier `Clean Sweep` baseline produced in Closet

## 5. Runtime Registration

Each render variant must declare:

- `modelPath`
- `schemaVersion`
- `authoringSource`
- `sourceProvenance`:
  - `sourceSystem`
  - `schemaVersion`
  - `presetPath`
  - `summaryPath`
  - `skeletonPath`
  - `measurementsPath`
  - `morphMapPath`
  - `outputModelPath`
- stage offsets and scale
- mesh zones
- alias patterns
- summary parity is validated via `scripts/validate-avatar-3d.mjs`:
  - summary `schemaVersion` matches manifest-defined summary schema version
  - `sourceProvenance.presetPath` resolves to the summary `preset`
  - `sourceProvenance.skeletonPath`, `measurementsPath`, and `morphMapPath` resolve to existing authoring sidecars
  - `sourceProvenance.outputModelPath` matches summary `outputModelPath`
  - summary `outputGlb` resolves to manifest `modelPath`
  - summary and sidecars share the same `buildProvenance`
  - `buildProvenance.mpfb.revision` is a concrete upstream git SHA
  - `buildProvenance.assetPack.sha256` records the exact asset-pack payload used during export
  - body-segment object names still match the manifest mesh-zone contract used by runtime masking

Current registry:

- `female-base`
- `male-base`

## 6. Validation Checklist

Before promoting a new avatar asset:

1. verify it loads in the runtime without missing bones
2. verify the alias map resolves critical bones
3. verify all standard poses still work
4. verify garment body masks still line up
5. verify measurement changes affect the intended regions
6. verify the asset stays within the declared runtime budget
7. run `npm run validate:avatar3d`

## 7. MPFB2 / CharMorph Offline Flow

Recommended offline sequence:

1. run `npm run authoring:avatar:mpfb:build`
2. the wrapper fetches MPFB source and the official asset pack into `authoring/avatar/.cache/` if needed
3. Blender runs `authoring/avatar/mpfb/scripts/build_runtime_avatar.py` for each preset JSON
4. `.blend` outputs land in `authoring/avatar/exports/raw/`
5. sidecar authoring artifacts land next to the summary JSON:
   - `*.skeleton.json`
   - `*.measurements.json`
   - `*.morph-map.json`
6. promoted runtime GLBs land in `apps/web/public/assets/avatars/`
7. run `npm run optimize:runtime:assets` to apply shipped-runtime meshopt + texture recompression
8. register or update the asset in `avatar-manifest.ts`
9. run runtime regression checks

Current preset source-of-truth:

- `authoring/avatar/mpfb/presets/female-base.json`
- `authoring/avatar/mpfb/presets/male-base.json`
- `authoring/avatar/mpfb/source-lock.json`

## 8. Current Limitation

Current remaining limitation:

- the MPFB assets are now shipped as `fullbody + segmented runtime bodies` (`torso / arms / legs / feet / exposed`) so garment body masks can hide covered regions without blanking the full avatar
- the runtime now also ships MPFB-authored starter garment GLBs for both base variants
- the runtime now also ships MPFB-authored starter accessory GLBs for both base variants, including a bucket hat and oval sunglasses built directly against the exported MPFB base blends
- the runtime now also ships MPFB-authored starter hair GLBs for both base variants, including `Signature Ponytail`, `Soft Bob`, `Long Fall`, `Textured Crop`, `Studio Braid`, `Volume Bob`, `Clean Sweep`, and `Afro Cloud`
- measurement changes now flow through a formal `BodyProfile -> AvatarMorphPlan` layer and reach exported MPFB shape keys in runtime, but the morph-weight heuristics still need tighter calibration against the real MPFB shape-key space
- the current calibration now separates lean vs curvy female silhouettes and uses the male `ideal proportion` keys, but it still needs a deeper partner-garment QA pass before it can be treated as final
- starter garments are now rendered in the same shared wrapper transform as the avatar instead of using a separate garment bbox fit path, but per-garment body mask coverage still needs tuning for every silhouette
- starter hair assets now bind through head anchors and hide the baked base-hair meshes at runtime when equipped
- starter hair assets now declare `secondaryMotion` profiles so long hair and braid silhouettes can sway with a lightweight spring wrapper in runtime
- promoted runtime GLBs now ship through an explicit browser optimization pass (`meshopt + texture recompress + selective preload policy`) so the product no longer eagerly downloads the entire starter catalog on stage import
- the `Remove All` review path now uses a warmer camera/light/material setup in runtime so the base avatar can be reviewed with more product-like fidelity before dressing
- the current promoted female base preset uses `short04` hair with `eyebrow001` and `eyelashes01`, while the promoted male base preset uses `short02`
- the current raw authoring contract now emits `summary + skeleton + measurements + morph-map` sidecars for each promoted base variant
- the current `measurements.json` sidecar is a geometry-derived reference artifact for authoring QA, not yet the final runtime calibration source
- the current raw contract also records `buildProvenance` so future reruns can be traced back to a specific MPFB revision, asset-pack checksum, and Blender export toolchain
- the current MPFB wrapper now resolves authoring inputs against `authoring/avatar/mpfb/source-lock.json` instead of floating `origin/master`
- the current default starter direction is `Soft Tucked Tee + Soft Wool Trousers + Soft Day Shoe`, built from the official MakeHuman Community `shirts01`, `pants01`, and `shoes01` packs
- the current hero-garment authoring pass widened and dropped the `Soft Casual` top and `Tailored Layer` outerwear directly in Blender before export
- the current hero-garment pass now also creates a helper-aware projection target before shrinkwrap/corrective fit, so structured tops and outerwear are conformed against the same helper-inclusive body space that MPFB uses during authoring
- garment build summaries now include `fitAudit` with Blender-side distance buckets and coarse hot-spot hints, and `validate:garment3d` treats those summaries as regression gates for hero pieces plus the default equipped `Soft Casual` top
- `fitAudit.penetratingVertexCount` now counts only close negative-normal hits (`<= 3mm`) so the summary remains useful as a near-body intersection signal instead of inflating on distant normal inversions
- measured female-source proximity is now:
  - `Soft Casual` top: current guarded default-loadout proximity is female `90 / 134 / 495` and male `67 / 92 / 281` for `<= 3mm / <= 5mm / <= 10mm`
  - `City Relaxed` top: `<= 3mm` from `408 -> 336`, `<= 5mm` from `411 -> 347`, `<= 10mm` from `539 -> 394`
  - `Soft Wool` trousers: `<= 3mm` from `38 -> 35`, `<= 5mm` from `78 -> 76`, `<= 10mm` from `340 -> 244`
- `Tailored Layer` outerwear: `<= 3mm` from `958 -> 700`, but chest/arm contact still remains too high for a commercial-quality claim
- after the helper-aware corrective update, the current guarded `Tailored Layer` summaries are:
  - female: `0 / 54 / 65` for `<= 3mm / <= 5mm / <= 10mm`
  - male: `0 / 172 / 245` for `<= 3mm / <= 5mm / <= 10mm`
  - both now report `penetratingVertexCount: 0` under the close-contact penetration metric

This is materially better than the old fallback state, but it is not yet the final avatar-fidelity endpoint.

## 9. Licensing

Track all avatar and prop sources in `docs/OPEN_ASSET_CREDITS.md`.

For any MPFB2, MakeHuman, CharMorph, animation, hair, or texture source:

- record the source URL
- record the author and license
- record whether redistribution in the repo is permitted
- do not ship untracked assets
