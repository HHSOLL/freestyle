---
name: blender-transform-pivot-fix
description: Normalize Blender transforms, origins, and floor alignment before export. Use when asked to fix scale, rotation, origin placement, or asset grounding for runtime delivery.
---

# Blender Transform Pivot Fix

Use this skill for boring but critical export hygiene.

## Workflow

1. Confirm the target objects and whether the user wants a new saved file.
2. Use `blender_run_python` with `blend_file` to:
   - inspect unapplied transforms
   - move the origin to a sensible location
   - place the asset on the floor if appropriate
   - apply rotation and scale when safe
3. Save to a new `.blend` path unless the user explicitly asked to overwrite.

## Focus

- stable origin for placement
- correct floor contact
- predictable scale
- fewer runtime compensation hacks
