---
name: blender-garment-fit-pass
description: Adjust a garment in Blender against a target avatar for first-pass fit and clipping reduction. Use when asked to reposition, widen, lengthen, or clean up a clothing mesh on an existing body.
---

# Blender Garment Fit Pass

Use this skill after a garment already exists and needs a practical fit pass.

## Workflow

1. Confirm the garment object or collection and the target body inside `blend_file`.
2. Use `blender_run_python` with `blend_file` to inspect:
   - body proximity
   - major clipping zones
   - garment origin and transforms
3. Apply conservative fit fixes:
   - offset and scale corrections
   - shrinkwrap or solidify tuning when appropriate
   - hem, width, or length adjustments
4. Save to a new `.blend` path unless the user explicitly asked to overwrite.

## Focus

- eliminate obvious clipping at shoulders, waist, hips, knees, and ankles
- preserve silhouette before micro-detail
- keep names and slot compatibility stable
