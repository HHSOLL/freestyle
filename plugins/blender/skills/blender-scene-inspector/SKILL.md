---
name: blender-scene-inspector
description: Inspect a Blender scene through headless bpy scripts. Use when asked to list objects, collections, cameras, lights, materials, or other scene inventory details from a .blend file.
---

# Blender Scene Inspector

Use this skill for read-only inspection of `.blend` scenes.

## Workflow

1. Call `blender_info` if the Blender bridge has not been verified in the current task.
2. Use `blender_run_python` with a small `bpy` snippet and pass `blend_file`.
3. Keep the script narrow and task-specific.

## Common inspections

- list object names and types
- list collections
- list cameras and lights
- list materials on selected meshes
- count polygons or modifiers on target objects

## Notes

- Prefer inspection over mutation unless the user explicitly asks for scene changes.
- Return raw facts first, then short interpretation.
