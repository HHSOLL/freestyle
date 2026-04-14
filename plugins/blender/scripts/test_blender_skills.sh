#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/sol/Desktop/fsp"
INSTALLER="$REPO_ROOT/plugins/blender/scripts/install_global_blender_plugin.py"
TEST_ROOT="/tmp/codex-blender-skill-tests"

run_codex() {
  local prompt="$1"
  codex exec --skip-git-repo-check -C /Users/sol "$prompt" 2>&1 || true
}

expect_line() {
  local output="$1"
  local expected="$2"
  if ! printf '%s\n' "$output" | grep -Fqx -- "$expected"; then
    printf '%s\n' "$output" >&2
    echo "Expected line not found: $expected" >&2
    exit 1
  fi
}

expect_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Expected file not found: $path" >&2
    exit 1
  fi
}

echo "==> Syncing global Blender plugin"
python3 "$INSTALLER"

rm -rf "$TEST_ROOT"
mkdir -p "$TEST_ROOT"

echo "==> Checking skill discovery"
SKILL_OUTPUT="$(run_codex "Reply with only a JSON array of globally available skill names that start with 'blender-' and contain any of these words when present: desk, background, garment, avatar, mesh, transform, render, export, reference, style, web.")"
printf '%s\n' "$SKILL_OUTPUT"
for skill in \
  blender-generate-desk-prop \
  blender-generate-background-prop \
  blender-garment-blockout \
  blender-avatar-base-check \
  blender-mesh-audit \
  blender-transform-pivot-fix \
  blender-render-preview \
  blender-export-package \
  blender-reference-rebuild \
  blender-prop-style-normalizer \
  blender-web-asset-optimizer
do
  if [[ "$SKILL_OUTPUT" != *"$skill"* ]]; then
    echo "Missing discovered skill: $skill" >&2
    exit 1
  fi
done

