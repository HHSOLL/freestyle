#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
import zipfile
from pathlib import Path

import bpy
from mathutils import Vector

AVATAR_BUILD_SUMMARY_SCHEMA_VERSION = "avatar-build-summary-v1"
AVATAR_SKELETON_SIDECAR_SCHEMA_VERSION = "avatar-skeleton-sidecar-v1"
AVATAR_MEASUREMENTS_SIDECAR_SCHEMA_VERSION = "avatar-measurements-sidecar-v1"
AVATAR_MORPH_MAP_SIDECAR_SCHEMA_VERSION = "avatar-morph-map-sidecar-v1"


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Build a runtime-ready MPFB avatar blend and GLB.")
    parser.add_argument("--mpfb-source-dir", required=True, help="Path to MPFB source repo 'src' directory")
    parser.add_argument("--preset-json", required=True, help="Human preset JSON")
    parser.add_argument("--variant-id", required=True, help="Runtime avatar variant id")
    parser.add_argument("--output-blend", required=True, help="Output .blend path")
    parser.add_argument("--output-glb", help="Optional output .glb path")
    parser.add_argument("--runtime-model-path", help="Runtime model path registered in the web manifest")
    parser.add_argument("--mpfb-repo-url", help="Resolved MPFB source repository URL")
    parser.add_argument("--mpfb-revision", help="Resolved MPFB source git revision")
    parser.add_argument("--mpfb-source-path", help="Resolved MPFB source directory path")
    parser.add_argument("--asset-pack-path", help="Resolved asset-pack path")
    parser.add_argument("--asset-pack-file-name", help="Resolved asset-pack file name")
    parser.add_argument("--asset-pack-sha256", help="Resolved asset-pack SHA256")
    parser.add_argument("--asset-pack-source-ref", help="Resolved asset-pack source URL or local reference")
    parser.add_argument("--summary-json", help="Optional JSON summary path")
    parser.add_argument("--asset-pack-zip", help="Optional path to makehuman_system_assets zip")
    parser.add_argument("--skin-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "ENHANCED", "ENHANCED_SSS", "LAYERED", "NONE"])
    parser.add_argument("--clothes-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "NONE"])
    parser.add_argument("--eyes-model", default="GAMEENGINE", choices=["PRESET", "GAMEENGINE", "MAKESKIN", "PROCEDURAL_EYES", "NONE"])
    parser.add_argument("--subdiv-levels", type=int, default=0)
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
        }

    if not asset_pack_zip:
        return {
            "installed": installed,
            "modern": modern,
            "installed_now": False,
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
    }


ZONE_PRIORITY = {"feet": 5, "legs": 4, "arms": 3, "hips": 2, "torso": 1, "exposed": 0}
ZONE_GROUP_PATTERNS = {
    "feet": ("footl", "balll", "footr", "ballr"),
    "legs": ("thighl", "calfl", "thighr", "calfr"),
    "arms": ("upperarml", "lowerarml", "upperarmr", "lowerarmr"),
    "hips": ("pelvis",),
    "torso": ("spine01", "spine02", "spine03", "claviclel", "clavicler", "neck01"),
}


def _normalize_name(value):
    return "".join(ch for ch in str(value).lower() if ch.isalnum())


HAIR_OBJECT_PATTERNS = (
    "hair",
    "short01",
    "short02",
    "short03",
    "short04",
    "long01",
    "bob01",
    "bob02",
    "braid01",
    "ponytail01",
    "afro01",
)


def _classify_body_zone_from_groups(vertex, basemesh):
    if not vertex.groups:
        return None

    zone_weights = {"feet": 0.0, "legs": 0.0, "arms": 0.0, "hips": 0.0, "torso": 0.0}
    total_weight = 0.0
    for group_ref in vertex.groups:
        group = basemesh.vertex_groups[group_ref.group]
        normalized = _normalize_name(group.name)
        matched_zone = None
        for zone_name, patterns in ZONE_GROUP_PATTERNS.items():
            if any(normalized == pattern for pattern in patterns):
                matched_zone = zone_name
                break
        if not matched_zone:
            continue
        zone_weights[matched_zone] += group_ref.weight
        total_weight += group_ref.weight

    if total_weight < 0.18:
        return None

    return max(zone_weights.items(), key=lambda entry: (entry[1], ZONE_PRIORITY[entry[0]]))[0]


def _classify_body_zone_fallback(co):
    x = abs(co.x)
    z = co.z
    if z < 0.12:
        return "feet"
    if z < 0.82 and x < 0.34:
        return "legs"
    if z < 1.02 and x < 0.33:
        return "hips"
    if z < 1.34 and x < 0.29:
        return "torso"
    if z < 1.42 and x < 0.62:
        return "arms"
    return "exposed"


def _classify_body_zone(vertex, basemesh):
    return _classify_body_zone_from_groups(vertex, basemesh) or _classify_body_zone_fallback(vertex.co)


def segment_body_mesh(basemesh):
    import bmesh

    zone_vertices = {"torso": set(), "arms": set(), "hips": set(), "legs": set(), "feet": set(), "exposed": set()}
    for vertex in basemesh.data.vertices:
        zone_vertices[_classify_body_zone(vertex, basemesh)].add(vertex.index)

    created = []
    parent = basemesh.parent
    collections = list(basemesh.users_collection)

    full_body = basemesh.copy()
    full_body.data = basemesh.data.copy()
    full_body.name = f"{basemesh.name}.fullbody"
    full_body.parent = parent
    full_body.matrix_world = basemesh.matrix_world.copy()
    full_body.animation_data_clear()
    for collection in collections:
        collection.objects.link(full_body)

    for zone_name, keep_indices in zone_vertices.items():
        segment = basemesh.copy()
        segment.data = basemesh.data.copy()
        segment.name = f"{basemesh.name}.{zone_name}"
        segment.parent = parent
        segment.matrix_world = basemesh.matrix_world.copy()
        segment.animation_data_clear()
        for collection in collections:
            collection.objects.link(segment)

        bm = bmesh.new()
        bm.from_mesh(segment.data)
        bm.verts.ensure_lookup_table()
        verts_to_delete = [vert for vert in bm.verts if vert.index not in keep_indices]
        if verts_to_delete:
            bmesh.ops.delete(bm, geom=verts_to_delete, context="VERTS")
        bm.to_mesh(segment.data)
        bm.free()
        created.append(segment)

    bpy.data.objects.remove(basemesh, do_unlink=True)
    return {
        "full_body": full_body,
        "zones": {name: len(indices) for name, indices in zone_vertices.items()},
        "segments": created,
    }


def collect_summary(module, basemesh):
    ObjectService = module.services.ObjectService
    rig = ObjectService.find_object_of_type_amongst_nearest_relatives(basemesh, "Skeleton")
    proxy = ObjectService.find_object_of_type_amongst_nearest_relatives(basemesh, "Proxymeshes")

    shape_keys = []
    if basemesh.data.shape_keys:
        shape_keys = [key_block.name for key_block in basemesh.data.shape_keys.key_blocks]

    related_objects = []
    for obj in bpy.data.objects:
        related_objects.append(
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
                "vertexCount": len(obj.data.vertices) if getattr(obj.data, "vertices", None) else None,
            }
        )

    return {
        "basemesh": {
            "name": basemesh.name,
            "shapeKeys": shape_keys,
            "materialSlots": [slot.material.name if slot.material else None for slot in basemesh.material_slots],
        },
        "proxy": proxy.name if proxy else None,
        "bodySegments": [obj.name for obj in bpy.data.objects if obj.type == "MESH" and obj.name.startswith(f"{basemesh.name}.")],
        "rig": {
            "name": rig.name if rig else None,
            "boneNames": [bone.name for bone in rig.data.bones] if rig else [],
        },
        "objects": related_objects,
    }


