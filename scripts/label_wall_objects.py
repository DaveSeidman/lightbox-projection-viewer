from pathlib import Path

import bpy


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
BLEND_PATH = BASE_DIR / "240_west_37th.blend"
PUBLIC_GLB_PATH = BASE_DIR / "public" / "240_west_37th_projection.glb"
DIST_GLB_PATH = BASE_DIR / "dist" / "240_west_37th_projection.glb"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    wall_objects = []
    floor_object = None

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if obj.name.startswith("projection_wall_"):
            continue
        if obj.name.lower() == "floor":
            floor_object = obj
            continue

        dims = sorted((abs(value) for value in obj.dimensions))
        x_size, y_size, z_size = (abs(value) for value in obj.dimensions)

        if floor_object is None and z_size < 1.25 and x_size > 20 and y_size > 10 and obj.location.z < 0.25:
            floor_object = obj
            continue

        is_vertical_wall = z_size >= 6 and dims[0] <= 2.4 and dims[2] >= 3.0
        if is_vertical_wall:
            wall_objects.append(obj)

    if floor_object:
        rename_object(floor_object, "floor")

    wall_objects.sort(key=lambda obj: (round(obj.location.y, 3), round(obj.location.x, 3), obj.name))
    for index, obj in enumerate(wall_objects, start=1):
        rename_object(obj, f"wall_{index:02d}")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(PUBLIC_GLB_PATH)
    export_glb(DIST_GLB_PATH)

    print(f"saved {BLEND_PATH}")
    print(f"exported {PUBLIC_GLB_PATH}")
    print(f"exported {DIST_GLB_PATH}")
    print(f"labeled {len(wall_objects)} wall objects")
    if floor_object:
        print("labeled floor")


def rename_object(obj, name):
    existing = bpy.data.objects.get(name)
    if existing and existing != obj:
        existing.name = f"{name}_previous"

    obj.name = name
    obj.data.name = f"{name}_mesh"


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
