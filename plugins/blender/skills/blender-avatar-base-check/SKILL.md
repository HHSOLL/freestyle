---
name: blender-avatar-base-check
description: Check a Blender human base model for rig, scale, slot-readiness, and export safety. Use when asked to inspect a 3D human body, avatar base, mannequin, or clothing-fit target in Blender.
---

# Blender Avatar Base Check

Use this skill for read-only validation of a human base model before garment or export work.

## Workflow

1. Call `blender_info` if Blender has not been checked in the current task.
2. Use `blender_run_python` with `blend_file` to inspect:
   - armatures
   - skinned body meshes
   - object dimensions and origin
   - shape keys and modifiers
   - obvious slot anchors for tops, bottoms, shoes, hair, and accessories
3. Report blockers first, then safe next steps.

## Focus

- one clear export body versus duplicate hidden meshes
- stable rig naming
- body scale and floor placement
- separate body regions that may need masking under garments
- missing or suspicious bindings that will break clothing fit

## Reference

- For safe `blender_run_python` patterns, see [../references/blender-run-python-patterns.md](../references/blender-run-python-patterns.md).
