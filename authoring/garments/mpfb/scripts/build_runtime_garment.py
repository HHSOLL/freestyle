#!/usr/bin/env python3

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Build a runtime-ready MPFB garment GLB on the game_engine rig.")
    parser.add_argument("--mpfb-source-dir", required=True, help="Path to MPFB source repo 'src' directory")
    parser.add_argument("--preset-json", required=True, help="Avatar preset JSON used as the garment fit target")
    parser.add_argument("--clothes-asset", required=True, help="Relative clothes asset path inside MPFB data, or absolute .mhclo path")
    parser.add_argument("--output-blend", required=True, help="Output .blend path")
    parser.add_argument("--output-glb", required=True, help="Output .glb path")
    parser.add_argument("--summary-json", required=True, help="Output JSON summary path")
    parser.add_argument("--asset-pack-zip", help="Optional path to makehuman_system_assets zip")
    parser.add_argument("--skin-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "ENHANCED", "ENHANCED_SSS", "LAYERED", "NONE"])
    parser.add_argument("--clothes-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "NONE"])
    parser.add_argument("--eyes-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "PROCEDURAL_EYES", "NONE"])
    parser.add_argument("--subdiv-levels", type=int, default=0)
    parser.add_argument("--base-color", help="Optional solid base color override as #RRGGBB")
    parser.add_argument("--roughness", type=float, help="Optional roughness override for garment material")
    parser.add_argument("--metalness", type=float, help="Optional metalness override for garment material")
    return parser.parse_args(argv)


def ensure_mpfb_enabled(source_dir: str):
    source_dir = str(Path(source_dir).resolve())
    repos = bpy.context.preferences.extensions.repos
    repo_name = "MPFB Source"
    module_name = Path(source_dir).name

    if repo_name not in [repo.name for repo in repos]:
        repos.new(
            name=repo_name,
            module=module_name,
            custom_directory=source_dir,
            remote_url="",
            source="USER",
        )

    bpy.ops.preferences.addon_enable(module=f"bl_ext.{module_name}.mpfb")
    module = __import__(f"bl_ext.{module_name}.mpfb", fromlist=["services"])
    return module


def wipe_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if not collection.users:
            bpy.data.collections.remove(collection)


def ensure_asset_pack(module, asset_pack_zip: str | None):
    LocationService = module.services.LocationService
    AssetService = module.services.AssetService

    installed, modern = AssetService.check_if_modern_makehuman_system_assets_installed()
    if installed and modern:
        return {
            "installed": True,
            "modern": True,
            "installed_now": False,
            "user_data": LocationService.get_user_data(),
        }

    if not asset_pack_zip:
        return {
            "installed": installed,
            "modern": modern,
            "installed_now": False,
            "user_data": LocationService.get_user_data(),
        }

    zip_path = Path(asset_pack_zip).resolve()
    if not zip_path.exists():
        raise FileNotFoundError(f"Asset pack zip not found: {zip_path}")

    data_dir = Path(LocationService.get_user_data())
    data_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(data_dir)

    AssetService.update_all_asset_lists()
    installed, modern = AssetService.check_if_modern_makehuman_system_assets_installed()

    return {
        "installed": installed,
        "modern": modern,
        "installed_now": True,
        "user_data": str(data_dir),
    }


def resolve_clothes_path(module, asset_fragment: str):
    if os.path.isabs(asset_fragment):
        return str(Path(asset_fragment).resolve())
    return str(Path(module.services.LocationService.get_user_data()) / asset_fragment)


def classify_proximity_zone(co, bounds_min, bounds_max):
    span_x = max(bounds_max.x - bounds_min.x, 0.0001)
    span_z = max(bounds_max.z - bounds_min.z, 0.0001)
    x_norm = abs((co.x - (bounds_min.x + bounds_max.x) * 0.5) / (span_x * 0.5))
    z_ratio = (co.z - bounds_min.z) / span_z

    if z_ratio > 0.78 and x_norm > 0.24:
        return "shoulders"
    if 0.52 <= z_ratio <= 0.86 and x_norm > 0.58:
        return "arms"
    if z_ratio > 0.6:
        return "chest"
    if z_ratio > 0.48:
        return "waist"
    if z_ratio > 0.3:
        return "hips"
    if z_ratio > 0.14:
        return "thighs"
    return "calves"


def collect_proximity_metrics(clothes_obj, body_obj):
    if not body_obj:
        return None

    depsgraph = bpy.context.evaluated_depsgraph_get()
    body_eval = body_obj.evaluated_get(depsgraph)
    clothes_eval = clothes_obj.evaluated_get(depsgraph)
    body_mesh = body_eval.to_mesh()
    clothes_mesh = clothes_eval.to_mesh()
    try:
        body_bm = bmesh.new()
        body_bm.from_mesh(body_mesh)
        body_bm.transform(body_eval.matrix_world)
        body_bm.normal_update()
        bvh = BVHTree.FromBMesh(body_bm)

        body_bounds = [body_eval.matrix_world @ Vector(corner) for corner in body_obj.bound_box]
        bounds_min = Vector(
            (
                min(corner.x for corner in body_bounds),
                min(corner.y for corner in body_bounds),
                min(corner.z for corner in body_bounds),
            )
        )
        bounds_max = Vector(
            (
                max(corner.x for corner in body_bounds),
                max(corner.y for corner in body_bounds),
                max(corner.z for corner in body_bounds),
            )
        )

        thresholds = (0.001, 0.003, 0.005, 0.01)
        penetration_distance_threshold = 0.003
        counts = {threshold: 0 for threshold in thresholds}
        zone_counts = {}
        min_distance = None
        penetrating = 0

        for vert in clothes_mesh.vertices:
            co = clothes_eval.matrix_world @ vert.co
            hit = bvh.find_nearest(co)
            if hit is None:
                continue
            nearest, normal, _, distance = hit
            delta = co - nearest
            if min_distance is None or distance < min_distance:
                min_distance = distance
            for threshold in thresholds:
                if distance <= threshold:
                    counts[threshold] += 1
            if normal.dot(delta) < 0 and distance <= penetration_distance_threshold:
                penetrating += 1
            if distance <= 0.005:
                zone = classify_proximity_zone(co, bounds_min, bounds_max)
                zone_counts[zone] = zone_counts.get(zone, 0) + 1

        hot_spots = [
            {"zone": zone, "countWithin5mm": count}
            for zone, count in sorted(zone_counts.items(), key=lambda item: item[1], reverse=True)[:4]
        ]

        return {
            "minDistanceMeters": min_distance,
            "penetratingVertexCount": penetrating,
            "thresholdCounts": {str(threshold): counts[threshold] for threshold in thresholds},
            "hotSpots": hot_spots,
        }
    finally:
        body_eval.to_mesh_clear()
        clothes_eval.to_mesh_clear()
        if "body_bm" in locals():
            body_bm.free()


def collect_summary(clothes_obj, armature, body_obj, output_blend, output_glb, preset_path, clothes_path, pack_state):
    return {
        "garment": {
            "name": clothes_obj.name,
            "vertexCount": len(clothes_obj.data.vertices),
            "materialSlots": [slot.material.name if slot.material else None for slot in clothes_obj.material_slots],
            "vertexGroups": [group.name for group in clothes_obj.vertex_groups],
        },
        "fitAudit": collect_proximity_metrics(clothes_obj, body_obj),
        "armature": {
            "name": armature.name if armature else None,
            "boneNames": [bone.name for bone in armature.data.bones] if armature else [],
        },
        "preset": str(preset_path),
        "clothesAsset": str(clothes_path),
        "packState": pack_state,
        "outputBlend": str(output_blend),
        "outputGlb": str(output_glb),
    }


def parse_hex_color(raw_value: str | None):
    if not raw_value:
        return None
    value = raw_value.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError(f"Expected #RRGGBB color, got: {raw_value}")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def _activate_object(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def ensure_object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def apply_body_projection_fit(clothes_obj, body_obj, offset_meters: float):
    if not body_obj or offset_meters <= 0:
        return
    _activate_object(clothes_obj)
    modifier = clothes_obj.modifiers.new(name="RuntimeShrinkwrap", type="SHRINKWRAP")
    modifier.target = body_obj
    if hasattr(modifier, "wrap_method"):
        modifier.wrap_method = "NEAREST_SURFACEPOINT"
    if hasattr(modifier, "wrap_mode"):
        modifier.wrap_mode = "OUTSIDE"
    modifier.offset = offset_meters
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def create_helper_projection_target(body_obj, name: str = "FS.HelperProjectionTarget"):
    ensure_object_mode()
    temp_source = body_obj.copy()
    temp_source.data = body_obj.data.copy()
    bpy.context.scene.collection.objects.link(temp_source)

    for modifier in list(temp_source.modifiers):
        if modifier.type == "MASK":
            temp_source.modifiers.remove(modifier)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = temp_source.evaluated_get(depsgraph)
    target_mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    target_obj = bpy.data.objects.new(name, target_mesh)
    target_obj.matrix_world = temp_source.matrix_world.copy()
    target_obj.hide_render = True
    target_obj.hide_viewport = True
    bpy.context.scene.collection.objects.link(target_obj)

    bpy.data.objects.remove(temp_source, do_unlink=True)
    return target_obj


def apply_corrective_smooth(clothes_obj):
    _activate_object(clothes_obj)
    modifier = clothes_obj.modifiers.new(name="RuntimeCorrectiveSmooth", type="CORRECTIVE_SMOOTH")
    modifier.factor = 0.32
    modifier.iterations = 6
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_first_pass_fit(clothes_obj, clothes_path: Path, body_obj=None):
    normalized_path = str(clothes_path).lower()
    bm = bmesh.new()
    bm.from_mesh(clothes_obj.data)
    bm.verts.ensure_lookup_table()
    bm.normal_update()

    if "female_sportsuit01" in normalized_path:
        visited = set()
        islands = []
        for vert in bm.verts:
            if vert.index in visited:
                continue
            stack = [vert]
            visited.add(vert.index)
            component = []
            while stack:
                current = stack.pop()
                component.append(current)
                for edge in current.link_edges:
                    other = edge.other_vert(current)
                    if other.index not in visited:
                        visited.add(other.index)
                        stack.append(other)
            if component:
                islands.append(component)

        if islands:
            top_component = max(
                islands,
                key=lambda component: sum(vert.co.z for vert in component) / max(len(component), 1),
            )
            top_min_z = min(vert.co.z for vert in top_component)
            top_max_z = max(vert.co.z for vert in top_component)
            top_range = max(top_max_z - top_min_z, 0.0001)
            for vert in top_component:
                falloff = max(0.0, min(1.0, (top_max_z - vert.co.z) / top_range))
                hem_pull = (falloff**1.75) * 0.16
                width_scale = 1.0 + falloff * 0.06
                depth_scale = 1.0 + falloff * 0.03
                vert.co.z -= hem_pull
                vert.co.x *= width_scale
                vert.co.y *= depth_scale

    if "toigo_camisole_top" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        for vert in bm.verts:
            lower_ratio = max(0.0, min(1.0, (max_z - vert.co.z) / total))
            if lower_ratio < 0.3:
                continue
            falloff = ((lower_ratio - 0.3) / 0.7) ** 1.45
            vert.co.z -= falloff * 0.085
            vert.co.x *= 1.0 + falloff * 0.045
            vert.co.y *= 1.0 + falloff * 0.02

    if "toigo_basictuckedtshirt" in normalized_path or "toigo_basic_tucked_t-shirt" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        max_abs_x = max(abs(vert.co.x) for vert in bm.verts) or 0.0001
        for vert in bm.verts:
            x_norm = abs(vert.co.x) / max_abs_x
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            lower_ratio = max(0.0, min(1.0, (max_z - vert.co.z) / total))
            hem_falloff = ((max(0.0, lower_ratio - 0.35) / 0.65) ** 1.35) if lower_ratio > 0.35 else 0.0
            torso_band = max(0.0, 1.0 - abs(vertical_ratio - 0.56) / 0.28)
            sleeve_band = max(0.0, min(1.0, (vertical_ratio - 0.52) / 0.28)) * max(0.0, min(1.0, (x_norm - 0.36) / 0.64))
            shoulder_band = max(0.0, min(1.0, (vertical_ratio - 0.74) / 0.18)) * max(0.0, min(1.0, (x_norm - 0.18) / 0.82))
            armhole_band = max(0.0, 1.0 - abs(vertical_ratio - 0.7) / 0.18) * max(0.0, min(1.0, (x_norm - 0.22) / 0.78))
            top_lift = max(0.0, min(1.0, (vertical_ratio - 0.42) / 0.58)) ** 1.2
            vert.co.z -= hem_falloff * 0.038
            vert.co.z += shoulder_band * 0.028 + armhole_band * 0.012 + top_lift * 0.016
            vert.co.x *= 1.0 + hem_falloff * 0.02 + torso_band * 0.018 + sleeve_band * 0.055 + shoulder_band * 0.115 + armhole_band * 0.05
            vert.co.y *= 1.0 + hem_falloff * 0.012 + torso_band * 0.01 + sleeve_band * 0.026 + shoulder_band * 0.04 + armhole_band * 0.02

    if "toigo_wool_pants" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        max_abs_x = max(abs(vert.co.x) for vert in bm.verts) or 0.0001
        for vert in bm.verts:
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            lower_ratio = max(0.0, min(1.0, (max_z - vert.co.z) / total))
            x_norm = abs(vert.co.x) / max_abs_x
            leg_falloff = ((max(0.0, lower_ratio - 0.16) / 0.84) ** 1.28) if lower_ratio > 0.16 else 0.0
            waist_band = max(0.0, min(1.0, (vertical_ratio - 0.68) / 0.24))
            hip_band = max(0.0, 1.0 - abs(vertical_ratio - 0.7) / 0.22)
            thigh_band = max(0.0, 1.0 - abs(vertical_ratio - 0.46) / 0.26) * max(0.0, min(1.0, (x_norm - 0.12) / 0.88))
            calf_band = max(0.0, min(1.0, (0.42 - vertical_ratio) / 0.42)) ** 1.15
            width_boost = leg_falloff * 0.088 + waist_band * 0.018 + hip_band * 0.04 + thigh_band * 0.05 + calf_band * 0.018
            depth_boost = leg_falloff * 0.042 + waist_band * 0.012 + hip_band * 0.024 + thigh_band * 0.026 + calf_band * 0.01
            vert.co.x *= 1.0 + width_boost
            vert.co.y *= 1.0 + depth_boost
            if hip_band > 0:
                vert.co.z += hip_band * 0.004
            vert.co.z -= leg_falloff * 0.01 + calf_band * 0.004

    if "casualsuit02" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        max_abs_x = max(abs(vert.co.x) for vert in bm.verts) or 0.0001
        for vert in bm.verts:
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            x_norm = abs(vert.co.x) / max_abs_x
            torso_band = max(0.0, 1.0 - abs(vertical_ratio - 0.58) / 0.32)
            hem_falloff = max(0.0, min(1.0, (0.46 - vertical_ratio) / 0.46)) ** 1.4
            shoulder_falloff = max(0.0, min(1.0, (vertical_ratio - 0.72) / 0.28)) ** 1.25
            sleeve_band = shoulder_falloff * max(0.0, min(1.0, (x_norm - 0.34) / 0.66))
            armhole_band = max(0.0, 1.0 - abs(vertical_ratio - 0.68) / 0.18) * max(0.0, min(1.0, (x_norm - 0.18) / 0.82))
            width_boost = torso_band * 0.04 + hem_falloff * 0.046 + shoulder_falloff * 0.036 + sleeve_band * 0.05 + armhole_band * 0.042
            depth_boost = torso_band * 0.028 + hem_falloff * 0.032 + shoulder_falloff * 0.02 + sleeve_band * 0.024 + armhole_band * 0.024
            vert.co.x *= 1.0 + width_boost
            vert.co.y *= 1.0 + depth_boost
            vert.co.z -= hem_falloff * 0.032
            vert.co.z += shoulder_falloff * 0.018 + armhole_band * 0.01

    if "elegantsuit01" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        max_abs_x = max(abs(vert.co.x) for vert in bm.verts) or 0.0001
        for vert in bm.verts:
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            x_norm = abs(vert.co.x) / max_abs_x
            shoulder_falloff = max(0.0, min(1.0, (vertical_ratio - 0.74) / 0.26)) ** 1.4
            torso_band = max(0.0, 1.0 - abs(vertical_ratio - 0.56) / 0.3)
            tail_falloff = max(0.0, min(1.0, (0.42 - vertical_ratio) / 0.42)) ** 1.35
            chest_band = max(0.0, 1.0 - abs(vertical_ratio - 0.66) / 0.18)
            sleeve_band = shoulder_falloff * max(0.0, min(1.0, (x_norm - 0.34) / 0.66))
            front_panel_band = max(0.0, min(1.0, (0.48 - x_norm) / 0.48)) * chest_band
            armhole_band = max(0.0, 1.0 - abs(vertical_ratio - 0.69) / 0.18) * max(0.0, min(1.0, (x_norm - 0.24) / 0.76))
            upper_arm_band = max(0.0, 1.0 - abs(vertical_ratio - 0.67) / 0.2) * max(0.0, min(1.0, (x_norm - 0.42) / 0.58))
            clavicle_band = max(0.0, min(1.0, (vertical_ratio - 0.78) / 0.18)) * max(0.0, min(1.0, (x_norm - 0.12) / 0.88))
            width_boost = (
                shoulder_falloff * 0.082
                + torso_band * 0.052
                + tail_falloff * 0.084
                + sleeve_band * 0.058
                + chest_band * 0.044
                + armhole_band * 0.042
                + upper_arm_band * 0.036
                + clavicle_band * 0.018
            )
            depth_boost = (
                shoulder_falloff * 0.046
                + torso_band * 0.034
                + tail_falloff * 0.052
                + sleeve_band * 0.03
                + front_panel_band * 0.03
                + armhole_band * 0.024
                + upper_arm_band * 0.018
                + clavicle_band * 0.008
            )
            vert.co.x *= 1.0 + width_boost
            vert.co.y *= 1.0 + depth_boost
            vert.co.z -= tail_falloff * 0.05
            vert.co.z += shoulder_falloff * 0.016 + chest_band * 0.008 + armhole_band * 0.01 + upper_arm_band * 0.006

    if "shoes" in normalized_path:
        offset_meters = 0.0015
    elif "toigo_flats" in normalized_path:
        offset_meters = 0.0009
    elif "elegantsuit" in normalized_path:
        offset_meters = 0.0092
    elif "casualsuit02" in normalized_path:
        offset_meters = 0.0062
    elif "sportsuit" in normalized_path:
        offset_meters = 0.003
    else:
        offset_meters = 0.0035

    for vert in bm.verts:
        vert.co += vert.normal.normalized() * offset_meters
    bm.to_mesh(clothes_obj.data)
    bm.free()
    clothes_obj.data.update()

    if body_obj and "toigo_flats" not in normalized_path:
        if "elegantsuit01" in normalized_path:
            projection_offset = 0.0044
        elif "casualsuit02" in normalized_path:
            projection_offset = 0.0028
        elif "toigo_camisole_top" in normalized_path:
            projection_offset = 0.0008
        elif "toigo_basictuckedtshirt" in normalized_path or "toigo_basic_tucked_t-shirt" in normalized_path:
            projection_offset = 0.002
        else:
            projection_offset = 0.0012
        apply_body_projection_fit(clothes_obj, body_obj, projection_offset)

    apply_corrective_smooth(clothes_obj)


def prepare_runtime_export(clothes_obj, base_color=None, roughness=None, metalness=None):
    _activate_object(clothes_obj)
    slot_names = {slot.material.name for slot in clothes_obj.material_slots if slot.material}

    for modifier in list(clothes_obj.modifiers):
        if modifier.type not in {"MASK"}:
            continue
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    for material in bpy.data.materials:
        if material.name not in slot_names:
            continue

        if hasattr(material, "blend_method"):
            material.blend_method = "OPAQUE"
        if hasattr(material, "surface_render_method"):
            material.surface_render_method = "DITHERED"
        if hasattr(material, "alpha_threshold"):
            material.alpha_threshold = 0.5
        material.use_backface_culling = False

        if not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            alpha_input = node.inputs.get("Alpha")
            if not alpha_input:
                continue
            while alpha_input.links:
                material.node_tree.links.remove(alpha_input.links[0])
            alpha_input.default_value = 1.0
            base_color_input = node.inputs.get("Base Color")
            if base_color_input and base_color and not base_color_input.links:
                while base_color_input.links:
                    material.node_tree.links.remove(base_color_input.links[0])
                base_color_input.default_value = base_color
            roughness_input = node.inputs.get("Roughness")
            if roughness_input and roughness is not None:
                roughness_input.default_value = roughness
            metalness_input = node.inputs.get("Metallic")
            if metalness_input and metalness is not None:
                metalness_input.default_value = metalness


def export_glb(armature, clothes_obj, output_glb: str):
    output_path = Path(output_glb).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    if armature:
        armature.select_set(True)
    clothes_obj.select_set(True)
    bpy.context.view_layer.objects.active = clothes_obj
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=10,
        export_draco_generic_quantization=12,
    )


def main():
    args = parse_args()
    module = ensure_mpfb_enabled(args.mpfb_source_dir)
    HumanService = module.services.HumanService

    wipe_scene()
    pack_state = ensure_asset_pack(module, args.asset_pack_zip)

    preset_path = Path(args.preset_json).resolve()
    with preset_path.open("r", encoding="utf-8") as handle:
        preset = json.load(handle)

    settings = HumanService.get_default_deserialization_settings()
    settings["load_clothes"] = False
    settings["subdiv_levels"] = max(args.subdiv_levels, 0)
    settings["material_instances"] = "NEVER"
    settings["override_skin_model"] = args.skin_model
    settings["override_clothes_model"] = args.clothes_model
    settings["override_eyes_model"] = args.eyes_model

    basemesh = HumanService.deserialize_from_dict(preset, settings)
    clothes_path = Path(resolve_clothes_path(module, args.clothes_asset)).resolve()
    if not clothes_path.exists():
        raise FileNotFoundError(f"Clothes asset not found: {clothes_path}")

    clothes_obj = HumanService.add_mhclo_asset(
        str(clothes_path),
        basemesh,
        asset_type="clothes",
        subdiv_levels=max(args.subdiv_levels, 0),
        material_type=args.clothes_model,
    )
    armature = basemesh.parent
    base_color = parse_hex_color(args.base_color)
    roughness = max(0.0, min(args.roughness, 1.0)) if args.roughness is not None else None
    metalness = max(0.0, min(args.metalness, 1.0)) if args.metalness is not None else None

    helper_projection_target = create_helper_projection_target(basemesh)
    apply_first_pass_fit(clothes_obj, clothes_path, helper_projection_target)
    bpy.data.objects.remove(helper_projection_target, do_unlink=True)
    prepare_runtime_export(clothes_obj, base_color=base_color, roughness=roughness, metalness=metalness)

    output_blend = Path(args.output_blend).resolve()
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))

    export_glb(armature, clothes_obj, args.output_glb)

    summary = collect_summary(
        clothes_obj,
        armature,
        basemesh,
        output_blend,
        Path(args.output_glb).resolve(),
        preset_path,
        clothes_path,
        pack_state,
    )

    summary_path = Path(args.summary_json).resolve()
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
