---
name: blender-mesh-audit
description: Audit Blender meshes for topology and cleanup issues. Use when asked to find non-manifold geometry, flipped normals, loose geometry, excessive ngons, or other mesh risks before export.
---

# Blender Mesh Audit

Use this skill for factual mesh QA before cleanup or export.

## Workflow

1. Verify Blender access with `blender_info` if needed.
2. Use `blender_run_python` with `blend_file` to inspect target meshes for:
   - non-manifold edges
   - loose geometry
   - reversed normals indicators
   - heavy ngon usage
   - duplicate mesh data or suspicious object names
3. Report findings by severity.

## Guardrails

- Default to read-only inspection.
- If the user asks for automatic cleanup, save a new file instead of overwriting the original by default.
