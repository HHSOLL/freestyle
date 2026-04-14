#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build a runtime-ready MPFB accessory GLB using an existing avatar .blend as the fit target."
    )
    argv = bpy.app.driver_namespace.get("argv_override")
    if argv is None:
        import sys

        argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser.add_argument("--accessory-type", required=True, choices=["bucket_hat", "oval_shades"])
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--summary-json", required=True)
    parser.add_argument("--variant-id", required=True, choices=["female-base", "male-base"])
    return parser.parse_args(argv)


def ensure_object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def create_material(name: str, rgba, roughness: float, metallic: float = 0.0):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    principled = material.node_tree.nodes["Principled BSDF"]
    principled.inputs["Base Color"].default_value = rgba
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    if rgba[3] < 0.999:
        principled.inputs["Alpha"].default_value = rgba[3]
        material.blend_method = "BLEND"
        material.shadow_method = "HASHED"
    return material


def ensure_collection(name: str):
    collection = bpy.data.collections.get(name)
    if collection:
        return collection
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def get_armature():
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError("No armature found in the loaded avatar blend")
    return armatures[0]


def bone_head_tail_world(armature_obj, bone_name: str):
    bone = armature_obj.data.bones.get(bone_name)
    if bone is None:
        raise RuntimeError(f"Missing bone '{bone_name}'")
    matrix = armature_obj.matrix_world
    return matrix @ bone.head_local, matrix @ bone.tail_local


def clear_previous_accessories(prefix: str):
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def assign_head_weight(obj, armature_obj, bone_name: str = "head"):
    ensure_object_mode()
    vertex_group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
    vertex_group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = armature_obj
    obj.parent = armature_obj
    obj.parent_type = "OBJECT"


def collect_summary(armature_obj, accessory_objects, output_blend, output_glb, accessory_type, variant_id):
    return {
        "variantId": variant_id,
        "accessoryType": accessory_type,
        "armature": armature_obj.name,
        "objects": [
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            }
            for obj in accessory_objects
        ],
        "outputBlend": str(output_blend),
        "outputGlb": str(output_glb),
    }


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


def add_bucket_hat(collection, armature_obj, variant_id: str):
    head_head, head_tail = bone_head_tail_world(armature_obj, "head")
    center = (head_head + head_tail) * 0.5
    head_length = (head_tail - head_head).length
    hat_raise = 0.055 if variant_id == "female-base" else 0.048
    crown_height = head_length * (0.72 if variant_id == "female-base" else 0.68)
    crown_radius = head_length * (0.58 if variant_id == "female-base" else 0.6)
    brim_radius = crown_radius * 1.36

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=crown_radius,
        depth=crown_height,
        location=(center.x, center.y - 0.006, center.z + hat_raise),
    )
    crown = bpy.context.active_object
    crown.name = "FS.Accessory.BucketHat.Crown"
    crown.data.materials.append(create_material("FS_BucketHat_Twill", (0.72, 0.70, 0.66, 1.0), 0.9))

    crown.select_set(True)
    bpy.context.view_layer.objects.active = crown
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_face_by_sides(number=48, type="EQUAL", extend=False)
    bpy.ops.mesh.select_nth(offset=1)
    bpy.ops.transform.resize(value=(0.86, 0.86, 0.92))
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=56,
        radius=brim_radius,
        depth=head_length * 0.05,
        location=(center.x, center.y - 0.004, center.z + hat_raise - crown_height * 0.48),
    )
    brim = bpy.context.active_object
    brim.name = "FS.Accessory.BucketHat.Brim"
    brim.scale.z = 0.36
    brim.data.materials.append(create_material("FS_BucketHat_Brim", (0.78, 0.76, 0.72, 1.0), 0.92))

    joined = join_objects([crown, brim], "FS.Accessory.BucketHat")
    modifier = joined.modifiers.new(name="Bevel", type="BEVEL")
    modifier.width = 0.0028
    modifier.segments = 2
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if joined.name not in {obj.name for obj in collection.objects}:
        collection.objects.link(joined)
    assign_head_weight(joined, armature_obj)
    return [joined]


def add_oval_shades(collection, armature_obj, variant_id: str):
    head_head, head_tail = bone_head_tail_world(armature_obj, "head")
    center = (head_head + head_tail) * 0.5
    head_length = (head_tail - head_head).length
    frame_y = center.y - (0.094 if variant_id == "female-base" else 0.096)
    frame_z = center.z - 0.002
    lens_offset = head_length * 0.34
    lens_scale = head_length * 0.18
    temple_span = head_length * 0.92

    objects = []
    frame_material = create_material("FS_Shades_Frame", (0.13, 0.15, 0.18, 1.0), 0.42, 0.08)
    lens_material = create_material("FS_Shades_Lens", (0.18, 0.22, 0.28, 1.0), 0.12, 0.0)

    for direction, name in [(-1, "LeftLens"), (1, "RightLens")]:
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=32,
            ring_count=20,
            radius=lens_scale,
            location=(center.x + direction * lens_offset, frame_y, frame_z),
        )
        lens = bpy.context.active_object
        lens.name = f"FS.Accessory.OvalShades.{name}"
        lens.scale = (0.88, 0.22, 0.72)
        lens.data.materials.append(lens_material if "Lens" in name else frame_material)
        objects.append(lens)

    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(center.x, frame_y + 0.004, frame_z),
    )
    bridge = bpy.context.active_object
    bridge.name = "FS.Accessory.OvalShades.Bridge"
    bridge.scale = (lens_scale * 0.56, lens_scale * 0.12, lens_scale * 0.12)
    bridge.data.materials.append(frame_material)
    objects.append(bridge)

    for direction, name in [(-1, "LeftTemple"), (1, "RightTemple")]:
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(center.x + direction * temple_span * 0.5, frame_y + head_length * 0.08, frame_z - head_length * 0.05),
        )
        temple = bpy.context.active_object
        temple.name = f"FS.Accessory.OvalShades.{name}"
        temple.scale = (head_length * 0.02, head_length * 0.28, head_length * 0.02)
        temple.rotation_euler[2] = direction * 0.12
        temple.rotation_euler[0] = 0.18
        temple.data.materials.append(frame_material)
        objects.append(temple)

    joined = join_objects(objects, "FS.Accessory.OvalShades")
    modifier = joined.modifiers.new(name="Bevel", type="BEVEL")
    modifier.width = 0.0018
    modifier.segments = 2
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if joined.name not in {obj.name for obj in collection.objects}:
        collection.objects.link(joined)
    assign_head_weight(joined, armature_obj)
    return [joined]


def export_selected_glb(filepath: Path, armature_obj, accessory_objects):
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    armature_obj.select_set(True)
    for obj in accessory_objects:
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
    collection = ensure_collection("FS_RuntimeAccessories")

    clear_previous_accessories("FS.Accessory.")

    if args.accessory_type == "bucket_hat":
        accessory_objects = add_bucket_hat(collection, armature_obj, args.variant_id)
    elif args.accessory_type == "oval_shades":
        accessory_objects = add_oval_shades(collection, armature_obj, args.variant_id)
    else:
        raise RuntimeError(f"Unsupported accessory type {args.accessory_type}")

    output_blend = Path(args.output_blend).resolve()
    output_glb = Path(args.output_glb).resolve()
    summary_json = Path(args.summary_json).resolve()
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    summary_json.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend), copy=True)
    export_selected_glb(output_glb, armature_obj, accessory_objects)

    summary = collect_summary(armature_obj, accessory_objects, output_blend, output_glb, args.accessory_type, args.variant_id)
    summary_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
