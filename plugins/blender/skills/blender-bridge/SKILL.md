---
name: blender-bridge
description: Use the local Blender MCP bridge to inspect the Blender installation, run headless Python snippets, and export .blend files to GLB.
---

# Blender Bridge

Use this skill when the task needs Blender from Codex.

## Available MCP tools

- `blender_info`
- `blender_run_python`
- `blender_export_glb`

## Typical flow

1. Call `blender_info` first to confirm the Blender binary path and version.
2. Use `blender_run_python` for small headless checks with `bpy`.
3. Use `blender_export_glb` when you need a `.blend` file exported for the web runtime.

## Notes

- The installed home-local plugin bridge is configured in `~/plugins/blender/.mcp.json`.
- The default Blender binary path is `/Applications/Blender.app/Contents/MacOS/Blender`.
- If Blender moves, update `BLENDER_BIN` in the MCP config.
