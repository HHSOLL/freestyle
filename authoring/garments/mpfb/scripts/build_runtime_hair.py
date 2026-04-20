#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import bpy
from mathutils import Vector

REPO_ROOT = Path(__file__).resolve().parents[4]
AUTHORING_SUMMARY_SCHEMA_VERSION = "runtime-asset-authoring-summary.v1"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build a runtime-ready MPFB hair GLB using an avatar .blend as the fit target."
    )
    argv = bpy.app.driver_namespace.get("argv_override")
    if argv is None:
        import sys

        argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser.add_argument(
        "--hair-style",
        required=True,
        choices=["ponytail01", "bob01", "long01", "short03", "braid01", "bob02", "short04", "afro01"],
    )
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--summary-json", required=True)
    parser.add_argument("--variant-id", required=True, choices=["female-base", "male-base"])
    parser.add_argument("--hair-color", default="#3f2f28")
    parser.add_argument("--mpfb-data-dir")
    return parser.parse_args(argv)


def ensure_object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def to_repo_relative(path_value: Path):
    resolved = path_value.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError as error:
        raise RuntimeError(f"Expected repo-relative path inside {REPO_ROOT}, got {resolved}") from error


def get_armature():
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError("No armature found in the loaded avatar blend")
    return armatures[0]


def ensure_collection(name: str):
    collection = bpy.data.collections.get(name)
    if collection:
        return collection
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def clear_previous(prefix: str):
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def parse_hex_color(value: str):
    normalized = value.replace("#", "").strip()
    if len(normalized) != 6:
        return (0.25, 0.19, 0.16, 1.0)
    return (
        int(normalized[0:2], 16) / 255,
        int(normalized[2:4], 16) / 255,
        int(normalized[4:6], 16) / 255,
        1.0,
    )


def parse_diffuse_texture(mhmat_path: Path):
    if not mhmat_path.exists():
        return None
    for line in mhmat_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("diffuseTexture "):
            _, relative = line.split(" ", 1)
            texture_path = mhmat_path.parent / relative.strip()
            return texture_path if texture_path.exists() else None
    return None


def create_hair_material(name: str, base_color_rgba, texture_path: Path | None):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    material.blend_method = "HASHED"
    if hasattr(material, "shadow_method"):
        material.shadow_method = "HASHED"
    material.use_backface_culling = False

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    output = nodes.get("Material Output")
    principled.inputs["Base Color"].default_value = base_color_rgba
    principled.inputs["Roughness"].default_value = 0.56
    principled.inputs["Specular IOR Level"].default_value = 0.35
    principled.inputs["Alpha"].default_value = 1.0

    if texture_path:
        image = bpy.data.images.load(str(texture_path), check_existing=True)
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = image
        tex_node.interpolation = "Smart"
        links.new(tex_node.outputs["Color"], principled.inputs["Base Color"])
        links.new(tex_node.outputs["Alpha"], principled.inputs["Alpha"])

    if output and principled:
        links.new(principled.outputs["BSDF"], output.inputs["Surface"])

    return material


def import_hair_obj(obj_path: Path):
    ensure_object_mode()
    existing_names = {obj.name for obj in bpy.data.objects}
    bpy.ops.wm.obj_import(filepath=str(obj_path), forward_axis="NEGATIVE_Z", up_axis="Y")
    imported = [obj for obj in bpy.data.objects if obj.name not in existing_names and obj.type == "MESH"]
    if not imported:
        raise RuntimeError(f"No object imported from {obj_path}")
    return imported


def join_objects(objects, name: str):
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


def assign_head_weight(obj, armature_obj, bone_name: str = "head"):
    ensure_object_mode()
    for modifier in list(obj.modifiers):
        if modifier.type == "ARMATURE":
            obj.modifiers.remove(modifier)
    obj.vertex_groups.clear()
    vertex_group = obj.vertex_groups.new(name=bone_name)
    vertex_group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = armature_obj
    obj.parent = armature_obj
    obj.parent_type = "OBJECT"