def _find_bone(rig, *candidate_names):
    wanted = {_normalize_name(name) for name in candidate_names}
    for bone in rig.data.bones:
        if _normalize_name(bone.name) in wanted:
            return bone
    return None


def _bone_head_world(rig, bone):
    return rig.matrix_world @ bone.head_local


def _bone_tail_world(rig, bone):
    return rig.matrix_world @ bone.tail_local


def _bone_length_m(rig, bone):
    return (_bone_tail_world(rig, bone) - _bone_head_world(rig, bone)).length


def _chain_length_m(rig, bone_names):
    total = 0.0
    for bone_name in bone_names:
        bone = _find_bone(rig, bone_name)
        if bone is None:
            return None
        total += _bone_length_m(rig, bone)
    return total


def _distance_between_bone_heads_m(rig, left_name, right_name):
    left = _find_bone(rig, left_name)
    right = _find_bone(rig, right_name)
    if left is None or right is None:
        return None
    return (_bone_head_world(rig, left) - _bone_head_world(rig, right)).length


def _object_height_m(obj):
    world_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    z_values = [corner.z for corner in world_corners]
    return max(z_values) - min(z_values)


def _meters_to_mm(value):
    if value is None:
        return None
    return int(round(value * 1000))


def derive_reference_measurements_mm(full_body, rig):
    return {
        "statureMm": _meters_to_mm(_object_height_m(full_body)),
        "shoulderWidthMm": _meters_to_mm(_distance_between_bone_heads_m(rig, "upperarm_l", "upperarm_r")),
        "armLengthMm": _meters_to_mm(_chain_length_m(rig, ["upperarm_l", "lowerarm_l", "hand_l"])),
        "inseamMm": _meters_to_mm(_chain_length_m(rig, ["thigh_l", "calf_l"])),
        "torsoLengthMm": _meters_to_mm(_chain_length_m(rig, ["spine_01", "spine_02", "spine_03", "neck_01"])),
        "hipWidthMm": _meters_to_mm(_distance_between_bone_heads_m(rig, "thigh_l", "thigh_r")),
    }


