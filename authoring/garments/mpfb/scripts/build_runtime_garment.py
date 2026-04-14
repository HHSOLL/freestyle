#!/usr/bin/env python3

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

import bpy


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


def collect_summary(clothes_obj, armature, output_blend, output_glb, preset_path, clothes_path, pack_state):
    return {
        "garment": {
            "name": clothes_obj.name,
            "vertexCount": len(clothes_obj.data.vertices),
            "materialSlots": [slot.material.name if slot.material else None for slot in clothes_obj.material_slots],
            "vertexGroups": [group.name for group in clothes_obj.vertex_groups],
        },
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


def apply_corrective_smooth(clothes_obj):
    _activate_object(clothes_obj)
    modifier = clothes_obj.modifiers.new(name="RuntimeCorrectiveSmooth", type="CORRECTIVE_SMOOTH")
    modifier.factor = 0.32
    modifier.iterations = 6
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_first_pass_fit(clothes_obj, clothes_path: Path, body_obj=None):
    import bmesh

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
        for vert in bm.verts:
            lower_ratio = max(0.0, min(1.0, (max_z - vert.co.z) / total))
            if lower_ratio < 0.35:
                continue
            falloff = ((lower_ratio - 0.35) / 0.65) ** 1.35
            vert.co.z -= falloff * 0.035
            vert.co.x *= 1.0 + falloff * 0.025
            vert.co.y *= 1.0 + falloff * 0.012

    if "toigo_wool_pants" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        for vert in bm.verts:
            lower_ratio = max(0.0, min(1.0, (max_z - vert.co.z) / total))
            if lower_ratio < 0.18:
                continue
            falloff = ((lower_ratio - 0.18) / 0.82) ** 1.25
            vert.co.x *= 1.0 + falloff * 0.065
            vert.co.y *= 1.0 + falloff * 0.03

    if "casualsuit02" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        for vert in bm.verts:
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            torso_band = max(0.0, 1.0 - abs(vertical_ratio - 0.58) / 0.32)
            hem_falloff = max(0.0, min(1.0, (0.46 - vertical_ratio) / 0.46)) ** 1.4
            shoulder_falloff = max(0.0, min(1.0, (vertical_ratio - 0.72) / 0.28)) ** 1.25
            width_boost = torso_band * 0.024 + hem_falloff * 0.032 + shoulder_falloff * 0.014
            depth_boost = torso_band * 0.016 + hem_falloff * 0.022 + shoulder_falloff * 0.008
            vert.co.x *= 1.0 + width_boost
            vert.co.y *= 1.0 + depth_boost
            vert.co.z -= hem_falloff * 0.022

    if "elegantsuit01" in normalized_path:
        min_z = min(vert.co.z for vert in bm.verts)
        max_z = max(vert.co.z for vert in bm.verts)
        total = max(max_z - min_z, 0.0001)
        for vert in bm.verts:
            vertical_ratio = max(0.0, min(1.0, (vert.co.z - min_z) / total))
            shoulder_falloff = max(0.0, min(1.0, (vertical_ratio - 0.74) / 0.26)) ** 1.4
            torso_band = max(0.0, 1.0 - abs(vertical_ratio - 0.56) / 0.3)
            tail_falloff = max(0.0, min(1.0, (0.42 - vertical_ratio) / 0.42)) ** 1.35
            width_boost = shoulder_falloff * 0.03 + torso_band * 0.018 + tail_falloff * 0.046
            depth_boost = shoulder_falloff * 0.02 + torso_band * 0.014 + tail_falloff * 0.03
            vert.co.x *= 1.0 + width_boost
            vert.co.y *= 1.0 + depth_boost
            vert.co.z -= tail_falloff * 0.03

    if "shoes" in normalized_path:
        offset_meters = 0.0015
    elif "toigo_flats" in normalized_path:
        offset_meters = 0.0009
    elif "elegantsuit" in normalized_path:
        offset_meters = 0.0062
    elif "casualsuit02" in normalized_path:
        offset_meters = 0.0046
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
            projection_offset = 0.0019
        elif "casualsuit02" in normalized_path:
            projection_offset = 0.0016
        elif "toigo_camisole_top" in normalized_path:
            projection_offset = 0.0008
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
            if base_color_input and base_color:
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

    apply_first_pass_fit(clothes_obj, clothes_path, basemesh)
    prepare_runtime_export(clothes_obj, base_color=base_color, roughness=roughness, metalness=metalness)

    output_blend = Path(args.output_blend).resolve()
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))

    export_glb(armature, clothes_obj, args.output_glb)

    summary = collect_summary(
        clothes_obj,
        armature,
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
