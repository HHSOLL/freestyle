---
name: blender-export-glb
description: Export Blender .blend assets to GLB using the Blender MCP bridge. Use when asked to convert a Blender scene or selected objects into runtime-ready GLB files.
---

# Blender Export GLB

Use this skill when a Blender file needs to become a web-delivery GLB.

## Workflow

1. Call `blender_info` if the Blender connection has not been checked in the current task.
2. Confirm the source `.blend` path and desired output `.glb` path.
3. Use `blender_export_glb` with:
   - `blend_file`
   - `output_path`
   - `export_format: "GLB"`
   - `use_selection: true` only if the user explicitly wants selected objects only
4. Report:
   - output path
   - return code
   - any stderr from Blender

## Notes

- Prefer `.glb` for runtime delivery unless the user explicitly asks for another glTF format.
- If the export fails, surface the exact Blender stderr instead of paraphrasing it away.
