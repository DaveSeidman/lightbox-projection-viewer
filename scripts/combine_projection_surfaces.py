from pathlib import Path

import bpy
from mathutils import Vector


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
BLEND_PATH = BASE_DIR / "etc" / "240_west_37th.blend"
PUBLIC_GLB_PATH = BASE_DIR / "public" / "240_west_37th_projection.glb"
DIST_GLB_PATH = BASE_DIR / "dist" / "240_west_37th_projection.glb"

PROJECTION_ORDER = [
    "projection_wall_y_positive",
    "projection_wall_x_positive",
    "projection_wall_y_negative",
    "projection_wall_x_negative",
]
COMBINED_NAME = "projection_wall_360"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    source_objects = [bpy.data.objects.get(name) for name in PROJECTION_ORDER]
    missing = [name for name, obj in zip(PROJECTION_ORDER, source_objects) if obj is None]
    if missing:
        raise RuntimeError(f"Missing projection objects: {', '.join(missing)}")

    surfaces = [surface_from_object(obj) for obj in source_objects]
    total_width = sum(surface["width"] for surface in surfaces)
    if total_width <= 0:
        raise RuntimeError("Projection surfaces have no measurable width")

    remove_existing_combined()

    vertices = []
    faces = []
    uvs = []
    cursor = 0.0

    for surface in surfaces:
        u0 = cursor / total_width
        u1 = (cursor + surface["width"]) / total_width
        cursor += surface["width"]

        face_start = len(vertices)
        vertices.extend(surface["vertices"])
        faces.append((face_start, face_start + 1, face_start + 2, face_start + 3))
        uvs.extend(((u0, 0.0), (u1, 0.0), (u1, 1.0), (u0, 1.0)))

    mesh = bpy.data.meshes.new(f"{COMBINED_NAME}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
      for loop_index in polygon.loop_indices:
          uv_layer.data[loop_index].uv = uvs[loop_index]

    combined = bpy.data.objects.new(COMBINED_NAME, mesh)
    bpy.context.collection.objects.link(combined)
    combined.data.materials.append(projection_material())

    for obj in source_objects:
        bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(PUBLIC_GLB_PATH)
    export_glb(DIST_GLB_PATH)

    print(f"created {COMBINED_NAME} from {len(source_objects)} surfaces")
    print(f"total unwrap width: {total_width:.4f}")
    print(f"saved {BLEND_PATH}")
    print(f"exported {PUBLIC_GLB_PATH}")
    print(f"exported {DIST_GLB_PATH}")


def surface_from_object(obj):
    corners = world_bbox_corners(obj)
    min_x = min(point.x for point in corners)
    max_x = max(point.x for point in corners)
    min_y = min(point.y for point in corners)
    max_y = max(point.y for point in corners)
    min_z = min(point.z for point in corners)
    max_z = max(point.z for point in corners)
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2

    if obj.name.endswith("y_positive"):
        plane_y = min_y
        vertices = [
            (min_x, plane_y, min_z),
            (max_x, plane_y, min_z),
            (max_x, plane_y, max_z),
            (min_x, plane_y, max_z),
        ]
        width = max_x - min_x
    elif obj.name.endswith("x_positive"):
        plane_x = min_x
        vertices = [
            (plane_x, max_y, min_z),
            (plane_x, min_y, min_z),
            (plane_x, min_y, max_z),
            (plane_x, max_y, max_z),
        ]
        width = max_y - min_y
    elif obj.name.endswith("y_negative"):
        plane_y = max_y
        vertices = [
            (max_x, plane_y, min_z),
            (min_x, plane_y, min_z),
            (min_x, plane_y, max_z),
            (max_x, plane_y, max_z),
        ]
        width = max_x - min_x
    elif obj.name.endswith("x_negative"):
        plane_x = max_x
        vertices = [
            (plane_x, min_y, min_z),
            (plane_x, max_y, min_z),
            (plane_x, max_y, max_z),
            (plane_x, min_y, max_z),
        ]
        width = max_y - min_y
    else:
        raise RuntimeError(f"Unexpected projection object name: {obj.name}")

    return {
        "name": obj.name,
        "center": (center_x, center_y),
        "vertices": vertices,
        "width": abs(width),
    }


def world_bbox_corners(obj):
    return [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]


def remove_existing_combined():
    existing = bpy.data.objects.get(COMBINED_NAME)
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)


def projection_material():
    material = bpy.data.materials.get("Projection_360_Surface")
    if material is None:
        material = bpy.data.materials.new("Projection_360_Surface")
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    return material


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_animations=True,
    )


if __name__ == "__main__":
    main()
