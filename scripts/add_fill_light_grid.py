from pathlib import Path

import bpy
from mathutils import Vector


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
BLEND_PATH = BASE_DIR / "etc" / "240_west_37th.blend"
PUBLIC_GLB_PATH = BASE_DIR / "public" / "240_west_37th_projection.glb"
DIST_GLB_PATH = BASE_DIR / "dist" / "240_west_37th_projection.glb"
COLLECTION_NAME = "generated_dim_fill_lights"
LIGHT_PREFIX = "fill_light_grid_"
OUTER_LIGHT_NAME = "outer_room_fill_light"
MAIN_GRID_COLUMNS = 8
MAIN_GRID_ROWS = 3


def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    remove_previous_lights()

    floor = find_floor()
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    bounds = world_bounds(floor) if floor else combined_bounds(meshes)
    projection = bpy.data.objects.get("projection_walls")

    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)

    ceiling_z = max((world_bounds(obj)[1].z for obj in meshes if is_wall_like(obj)), default=bounds[1].z)
    light_z = min(ceiling_z - 1.2, max(bounds[0].z + 3.2, 11.8))
    points = main_projection_room_grid(projection, light_z)

    for index, point in enumerate(points, start=1):
        create_point_light(
            collection,
            name=f"{LIGHT_PREFIX}{index:02d}",
            location=point,
            energy=0.08,
            range_distance=7.5,
            color=(1.0, 0.965, 0.9) if index % 2 else (0.9, 0.94, 1.0),
            soft_size=5.5,
        )

    outer_light_location = outer_room_point(bounds, projection, light_z)
    create_point_light(
        collection,
        name=OUTER_LIGHT_NAME,
        location=outer_light_location,
        energy=0.14,
        range_distance=9.0,
        color=(0.92, 0.95, 1.0),
        soft_size=7.0,
    )

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(PUBLIC_GLB_PATH)
    export_glb(DIST_GLB_PATH)

    print(f"saved {BLEND_PATH}")
    print(f"exported {PUBLIC_GLB_PATH}")
    print(f"exported {DIST_GLB_PATH}")
    print(f"added {len(points)} main-space lights and 1 outer-space light at z={light_z:.2f}")


def remove_previous_lights():
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT" and (
            obj.name.startswith(LIGHT_PREFIX)
            or obj.name.startswith(OUTER_LIGHT_NAME)
            or obj.get("generated_by") == "scripts/add_fill_light_grid.py"
        ):
            bpy.data.objects.remove(obj, do_unlink=True)

    for light in list(bpy.data.lights):
        if light.name.startswith(LIGHT_PREFIX) or light.name.startswith(OUTER_LIGHT_NAME):
            bpy.data.lights.remove(light)

    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection:
        bpy.data.collections.remove(collection)


def find_floor():
    named_floor = bpy.data.objects.get("floor")
    if named_floor and named_floor.type == "MESH":
        return named_floor

    candidates = []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        min_corner, max_corner = world_bounds(obj)
        size = max_corner - min_corner
        if size.z < 1.5 and size.x > 8 and size.y > 8:
            candidates.append((size.x * size.y, obj))

    return max(candidates, default=(0, None))[1]


def is_wall_like(obj):
    if obj.name == "floor":
        return False

    min_corner, max_corner = world_bounds(obj)
    size = max_corner - min_corner
    return size.z > 2.5 and max(size.x, size.y) > 1.0


def world_bounds(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_corner = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    max_corner = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return min_corner, max_corner


def combined_bounds(objects):
    bounds = [world_bounds(obj) for obj in objects]
    min_corner = Vector((
        min(item[0].x for item in bounds),
        min(item[0].y for item in bounds),
        min(item[0].z for item in bounds),
    ))
    max_corner = Vector((
        max(item[1].x for item in bounds),
        max(item[1].y for item in bounds),
        max(item[1].z for item in bounds),
    ))
    return min_corner, max_corner


def main_projection_room_grid(projection, z):
    if projection:
        min_corner, max_corner = world_bounds(projection)
        x_min = min_corner.x + 3.2
        x_max = max_corner.x - 3.2
        y_min = min_corner.y + 3.0
        y_max = max_corner.y - 3.0
    else:
        x_min, x_max = -19.5, 18.5
        y_min, y_max = -8.5, 8.5

    points = []

    for row in range(MAIN_GRID_ROWS):
        y = y_min + (y_max - y_min) * row / max(MAIN_GRID_ROWS - 1, 1)
        for column in range(MAIN_GRID_COLUMNS):
            x = x_min + (x_max - x_min) * column / max(MAIN_GRID_COLUMNS - 1, 1)
            points.append(Vector((x, y, z)))

    return points


def outer_room_point(bounds, projection, z):
    min_corner, max_corner = bounds
    if projection:
        projection_min, projection_max = world_bounds(projection)
        x = projection_max.x + (max_corner.x - projection_max.x) * 0.55
    else:
        x = max_corner.x - 8.0

    y = (min_corner.y + max_corner.y) * 0.5
    return Vector((x, y, z))


def create_point_light(collection, name, location, energy, range_distance, color, soft_size):
    light_data = bpy.data.lights.new(name, type="POINT")
    light_data.energy = energy
    light_data.color = color
    light_data.shadow_soft_size = soft_size
    light_data.use_shadow = False
    light_data.use_custom_distance = True
    light_data.cutoff_distance = range_distance
    light = bpy.data.objects.new(light_data.name, light_data)
    light.location = location
    light["generated_by"] = "scripts/add_fill_light_grid.py"
    collection.objects.link(light)
    return light


def export_glb(path):
    kwargs = {
        "filepath": str(path),
        "export_format": "GLB",
        "use_selection": False,
        "export_apply": False,
        "export_animations": True,
    }
    if "export_lights" in bpy.ops.export_scene.gltf.get_rna_type().properties:
        kwargs["export_lights"] = True

    bpy.ops.export_scene.gltf(**kwargs)


if __name__ == "__main__":
    main()
