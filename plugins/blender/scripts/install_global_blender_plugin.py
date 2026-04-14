#!/usr/bin/env python3
"""Install the Blender plugin into home-local Codex locations."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


MARKETPLACE_NAME = "sol-local"
MARKETPLACE_DISPLAY_NAME = "Sol Local Plugins"
PLUGIN_NAME = "blender"
PLUGIN_CATEGORY = "3D Authoring"
BLENDER_BIN = "/Applications/Blender.app/Contents/MacOS/Blender"


def copy_tree(source: Path, destination: Path) -> None:
    for path in source.rglob("*"):
        relative = path.relative_to(source)
        if "__pycache__" in relative.parts:
            continue
        target = destination / relative
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def ensure_marketplace(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        payload = json.loads(path.read_text())
    else:
        payload = {
            "name": MARKETPLACE_NAME,
            "interface": {"displayName": MARKETPLACE_DISPLAY_NAME},
            "plugins": [],
        }

    payload["name"] = payload.get("name") or MARKETPLACE_NAME
    interface = payload.setdefault("interface", {})
    interface["displayName"] = interface.get("displayName") or MARKETPLACE_DISPLAY_NAME
    plugins = payload.setdefault("plugins", [])

    entry = {
        "name": PLUGIN_NAME,
        "source": {"source": "local", "path": f"./plugins/{PLUGIN_NAME}"},
        "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
        "category": PLUGIN_CATEGORY,
    }

    for index, existing in enumerate(plugins):
        if existing.get("name") == PLUGIN_NAME:
            plugins[index] = entry
            break
    else:
        plugins.append(entry)

    path.write_text(json.dumps(payload, indent=2) + "\n")


def ensure_skill_links(home_plugin: Path, global_skills_root: Path) -> None:
    global_skills_root.mkdir(parents=True, exist_ok=True)
    skills_root = home_plugin / "skills"
    for skill_dir in skills_root.iterdir():
        if not skill_dir.is_dir():
            continue
        if not (skill_dir / "SKILL.md").exists():
            continue
        target = global_skills_root / skill_dir.name
        if target.exists() or target.is_symlink():
            if target.is_symlink() or target.is_file():
                target.unlink()
            else:
                shutil.rmtree(target)
        target.symlink_to(skill_dir)


def rewrite_home_mcp_config(home_plugin: Path) -> None:
    python_bin = home_plugin / ".venv" / "bin" / "python"
    config = {
        "mcpServers": {
            "blender-bridge": {
                "command": str(python_bin),
                "args": [str(home_plugin / "scripts" / "blender_mcp_bridge.py")],
                "env": {"BLENDER_BIN": BLENDER_BIN},
            }
        }
    }
    (home_plugin / ".mcp.json").write_text(json.dumps(config, indent=2) + "\n")


def ensure_runtime(home_plugin: Path) -> Path:
    venv_dir = home_plugin / ".venv"
    python_bin = venv_dir / "bin" / "python"
    if not python_bin.exists():
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
    subprocess.run(
        [
            str(python_bin),
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--upgrade",
            "pip",
            "mcp[cli]>=1.27.0,<2",
        ],
        check=True,
    )
    return python_bin


def ensure_codex_registration(home_plugin: Path, python_bin: Path) -> None:
    codex_bin = shutil.which("codex")
    if not codex_bin:
        print("Skipped global Codex MCP registration because `codex` is not on PATH.")
        return

    bridge_script = home_plugin / "scripts" / "blender_mcp_bridge.py"
    subprocess.run(
        [codex_bin, "mcp", "remove", PLUGIN_NAME],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        [
            codex_bin,
            "mcp",
            "add",
            PLUGIN_NAME,
            "--env",
            f"BLENDER_BIN={BLENDER_BIN}",
            "--",
            str(python_bin),
            str(bridge_script),
        ],
        check=True,
    )


def main() -> None:
    source_plugin = Path(__file__).resolve().parents[1]
    home = Path.home()
    home_plugin = home / "plugins" / PLUGIN_NAME
    home_marketplace = home / ".agents" / "plugins" / "marketplace.json"
    global_skills_root = home / ".codex" / "skills"

    home_plugin.mkdir(parents=True, exist_ok=True)
    copy_tree(source_plugin, home_plugin)
    python_bin = ensure_runtime(home_plugin)
    rewrite_home_mcp_config(home_plugin)
    ensure_marketplace(home_marketplace)
    ensure_skill_links(home_plugin, global_skills_root)
    ensure_codex_registration(home_plugin, python_bin)

    print(f"Installed plugin to {home_plugin}")
    print(f"Prepared runtime {python_bin}")
    print(f"Updated marketplace {home_marketplace}")
    print(f"Linked skills into {global_skills_root}")
    print("Synchronized global Codex MCP server `blender`.")


if __name__ == "__main__":
    main()
