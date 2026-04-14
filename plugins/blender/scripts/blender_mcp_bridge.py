#!/usr/bin/env python3
"""Blender MCP bridge built on the official Python MCP SDK."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


DEFAULT_BLENDER_BIN = "/Applications/Blender.app/Contents/MacOS/Blender"


def blender_bin() -> str:
    return os.environ.get("BLENDER_BIN", DEFAULT_BLENDER_BIN)


def debug_log(message: str) -> None:
    log_path = os.environ.get("BLENDER_MCP_LOG")
    if not log_path:
        return
    with open(log_path, "a", encoding="utf-8") as handle:
        handle.write(message + "\n")


def ensure_blender() -> Path:
    path = Path(blender_bin())
    if not path.exists():
        raise FileNotFoundError(f"Blender binary not found: {path}")
    return path


def subprocess_result(command: list[str], timeout_seconds: int) -> dict[str, object]:
    debug_log(f"run={command!r}")
    proc = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        check=False,
    )
    return {
        "command": command,
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }


def blender_info_impl() -> str:
    binary = ensure_blender()
    result = subprocess_result([str(binary), "--version"], timeout_seconds=20)
    result["blender_bin"] = str(binary)
    return json.dumps(result, indent=2)


def blender_run_python_impl(code: str, blend_file: str | None = None, timeout_seconds: int = 60) -> str:
    binary = ensure_blender()

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as handle:
        handle.write(code)
        script_path = handle.name

    command = [str(binary), "--background", "--factory-startup", "--python-exit-code", "1"]
    if blend_file:
        command.append(blend_file)
    command.extend(["--python", script_path])

    try:
        result = subprocess_result(command, timeout_seconds=timeout_seconds)
    finally:
        Path(script_path).unlink(missing_ok=True)

    return json.dumps(result, indent=2)


def blender_export_glb_impl(
    blend_file: str,
    output_path: str,
    export_format: str = "GLB",
    use_selection: bool = False,
    timeout_seconds: int = 120,
) -> str:
    binary = ensure_blender()
    selection_literal = "True" if use_selection else "False"
    script = f"""
import bpy

output_path = r\"\"\"{output_path}\"\"\"
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="{export_format}",
    use_selection={selection_literal},
)
print("Exported", output_path)
"""

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as handle:
        handle.write(script)
        script_path = handle.name

    command = [
        str(binary),
        "--background",
        blend_file,
        "--python-exit-code",
        "1",
        "--python",
        script_path,
    ]

    try:
        result = subprocess_result(command, timeout_seconds=timeout_seconds)
    finally:
        Path(script_path).unlink(missing_ok=True)

    return json.dumps(result, indent=2)


def build_server():
    from mcp.server.fastmcp import FastMCP

    debug_log("server-build")
    mcp = FastMCP("blender-bridge")

    @mcp.tool()
    def blender_info() -> str:
        """Return Blender binary information and version output."""
        return blender_info_impl()

    @mcp.tool()
    def blender_run_python(code: str, blend_file: str | None = None, timeout_seconds: int = 60) -> str:
        """Run a Python snippet in Blender headless mode."""
        return blender_run_python_impl(
            code=code,
            blend_file=blend_file,
            timeout_seconds=timeout_seconds,
        )

    @mcp.tool()
    def blender_export_glb(
        blend_file: str,
        output_path: str,
        export_format: str = "GLB",
        use_selection: bool = False,
        timeout_seconds: int = 120,
    ) -> str:
        """Open a .blend file in Blender and export it to glTF/GLB."""
        return blender_export_glb_impl(
            blend_file=blend_file,
            output_path=output_path,
            export_format=export_format,
            use_selection=use_selection,
            timeout_seconds=timeout_seconds,
        )

    return mcp


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        print(blender_info_impl())
        return

    debug_log("server-start")
    try:
        mcp = build_server()
    except Exception as exc:  # pragma: no cover
        print(f"Failed to import MCP SDK: {exc}", file=sys.stderr)
        raise
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