def apply_style_transform(obj, hair_style: str):
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box] if obj.bound_box else []
    if not bbox:
        return

    min_x = min(corner.x for corner in bbox)
    max_x = max(corner.x for corner in bbox)
    min_z = min(corner.z for corner in bbox)
    max_z = max(corner.z for corner in bbox)
    center_x = (min_x + max_x) * 0.5
    half_x = max((max_x - min_x) * 0.5, 0.0001)
    range_z = max(max_z - min_z, 0.0001)

    open_face_amount = {
        "bob01": 0.12,
        "bob02": 0.08,
        "long01": 0.09,
        "braid01": 0.05,
        "short04": 0.04,
    }.get(hair_style, 0.0)

    if open_face_amount > 0:
        for vertex in obj.data.vertices:
            world_co = obj.matrix_world @ vertex.co
            x_norm = (world_co.x - center_x) / half_x
            z_norm = (world_co.z - min_z) / range_z
            crown = max(0.0, min(1.0, (z_norm - 0.46) / 0.54))
            center = max(0.0, 1.0 - min(1.0, abs(x_norm) / 0.32))
            influence = (crown**1.35) * center
            if influence <= 0:
                continue
            direction = 1.0 if x_norm > 0 else -1.0
            if abs(x_norm) < 0.01:
                direction = 1.0 if vertex.index % 2 == 0 else -1.0
            vertex.co.x += direction * open_face_amount * influence * half_x
            vertex.co.z += influence * range_z * 0.01

    style_transforms = {
        "bob01": {"location": (0.0, -0.018, 0.012), "scale": (1.05, 0.97, 1.03)},
        "bob02": {"location": (0.0, -0.016, 0.014), "scale": (1.04, 0.98, 1.04)},
        "long01": {"location": (0.0, -0.022, 0.01), "scale": (1.02, 0.98, 1.02)},
        "braid01": {"location": (0.0, -0.012, 0.01), "scale": (1.02, 0.98, 1.02)},
        "short04": {"location": (0.0, -0.01, 0.018), "scale": (1.03, 0.98, 1.02)},
    }.get(hair_style)

    if style_transforms:
        obj.location.x += style_transforms["location"][0]
        obj.location.y += style_transforms["location"][1]
        obj.location.z += style_transforms["location"][2]
        obj.scale.x *= style_transforms["scale"][0]
        obj.scale.y *= style_transforms["scale"][1]
        obj.scale.z *= style_transforms["scale"][2]


def build_hair(collection, armature_obj, hair_style: str, variant_id: str, hair_color: str, mpfb_data_dir: Path | None):
    mpfb_data = (
        mpfb_data_dir.resolve()
        if mpfb_data_dir
        else Path.home() / "Library/Application Support/Blender/4.4/extensions/.user/src/mpfb/data"
    )
    hair_dir = mpfb_data / "hair" / hair_style
    obj_path = hair_dir / f"{hair_style}.obj"
    mhmat_path = hair_dir / f"{hair_style}.mhmat"
    if not obj_path.exists():
        raise RuntimeError(f"Missing hair OBJ: {obj_path}")

    imported_objects = import_hair_obj(obj_path)
    joined = join_objects(imported_objects, f"FS.Hair.{hair_style}")
    joined.data.materials.clear()
    joined.data.materials.append(
        create_hair_material(
            f"FS_Hair_{hair_style}",
            parse_hex_color(hair_color),
            parse_diffuse_texture(mhmat_path),
        )
    )
    joined.rotation_euler = (0.0, 0.0, 0.0)
    joined.scale = (1.0, 1.0, 1.0)
    apply_style_transform(joined, hair_style)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    if joined.name not in {obj.name for obj in collection.objects}:
        collection.objects.link(joined)
    assign_head_weight(joined, armature_obj)
    return [joined]


def collect_summary(armature_obj, hair_objects, output_blend, output_glb, hair_style, variant_id):
    return {
        "schemaVersion": AUTHORING_SUMMARY_SCHEMA_VERSION,
        "authoringSource": "mpfb2",
        "kind": "hair",
        "variantId": variant_id,
        "hairStyle": hair_style,
        "armature": armature_obj.name,
        "objects": [
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            }
            for obj in hair_objects
        ],
        "outputBlend": to_repo_relative(output_blend),
        "outputGlb": to_repo_relative(output_glb),
    }


def export_selected_glb(filepath: Path, armature_obj, hair_objects):
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    armature_obj.select_set(True)
    for obj in hair_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=False,
    )


def main():
    args = parse_args()
    ensure_object_mode()
    armature_obj = get_armature()
    collection = ensure_collection("FS_RuntimeHair")
    clear_previous("FS.Hair.")

    output_blend = Path(args.output_blend)
    output_glb = Path(args.output_glb)
    summary_json = Path(args.summary_json)
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    summary_json.parent.mkdir(parents=True, exist_ok=True)

    mpfb_data_dir = Path(args.mpfb_data_dir) if args.mpfb_data_dir else None
    hair_objects = build_hair(collection, armature_obj, args.hair_style, args.variant_id, args.hair_color, mpfb_data_dir)

    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    export_selected_glb(output_glb, armature_obj, hair_objects)

    summary = collect_summary(armature_obj, hair_objects, output_blend, output_glb, args.hair_style, args.variant_id)
    summary_json.write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
