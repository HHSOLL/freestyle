---
name: blender-rig-audit
description: Audit Blender armatures, skinned meshes, and animation bindings. Use when asked to inspect rig structure, armature presence, skinning setup, or export risks for animated assets.
---

# Blender Rig Audit

Use this skill when the task is about armatures, skinned meshes, or animation export readiness.

## Workflow

1. Confirm Blender access with `blender_info` if needed.
2. Use `blender_run_python` with `blend_file` to inspect:
   - armatures
   - parent/child relationships
   - armature modifiers
   - vertex group presence
   - actions and NLA tracks when relevant
3. Summarize concrete export risks.

## Typical checks

- mesh has armature modifier
- armature exists but mesh is unbound
- missing vertex groups
- multiple armatures where one was expected
- no animation actions on an animated asset
