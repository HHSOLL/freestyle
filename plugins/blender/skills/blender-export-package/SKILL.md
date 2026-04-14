---
name: blender-export-package
description: Prepare and export a Blender asset package for runtime use. Use when asked to do a final Blender export pass that includes preflight checks, naming sanity, and GLB output reporting.
---

# Blender Export Package

Use this skill for the last Blender-side step before a runtime asset lands in the project.

## Workflow

1. Confirm the source `.blend` path and output `.glb` path.
2. Use `blender_run_python` with `blend_file` to gather a short preflight summary:
   - object names
   - material count
   - hidden or disabled objects
   - suspicious transforms or duplicate names
3. If the scene looks safe, call `blender_export_glb`.
4. Report:
   - source `.blend`
   - output `.glb`
   - return code
   - any Blender stderr

## Guardrails

- Prefer exporting a prepared copy over mutating the only source file.
- Do not silently ignore export warnings.
- Use `use_selection: true` only when the user explicitly wants a subset export.
