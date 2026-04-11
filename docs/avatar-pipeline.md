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

- `apps/web/public/assets/avatars/quaternius-animated-woman.glb`
- `apps/web/public/assets/avatars/quaternius-man.glb`

These are rigged human fallback bases used by the runtime today. The codebase now exposes the right runtime contract for a future MPFB2-authored asset, but the repo does not yet ship that asset.

Do not overstate this in product or engineering docs.

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

## 4. Measurement Mapping Layer

The runtime control chain is:

`BodyProfile -> bodyProfileToAvatarParams -> avatarParamsToRigTargets -> applyMorphPlan`

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

Reference rig:

- `apps/web/public/assets/closet/models/rig-base.glb`

## 6. Validation Checklist

Before promoting a new avatar asset:

1. verify it loads in the runtime without missing bones
2. verify the alias map resolves critical bones
3. verify all standard poses still work
4. verify garment body masks still line up
5. verify measurement changes affect the intended regions
6. verify the asset stays within the declared runtime budget

## 7. MPFB2 / CharMorph Offline Flow

Recommended offline sequence:

1. generate the base human in MPFB2 or MakeHuman
2. if unavailable, generate in CharMorph with the same unit and bind-pose rules
3. export to Blender
4. clean materials, UVs, and mesh segmentation
5. normalize bone naming or alias metadata
6. export `glb`
7. register the asset in `avatar-manifest.ts`
8. run runtime regression checks

## 8. Current Limitation

Current blocker:

- the repo does not yet ship a true MPFB2-authored morph-target mannequin asset

Current mitigation:

- fallback rigged human GLBs are live
- measurement-driven rig transforms are live
- the garment contract and skeleton profile registry are live

This is enough to support the current product runtime, but it is still a partial implementation relative to the full authoring target.

## 9. Licensing

Track all avatar and prop sources in `docs/OPEN_ASSET_CREDITS.md`.

For any MPFB2, MakeHuman, CharMorph, animation, hair, or texture source:

- record the source URL
- record the author and license
- record whether redistribution in the repo is permitted
- do not ship untracked assets
