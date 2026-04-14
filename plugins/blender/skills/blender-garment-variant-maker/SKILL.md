---
name: blender-garment-variant-maker
description: Generate garment variations in Blender from an existing clothing base. Use when asked to make multiple lengths, widths, colors, trims, or shape variants from one garment source.
---

# Blender Garment Variant Maker

Use this skill when one good garment base should become a small variant set.

## Workflow

1. Start from a stable source garment in `blend_file`.
2. Confirm which parameters should vary:
   - length
   - width
   - sleeve or hem shape
   - colorway
   - trim or hardware
3. Use `blender_run_python` to duplicate the source asset, rename variants clearly, and apply bounded changes.
4. Save the variant scene and export chosen results if needed.

## Guardrails

- Keep slot compatibility unchanged unless the user asked for a slot change.
- Make a small, intentional variant set rather than many noisy micro-differences.
- Report the exact generated variant names and paths.