def _sidecar_stem(summary_path: Path):
    name = summary_path.name
    if name.endswith(".summary.json"):
        return name[: -len(".summary.json")]
    if name.endswith(".json"):
        return name[: -len(".json")]
    return summary_path.stem


def _sidecar_path(summary_path: Path, suffix: str):
    return summary_path.with_name(f"{_sidecar_stem(summary_path)}.{suffix}.json")


def build_skeleton_sidecar(summary, variant_id):
    rig = summary.get("rig", {})
    bone_names = rig.get("boneNames", [])
    return {
        "schemaVersion": AVATAR_SKELETON_SIDECAR_SCHEMA_VERSION,
        "variantId": variant_id,
        "authoringSource": "mpfb2",
        "rigName": rig.get("name"),
        "boneCount": len(bone_names),
        "rootBoneName": bone_names[0] if bone_names else None,
        "buildProvenance": summary.get("buildProvenance"),
        "boneNames": bone_names,
        "normalizedBoneNames": [_normalize_name(name) for name in bone_names],
    }


def _tokenize_shape_key(name):
    return [token for token in re.split(r"[^a-zA-Z0-9]+", str(name).lower()) if token]


def build_measurements_sidecar(summary, variant_id):
    return {
        "schemaVersion": AVATAR_MEASUREMENTS_SIDECAR_SCHEMA_VERSION,
        "variantId": variant_id,
        "authoringSource": "mpfb2",
        "units": "mm",
        "buildProvenance": summary.get("buildProvenance"),
        "referenceMeasurementsMm": summary.get("referenceMeasurementsMm", {}),
        "segmentationVertexCounts": summary.get("segmentation", {}),
    }


