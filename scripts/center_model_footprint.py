from pathlib import Path

import bpy
from mathutils import Vector


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
BLEND_PATH = BASE_DIR / "etc" / "240_west_37th.blend"
PUBLIC_GLB_PATH = BASE_DIR / "public" / "240_west_37th_projection.glb"
DIST_GLB_PATH = BASE_DIR / "dist" / "240_west_37th_projection.glb"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    min_x = min((obj.matrix_world @ Vector(corner)).x for obj in mesh_objects for corner in obj.bound_box)
    max_x = max((obj.matrix_world @ Vector(corner)).x for obj in mesh_objects for corner in obj.bound_box)
    min_y = min((obj.matrix_world @ Vector(corner)).y for obj in mesh_objects for corner in obj.bound_box)
    max_y = max((obj.matrix_world @ Vector(corner)).y for obj in mesh_objects for corner in obj.bound_box)

    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    delta = Vector((-center_x, -center_y, 0.0))

    for obj in mesh_objects:
        obj.location += delta

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(PUBLIC_GLB_PATH)
    export_glb(DIST_GLB_PATH)

    print(f"center before: ({center_x:.4f}, {center_y:.4f})")
    print(f"applied delta: ({delta.x:.4f}, {delta.y:.4f}, {delta.z:.4f})")
    print(f"saved {BLEND_PATH}")
    print(f"exported {PUBLIC_GLB_PATH}")
    print(f"exported {DIST_GLB_PATH}")


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
