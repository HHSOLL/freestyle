---
name: blender-web-asset-optimizer
description: Prepare Blender assets for lean web delivery. Use when asked to reduce runtime cost, clean object hierarchies, simplify material usage, or make a scene safer for GLB export.
---

# Blender Web Asset Optimizer

Use this skill after an asset looks correct but before it ships.

## Workflow

1. Confirm the target `blend_file` and whether the output should be a new prepared copy.
2. Use `blender_run_python` with `blend_file` to inspect and, if asked, clean:
   - object and collection naming
   - redundant hidden objects
   - material slot count
   - unapplied modifiers or transforms
   - obvious polycount outliers
3. Export with `blender_export_glb` if the asset is ready.

## Guardrails

- Prefer safe cleanup over aggressive geometry destruction.
- Report what changed and what still needs a human decision.