echo "==> Generating desk prop"
OUTPUT="$(run_codex "Use the blender-generate-desk-prop skill. Then call blender_run_python exactly once with this code:
import bpy, os, math
path = \"$TEST_ROOT/mug.blend\"
os.makedirs(os.path.dirname(path), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.045, depth=0.09, location=(0,0,0.045))
body = bpy.context.active_object
body.name = \"MugBody\"
solid = body.modifiers.new(name=\"Solidify\", type='SOLIDIFY')
solid.thickness = 0.004
bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.0055, major_segments=16, minor_segments=8, location=(0.047,0,0.05), rotation=(math.radians(90),0,0))
handle = bpy.context.active_object
handle.name = \"MugHandle\"
mat = bpy.data.materials.new(name=\"MugCeramic\")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get(\"Principled BSDF\")
if bsdf:
    bsdf.inputs[0].default_value = (0.92, 0.94, 0.98, 1.0)
    bsdf.inputs[2].default_value = 0.35
for obj in (body, handle):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=path)
print(\"saved\", path)
After the tool call, verify the file exists before you answer. Reply with only BLENDER_SKILL_PASS:generate-desk-prop on success, otherwise reply with only BLENDER_SKILL_FAIL:generate-desk-prop.")"
printf '%s\n' "$OUTPUT"
expect_line "$OUTPUT" "BLENDER_SKILL_PASS:generate-desk-prop"
expect_file "$TEST_ROOT/mug.blend"

echo "==> Fixing transforms and pivot"
OUTPUT="$(run_codex "Use the blender-transform-pivot-fix skill. Then call blender_run_python exactly once with blend_file set to $TEST_ROOT/mug.blend and this code:
import bpy, os
out_path = \"$TEST_ROOT/mug-fixed.blend\"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
obj = bpy.data.objects[\"MugBody\"]
bpy.context.view_layer.objects.active = obj
for item in bpy.context.selected_objects:
    item.select_set(False)
obj.select_set(True)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
obj.location.z = obj.dimensions.z / 2.0
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.wm.save_as_mainfile(filepath=out_path)
print(\"saved\", out_path)
After the tool call, verify the new file exists before you answer. Reply with only BLENDER_SKILL_PASS:transform-pivot-fix on success, otherwise reply with only BLENDER_SKILL_FAIL:transform-pivot-fix.")"
printf '%s\n' "$OUTPUT"
expect_line "$OUTPUT" "BLENDER_SKILL_PASS:transform-pivot-fix"
expect_file "$TEST_ROOT/mug-fixed.blend"

echo "==> Auditing mesh"
OUTPUT="$(run_codex "Use the blender-mesh-audit skill. Then call blender_run_python exactly once with blend_file set to $TEST_ROOT/mug-fixed.blend and this code:
import bpy, json, bmesh
summary = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    non_manifold = sum(1 for edge in bm.edges if not edge.is_manifold)
    ngon_faces = sum(1 for face in bm.faces if len(face.verts) > 4)
    loose_verts = sum(1 for vert in bm.verts if not vert.link_edges)
    summary.append({
        'name': obj.name,
        'verts': len(bm.verts),
        'edges': len(bm.edges),
        'faces': len(bm.faces),
        'non_manifold_edges': non_manifold,
        'ngon_faces': ngon_faces,
        'loose_verts': loose_verts,
    })
    bm.free()
print(json.dumps(summary))
Reply with only BLENDER_SKILL_PASS:mesh-audit if the Blender inspection ran successfully, otherwise reply with only BLENDER_SKILL_FAIL:mesh-audit.")"
printf '%s\n' "$OUTPUT"
expect_line "$OUTPUT" "BLENDER_SKILL_PASS:mesh-audit"

echo "==> Rendering preview"
OUTPUT="$(run_codex "Use the blender-render-preview skill. Do not inspect agent files. Use shell only for one final file existence check. Do not call any Blender tool except one call to blender_run_python. Call blender_run_python exactly once with blend_file set to $TEST_ROOT/mug-fixed.blend and this code:
import bpy, os, math
out_path = \"$TEST_ROOT/mug-preview.png\"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = out_path
scene.render.resolution_x = 768
scene.render.resolution_y = 768
cam_data = bpy.data.cameras.new(\"PreviewCamera\")
cam = bpy.data.objects.new(\"PreviewCamera\", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (0.45, -0.55, 0.32)
cam.rotation_euler = (math.radians(68), 0, math.radians(38))
scene.camera = cam
light_data = bpy.data.lights.new(name=\"PreviewLight\", type='AREA')
light = bpy.data.objects.new(name=\"PreviewLight\", object_data=light_data)
bpy.context.scene.collection.objects.link(light)
light.location = (0.5, -0.4, 0.6)
light.data.energy = 2500
bpy.ops.render.render(write_still=True)
print(\"rendered\", out_path)
After the tool call, verify the PNG exists before you answer. Reply with only BLENDER_SKILL_PASS:render-preview on success, otherwise reply with only BLENDER_SKILL_FAIL:render-preview.")"
printf '%s\n' "$OUTPUT"
expect_line "$OUTPUT" "BLENDER_SKILL_PASS:render-preview"
expect_file "$TEST_ROOT/mug-preview.png"

echo "==> Exporting package"
OUTPUT="$(run_codex "Use the blender-export-package skill. Do not inspect agent files. Use shell only for one final file existence check. Call blender_export_glb exactly once with blend_file set to $TEST_ROOT/mug-fixed.blend, output_path set to $TEST_ROOT/mug.glb, export_format set to GLB, and use_selection set to false. After the tool call, verify the GLB exists before you answer. Reply with only BLENDER_SKILL_PASS:export-package on success, otherwise reply with only BLENDER_SKILL_FAIL:export-package.")"
printf '%s\n' "$OUTPUT"
expect_line "$OUTPUT" "BLENDER_SKILL_PASS:export-package"
expect_file "$TEST_ROOT/mug.glb"

echo "All Blender skill tests passed."
