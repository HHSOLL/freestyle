---
name: blender-render-preview
description: Render quick Blender preview images for review. Use when asked to generate front, side, three-quarter, or simple turntable previews before exporting or approving an asset.
---

# Blender Render Preview

Use this skill to review shape and material direction before runtime export.

## Workflow

1. Confirm the target `blend_file`, object or collection, and output image path.
2. Use `blender_run_python` with `blend_file` to:
   - create a temporary camera if needed
   - add simple lighting if the scene is dark
   - frame the target asset consistently
   - render to the requested PNG path
3. Report the saved preview path and any Blender stderr.

## Good Fits

- front/side/three-quarter stills
- quick approval renders for props
- before/after cleanup checks

## Reference

- For preview-scene setup patterns, see [../references/blender-run-python-patterns.md](../references/blender-run-python-patterns.md).
