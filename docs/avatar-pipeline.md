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
- metadata for authoring source and runtime compatibility

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
- segmented body meshes (`fullbody / torso / hips / legs / feet / exposed`) share the same morph space so covered zones can still follow the customized body
- the promoted female preset now uses `ponytail01 + eyebrow001 + eyelashes01`, which better matches the current Closet art direction and the hero garment source blends
- avatar rebuilds now use `--subdiv-levels 1` so the shipped base surface reads less faceted in `Remove All` review mode without breaking the current runtime asset budget
- `Closet` can now override the baked base hair with shipped runtime hair GLBs, so hairstyle selection does not require regenerating the whole avatar base asset

## 5. Runtime Registration

Each render variant must declare:

- `modelPath`
- `authoringSource`
- stage offsets and scale
- mesh zones
- alias patterns

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
5. promoted runtime GLBs land in `apps/web/public/assets/avatars/`
6. register or update the asset in `avatar-manifest.ts`
7. run runtime regression checks

Current preset source-of-truth:

- `authoring/avatar/mpfb/presets/female-base.json`
- `authoring/avatar/mpfb/presets/male-base.json`

## 8. Current Limitation

Current remaining limitation:

- the MPFB assets are now shipped as `fullbody + segmented runtime bodies` (`torso / legs / feet / exposed`) so garment body masks can hide covered regions without blanking the full avatar
- the runtime now also ships MPFB-authored starter garment GLBs for both base variants
- the runtime now also ships MPFB-authored starter accessory GLBs for both base variants, including a bucket hat and oval sunglasses built directly against the exported MPFB base blends
- the runtime now also ships MPFB-authored starter hair GLBs for both base variants, including `Signature Ponytail`, `Soft Bob`, `Long Fall`, and `Textured Crop`
- measurement changes now flow through a formal `BodyProfile -> AvatarMorphPlan` layer and reach exported MPFB shape keys in runtime, but the morph-weight heuristics still need tighter calibration against the real MPFB shape-key space
- the current calibration now separates lean vs curvy female silhouettes and uses the male `ideal proportion` keys, but it still needs a deeper partner-garment QA pass before it can be treated as final
- starter garments are now rendered in the same shared wrapper transform as the avatar instead of using a separate garment bbox fit path, but per-garment body mask coverage still needs tuning for every silhouette
- starter hair assets now bind through head anchors and hide the baked base-hair meshes at runtime when equipped
- the `Remove All` review path now uses a warmer camera/light/material setup in runtime so the base avatar can be reviewed with more product-like fidelity before dressing
- the current promoted female base preset uses `ponytail01` hair with `eyebrow001` and `eyelashes01`, while the promoted male base preset uses `short02`
- the current default starter direction is `Soft Tucked Tee + Soft Wool Trousers + Soft Day Shoe`, built from the official MakeHuman Community `shirts01`, `pants01`, and `shoes01` packs
- the current hero-garment authoring pass widened and dropped the `City Relaxed` top and `Tailored Layer` outerwear directly in Blender before export, which reduced ultra-close body proximity in the female source blends from `448 -> 341` and `803 -> 553` vertices at `<= 1mm`, respectively

This is materially better than the old fallback state, but it is not yet the final avatar-fidelity endpoint.

## 9. Licensing

Track all avatar and prop sources in `docs/OPEN_ASSET_CREDITS.md`.

For any MPFB2, MakeHuman, CharMorph, animation, hair, or texture source:

- record the source URL
- record the author and license
- record whether redistribution in the repo is permitted
- do not ship untracked assets
