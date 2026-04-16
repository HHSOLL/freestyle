#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import bpy


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
    return parser.parse_args(argv)


def ensure_object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


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


def build_hair(collection, armature_obj, hair_style: str, variant_id: str, hair_color: str):
    mpfb_data = Path.home() / "Library/Application Support/Blender/4.4/extensions/.user/src/mpfb/data"
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
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    if joined.name not in {obj.name for obj in collection.objects}:
        collection.objects.link(joined)
    assign_head_weight(joined, armature_obj)
    return [joined]


def collect_summary(armature_obj, hair_objects, output_blend, output_glb, hair_style, variant_id):
    return {
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
        "outputBlend": str(output_blend),
        "outputGlb": str(output_glb),
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

    hair_objects = build_hair(collection, armature_obj, args.hair_style, args.variant_id, args.hair_color)

    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    export_selected_glb(output_glb, armature_obj, hair_objects)

    summary = collect_summary(armature_obj, hair_objects, output_blend, output_glb, args.hair_style, args.variant_id)
    summary_json.write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
