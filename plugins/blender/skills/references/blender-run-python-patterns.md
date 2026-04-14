# Blender Run Python Patterns

Use these patterns when a Blender skill relies on `blender_run_python`.

## Save New Work

- When creating a scene from scratch, create the output directory first.
- Save the result explicitly with `bpy.ops.wm.save_as_mainfile(filepath=...)`.
- Do not assume Blender autosaves or preserves state between calls.

## Edit Existing Work Safely

- When the user gives an existing `.blend`, prefer saving to a new path unless they explicitly asked to overwrite.
- If the task is destructive, report the before/after object names, materials, and path used for the saved file.

## Report Facts

- Print short machine-readable facts to stdout when possible.
- Good examples: object count, material count, saved path, exported path, dimensions, triangle count estimate.
- Do not hide Blender stderr; surface it in the final report.

## Preview Renders

- If the scene has no camera, create a temporary camera.
- If the scene is unlit, add a simple area light or sun.
- Set a predictable resolution and output path before rendering.

## Asset Safety

- Apply transforms intentionally, not by reflex.
- Keep naming stable and meaningful.
- Prefer low-risk cleanup steps over heavy topology edits unless the user asked for aggressive optimization.