def build_morph_map_sidecar(summary, variant_id):
    shape_keys = summary.get("basemesh", {}).get("shapeKeys", [])
    return {
        "schemaVersion": AVATAR_MORPH_MAP_SIDECAR_SCHEMA_VERSION,
        "variantId": variant_id,
        "authoringSource": "mpfb2",
        "shapeKeyCount": len(shape_keys),
        "basisShapeKey": shape_keys[0] if shape_keys else None,
        "buildProvenance": summary.get("buildProvenance"),
        "shapeKeys": [
            {
                "name": name,
                "tokens": _tokenize_shape_key(name),
                "isBasis": index == 0,
            }
            for index, name in enumerate(shape_keys)
        ],
    }


def write_avatar_sidecars(summary_path: Path, summary, variant_id):
    sidecars = {
        "skeleton": build_skeleton_sidecar(summary, variant_id),
        "measurements": build_measurements_sidecar(summary, variant_id),
        "morph-map": build_morph_map_sidecar(summary, variant_id),
    }
    for suffix, payload in sidecars.items():
        path = _sidecar_path(summary_path, suffix)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def build_provenance(args):
    return {
        "mpfb": {
            "repoUrl": args.mpfb_repo_url,
            "revision": args.mpfb_revision,
            "sourcePath": args.mpfb_source_path,
        },
        "assetPack": {
            "path": args.asset_pack_path,
            "fileName": args.asset_pack_file_name,
            "sha256": args.asset_pack_sha256,
            "sourceRef": args.asset_pack_source_ref,
        },
        "builder": {
            "scriptPath": to_repo_relative(Path(__file__).resolve()),
            "blenderVersion": bpy.app.version_string,
        },
    }


def export_glb(output_glb: str):
    output_path = Path(output_glb).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=False,
        use_visible=True,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
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


def prepare_runtime_export():
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        normalized = _normalize_name(obj.name)
        if any(pattern in normalized for pattern in HAIR_OBJECT_PATTERNS):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if "highpoly" in normalized:
            obj.hide_set(True)
            obj.hide_render = True

    for material in bpy.data.materials:
        normalized = _normalize_name(material.name)
        if "body" not in normalized:
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


def to_repo_relative(path_value: Path):
    try:
        return path_value.resolve().relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        return str(path_value.resolve())


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
    prepare_runtime_export()
    segmentation = segment_body_mesh(basemesh)
    full_body = segmentation["full_body"]
    summary = collect_summary(module, full_body)
    rig = module.services.ObjectService.find_object_of_type_amongst_nearest_relatives(full_body, "Skeleton")
    output_blend = Path(args.output_blend).resolve()
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))

    if args.output_glb:
        export_glb(args.output_glb)

    summary["segmentation"] = segmentation["zones"]
    summary["fullBody"] = full_body.name
    summary["bodySegments"] = [segment.name for segment in segmentation["segments"]]
    summary["referenceMeasurementsMm"] = derive_reference_measurements_mm(full_body, rig) if rig else {}
    summary["schemaVersion"] = AVATAR_BUILD_SUMMARY_SCHEMA_VERSION
    summary["buildProvenance"] = build_provenance(args)
    summary["authoringProvenance"] = {
        "sourceSystem": "mpfb2",
        "variantId": args.variant_id,
        "presetPath": to_repo_relative(preset_path),
        "outputModelPath": args.runtime_model_path if args.runtime_model_path else None,
    }
    summary["preset"] = to_repo_relative(preset_path)
    summary["packState"] = pack_state
    summary["outputBlend"] = to_repo_relative(output_blend)
    if args.output_glb:
        output_glb = Path(args.output_glb).resolve()
        summary["outputGlb"] = to_repo_relative(output_glb)
        if summary["authoringProvenance"]["outputModelPath"] is None:
            summary["authoringProvenance"]["outputModelPath"] = summary["outputGlb"]

    if args.summary_json:
        summary_path = Path(args.summary_json).resolve()
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        write_avatar_sidecars(summary_path, summary, args.variant_id)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
