---
name: blender-material-audit
description: Audit Blender materials and texture setup for runtime use. Use when asked to find missing textures, non-PBR material issues, or web-delivery risks in a Blender scene.
---

# Blender Material Audit

Use this skill to review material and texture readiness for runtime delivery.

## Workflow

1. Verify the bridge with `blender_info` if needed.
2. Run `blender_run_python` against the target `blend_file`.
3. Collect:
   - material names
   - image texture paths
   - missing files
   - suspicious node setups for runtime export
4. Report findings grouped by severity.

## Audit focus

- missing or broken image texture paths
- unexpectedly complex shader graphs
- duplicated materials
- nonstandard texture formats or oversized textures
- materials likely to export poorly to glTF/GLB
