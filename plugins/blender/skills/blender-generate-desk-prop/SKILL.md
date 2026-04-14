---
name: blender-generate-desk-prop
description: Generate deskterior props in Blender for workspaces and tabletop scenes. Use when asked to build mugs, lamps, books, trays, pen holders, monitor risers, speakers, or similar desk props.
---

# Blender Generate Desk Prop

Use this skill for small to medium desk objects that do not need sculpted hero detail.

## Workflow

1. Confirm the prop type, style direction, and output `.blend` path.
2. Use `blender_run_python` to:
   - start from primitives or curves
   - keep proportions and silhouette clean
   - cap material slots to a small set
   - save the result explicitly
3. Export to `.glb` if the runtime asset is needed now.

## Good Fits

- mugs, cups, trays, notebooks, books
- desk lamps, pen holders, speakers
- monitor risers, cable boxes, small organizers

## Reference

- For safe save and reporting patterns, see [../references/blender-run-python-patterns.md](../references/blender-run-python-patterns.md).
