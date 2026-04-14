# Blender Plugin

This plugin connects Codex to the locally installed Blender app through a small stdio MCP bridge.

Source of truth:

- repo-local development source: `plugins/blender`
- global install target: `~/plugins/blender`
- global marketplace: `~/.agents/plugins/marketplace.json`
- global skill links: `~/.codex/skills/blender-*`

Included pieces:

- `.codex-plugin/plugin.json`
- `.mcp.json`
- `scripts/blender_mcp_bridge.py`
- `scripts/install_global_blender_plugin.py`
- `scripts/test_blender_skills.sh`
- `skills/blender-bridge/SKILL.md`
- `skills/blender-export-glb/SKILL.md`
- `skills/blender-scene-inspector/SKILL.md`
- `skills/blender-material-audit/SKILL.md`
- `skills/blender-rig-audit/SKILL.md`
- an expanded workflow skill pack for avatar, garment, prop, cleanup, preview, and export tasks

Current connection defaults:

- Blender binary: `/Applications/Blender.app/Contents/MacOS/Blender`
- MCP transport: `stdio`
- preferred runtime: `~/plugins/blender/.venv/bin/python`
- MCP entrypoint: `plugins/blender/scripts/blender_mcp_bridge.py`
- repo-local `.mcp.json` prefers the installed home-local venv and only falls back to `python3` when the MCP SDK is already importable

Exposed MCP tools:

- `blender_info`
- `blender_run_python`
- `blender_export_glb`

Manual checks:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --version
/Users/sol/plugins/blender/.venv/bin/python /Users/sol/plugins/blender/scripts/blender_mcp_bridge.py --self-test
```

Global install and registration:

```bash
python3 /Users/sol/Desktop/fsp/plugins/blender/scripts/install_global_blender_plugin.py
codex mcp list
```

Fresh-session skill smoke test:

```bash
bash /Users/sol/Desktop/fsp/plugins/blender/scripts/test_blender_skills.sh
```

The installer now does all of the following in one pass:

- syncs the plugin source into `~/plugins/blender`
- creates or refreshes `~/plugins/blender/.venv`
- installs the official Python `mcp` SDK into that venv
- rewrites `~/plugins/blender/.mcp.json` to use the venv runtime
- updates `~/.agents/plugins/marketplace.json`
- symlinks the Blender skills into `~/.codex/skills`
- re-registers the global Codex MCP server name `blender`

Recommended next steps:

1. Re-run the global install script after changing the repo-local Blender plugin source.
2. Extend the bridge with render, validation, or mesh cleanup tools as needed.
3. Keep the Blender binary path in sync if the app moves or the versioned install path changes.
