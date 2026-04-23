# Garment Production Contract

## Purpose

Garment production is an asset-factory workflow with explicit technical, visual, fit, and performance gates.

Every production garment must be certifiable by automation and by operator review.

## Required Garment Artifacts

Every production garment must provide:

- display mesh `LOD0 / LOD1 / LOD2`
- fit mesh
- panel groups
- seam graph
- anchors
- constraints
- size mapping
- body-mask policy
- collision policy
- visual material
- physical material
- KTX2 runtime textures
- quality reports
- golden fit result

## Category Policy

Every garment must declare one fit-policy category:

- `tight_top`
- `loose_top`
- `sleeveless_top`
- `pants`
- `skirt_or_shorts`
- `dress`
- `shoes`
- `sandals`
- `boots`
- `accessories`

This category determines the critical body regions and the hard fail gates used during certification.

## Production Rules

Garments may not be treated as production-ready if they are missing:

- fit mesh
- category-specific fit policy
- physical material data
- body-mask policy
- golden-matrix evidence

Rules:

- preview solving must happen on fit meshes only
- display meshes must receive deformation transfer from the fit mesh path
- shoes and sandals are not treated as generic cloth assets
- visible foot masking is forbidden for sandals

## Reject Criteria

Reject or hold certification when any of these are true:

- topology or anchor data is incomplete
- material contract is incomplete
- size mapping is missing
- category-specific critical-region fit gates fail
- body masking hides forbidden visible regions
- LOD changes break silhouette or anchor regions
- budget thresholds fail without an approved exception
