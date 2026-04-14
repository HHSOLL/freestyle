---
name: blender-garment-blockout
description: Create first-pass garment meshes in Blender for tops, bottoms, shoes, or simple accessories. Use when asked to build a clothing blockout from references or from a target avatar slot.
---

# Blender Garment Blockout

Use this skill for rough clothing construction, not final high-fashion detailing.

## Workflow

1. Confirm the garment slot, style direction, and output `.blend` path.
2. If a base avatar exists, inspect it first with `blender-avatar-base-check` or `blender_run_python`.
3. Use `blender_run_python` to:
   - create a simple garment shell from primitives or duplicated body regions
   - keep silhouette and proportion correct before adding detail
   - assign simple placeholder materials
   - save the result as a `.blend`
4. If requested, export the blockout with `blender_export_glb`.

## Good Fits

- tank tops, T-shirts, skirts, pants, shorts
- simple shoes and sandals
- belts, bags, eyewear blockouts

## Reference

- For safe save and reporting patterns, see [../references/blender-run-python-patterns.md](../references/blender-run-python-patterns.md).
