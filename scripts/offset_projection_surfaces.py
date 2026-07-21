from pathlib import Path

import bpy
from mathutils import Vector


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
BLEND_PATH = BASE_DIR / "240_west_37th.blend"
PUBLIC_GLB_PATH = BASE_DIR / "public" / "240_west_37th_projection.glb"
DIST_GLB_PATH = BASE_DIR / "dist" / "240_west_37th_projection.glb"
OFFSET_DISTANCE = 0.10
OFFSET_PROP = "lightbox_projection_surface_offset"
OFFSET_VECTOR_PROP = "lightbox_projection_surface_offset_vector"
VIEW_CLIP_START = 0.2
VIEW_CLIP_END = 250.0

TARGET_OFFSETS = {
    "projection_wall_y_positive": Vector((0.0, OFFSET_DISTANCE, 0.0)),
    "projection_wall_y_negative": Vector((0.0, OFFSET_DISTANCE, 0.0)),
    "projection_wall_x_positive": Vector((-OFFSET_DISTANCE, 0.0, 0.0)),
    "projection_wall_x_negative": Vector((-OFFSET_DISTANCE, 0.0, 0.0)),
}

LEGACY_DIRECTIONS = {
    "projection_wall_y_positive": Vector((0.0, -1.0, 0.0)),
    "projection_wall_y_negative": Vector((0.0, 1.0, 0.0)),
    "projection_wall_x_positive": Vector((-1.0, 0.0, 0.0)),
    "projection_wall_x_negative": Vector((1.0, 0.0, 0.0)),
}


def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    moved = []
    for name, target_offset in TARGET_OFFSETS.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            print(f"missing {name}")
            continue

        current_offset = get_current_offset(obj, name)
        delta = target_offset - current_offset
        if delta.length < 0.0001:
            print(f"already offset {name}")
            continue

        obj.location += delta
        obj[OFFSET_PROP] = OFFSET_DISTANCE
        obj[OFFSET_VECTOR_PROP] = list(target_offset)
        moved.append(name)
        print(
            f"offset {name}: "
            f"{tuple(round(value, 4) for value in current_offset)} -> "
            f"{tuple(round(value, 4) for value in target_offset)}"
        )

    for camera in bpy.data.cameras:
        camera.clip_start = VIEW_CLIP_START
        camera.clip_end = VIEW_CLIP_END

    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.clip_start = VIEW_CLIP_START
                    space.clip_end = VIEW_CLIP_END

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(PUBLIC_GLB_PATH),
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_animations=True,
    )
    bpy.ops.export_scene.gltf(
        filepath=str(DIST_GLB_PATH),
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_animations=True,
    )

    print(f"saved {BLEND_PATH}")
    print(f"exported {PUBLIC_GLB_PATH}")
    print(f"exported {DIST_GLB_PATH}")
    print(f"moved {len(moved)} projection surfaces")
    print(f"viewport/camera clipping {VIEW_CLIP_START}..{VIEW_CLIP_END}")


def get_current_offset(obj, name):
    vector = obj.get(OFFSET_VECTOR_PROP)
    if vector is not None and len(vector) == 3:
        return Vector((float(vector[0]), float(vector[1]), float(vector[2])))

    legacy_offset = float(obj.get(OFFSET_PROP, 0.0))
    return LEGACY_DIRECTIONS[name] * legacy_offset


if __name__ == "__main__":
    main()
