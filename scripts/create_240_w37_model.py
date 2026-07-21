import math
from pathlib import Path

import bpy
from mathutils import Vector


BASE_DIR = Path("/Users/daveseidman/Documents/personal/lightbox/internal/3d-model")
OUTPUT_BLEND = BASE_DIR / "240_west_37th_side_by_side_model.blend"
WALL_JOINT_GAP = 0.035
FLOOR_Z = -0.18
FLOOR_THICKNESS = 0.10
STANDARD_DOOR_HEIGHT = 7.0
SCALE_PERSON_HEIGHT = 5.75

LEVELS = {
    "Cellar": {
        "label": "CELLAR",
        "base": (0.0, 0.0),
        "length": 100.0,
        "width": 24.0,
        "wall_height": 9.0,
        "image_pattern": "*2.23.26*.png",
    },
    "First_Floor": {
        "label": "FIRST FLOOR",
        "base": (112.0, 0.0),
        "length": 96.0,
        "width": 24.0,
        "wall_height": 15.5,
        "image_pattern": "*2.23.34*.png",
    },
    "Mezzanine": {
        "label": "MEZZANINE",
        "base": (224.0, 0.0),
        "length": 96.0,
        "width": 24.0,
        "wall_height": 8.6,
        "image_pattern": "*2.23.41*.png",
    },
}


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablock in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for item in list(datablock):
            if item.users == 0:
                datablock.remove(item)


def get_or_create_collection(name, parent=None):
    existing = bpy.data.collections.get(name)
    if existing:
        return existing
    coll = bpy.data.collections.new(name)
    if parent:
        parent.children.link(coll)
    else:
        bpy.context.scene.collection.children.link(coll)
    return coll


def move_to_collection(obj, coll):
    for user_coll in list(obj.users_collection):
        user_coll.objects.unlink(obj)
    coll.objects.link(obj)


def make_mat(name, color, alpha=1.0, roughness=0.65, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
        mat.show_transparent_back = True
    return mat


def make_emission_mat(name, color, strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new(type="ShaderNodeOutputMaterial")
    emission = nodes.new(type="ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def make_image_mat(name, image_path, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (1.0, 1.0, 1.0, alpha)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    image = bpy.data.images.load(str(image_path), check_existing=True)
    texture = nodes.new(type="ShaderNodeTexImage")
    texture.image = image
    if bsdf:
        mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.show_transparent_back = True
    return mat


def assign_mat(obj, mat):
    obj.data.materials.append(mat)


def add_box(name, loc, dims, mat, coll, rotation_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    obj.dimensions = dims
    obj.rotation_euler[2] = rotation_z
    assign_mat(obj, mat)
    move_to_collection(obj, coll)
    return obj


def add_cylinder(name, loc, radius, depth, mat, coll, vertices=8, rotation_z=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    obj.rotation_euler[2] = rotation_z
    assign_mat(obj, mat)
    move_to_collection(obj, coll)
    return obj


def add_uv_sphere(name, loc, radius, mat, coll, segments=8, ring_count=4):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=ring_count, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    assign_mat(obj, mat)
    move_to_collection(obj, coll)
    return obj


def add_wall(level_name, collection_key, name, x1, y1, x2, y2, height=None, thickness=0.45, mat=None):
    level = LEVELS[level_name]
    bx, by = level["base"]
    h = height or level["wall_height"]
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length <= 0:
        return None
    if length > WALL_JOINT_GAP * 2.0:
        ux = dx / length
        uy = dy / length
        x1 += ux * WALL_JOINT_GAP
        y1 += uy * WALL_JOINT_GAP
        x2 -= ux * WALL_JOINT_GAP
        y2 -= uy * WALL_JOINT_GAP
        dx = x2 - x1
        dy = y2 - y1
        length = math.hypot(dx, dy)
    cx = bx + (x1 + x2) / 2.0
    cy = by + (y1 + y2) / 2.0
    angle = math.atan2(dy, dx)
    coll = LEVEL_COLLECTIONS[level_name][collection_key]
    wall_mat = mat or MATERIALS["wall_interior"]
    return add_box(
        name,
        (cx, cy, h / 2.0),
        (length, thickness, h),
        wall_mat,
        coll,
        rotation_z=angle,
    )


def add_rect(level_name, collection_key, name, x, y, w, d, z, h, mat, rotation_z=0.0):
    bx, by = LEVELS[level_name]["base"]
    return add_box(
        name,
        (bx + x + w / 2.0, by + y + d / 2.0, z + h / 2.0),
        (w, d, h),
        mat,
        LEVEL_COLLECTIONS[level_name][collection_key],
        rotation_z=rotation_z,
    )


def add_plane_rect(level_name, collection_key, name, x, y, w, d, z, mat):
    bx, by = LEVELS[level_name]["base"]
    verts = [
        (bx + x, by + y, z),
        (bx + x + w, by + y, z),
        (bx + x + w, by + y + d, z),
        (bx + x, by + y + d, z),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_mat(obj, mat)
    LEVEL_COLLECTIONS[level_name][collection_key].objects.link(obj)
    return obj


def add_reference_plan(level_name):
    level = LEVELS[level_name]
    matches = sorted(BASE_DIR.glob(level["image_pattern"]))
    if not matches:
        return None
    image_path = matches[0]
    mat = make_image_mat(f"Mat_Reference_{level_name}", image_path)
    obj = add_plane_rect(
        level_name,
        "Reference_Plans",
        f"Reference_{level_name}_Source_Plan",
        0.0,
        -1.8,
        level["length"],
        level["width"] + 3.6,
        -0.035,
        mat,
    )
    uv = obj.data.uv_layers.new(name="UVMap")
    uv_values = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
    for loop, uv_val in zip(uv.data, uv_values):
        loop.uv = uv_val
    obj["source_image"] = str(image_path)
    obj.hide_select = True
    obj.hide_viewport = False
    obj.hide_render = False
    return obj


def add_text(level_name, collection_key, name, text, x, y, z=0.12, size=1.0, rotation_z=0.0, mat=None):
    bx, by = LEVELS[level_name]["base"]
    bpy.ops.object.text_add(location=(bx + x, by + y, z), rotation=(0.0, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Curve"
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.01
    assign_mat(obj, mat or MATERIALS["label"])
    move_to_collection(obj, LEVEL_COLLECTIONS[level_name][collection_key])
    return obj


def add_curve_polyline(name, points, mat, coll, bevel_depth=0.025):
    curve = bpy.data.curves.new(f"{name}_Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 2
    poly = curve.splines.new("POLY")
    poly.points.add(len(points) - 1)
    for point, co in zip(poly.points, points):
        point.co = (co[0], co[1], co[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    assign_mat(obj, mat)
    coll.objects.link(obj)
    return obj


def add_arc(level_name, collection_key, name, cx, cy, radius, start_deg, end_deg, z=0.16):
    bx, by = LEVELS[level_name]["base"]
    steps = 18
    start = math.radians(start_deg)
    end = math.radians(end_deg)
    points = []
    for i in range(steps + 1):
        t = start + (end - start) * (i / steps)
        points.append((bx + cx + math.cos(t) * radius, by + cy + math.sin(t) * radius, z))
    return add_curve_polyline(
        name,
        points,
        MATERIALS["door_swing"],
        LEVEL_COLLECTIONS[level_name][collection_key],
        bevel_depth=0.018,
    )


def add_door(level_name, name, x, y, width, orientation, hinge, start_deg, end_deg):
    bx, by = LEVELS[level_name]["base"]
    avg_angle = math.radians((start_deg + end_deg) / 2.0)
    offset = 0.38
    leaf_height = STANDARD_DOOR_HEIGHT
    if orientation == "horizontal":
        side = 1.0 if math.sin(avg_angle) >= 0.0 else -1.0
        yy = by + y + side * offset
        add_box(
            name,
            (bx + x, yy, leaf_height / 2.0),
            (width, 0.10, leaf_height),
            MATERIALS["door"],
            LEVEL_COLLECTIONS[level_name]["Doors"],
        )
    else:
        side = 1.0 if math.cos(avg_angle) >= 0.0 else -1.0
        xx = bx + x + side * offset
        add_box(
            name,
            (xx, by + y, leaf_height / 2.0),
            (0.10, width, leaf_height),
            MATERIALS["door"],
            LEVEL_COLLECTIONS[level_name]["Doors"],
        )
    add_arc(level_name, "Doors", f"{name}_Swing", hinge[0], hinge[1], width, start_deg, end_deg)


def add_window(level_name, name, x, y, width, orientation, sill=2.4, height=4.8):
    level = LEVELS[level_name]
    if orientation == "horizontal":
        y += 0.55 if y > level["width"] / 2.0 else -0.55
        return add_rect(
            level_name,
            "Windows_Glass",
            name,
            x - width / 2.0,
            y - 0.035,
            width,
            0.07,
            sill,
            height,
            MATERIALS["glass"],
        )
    x += 0.55 if x > level["length"] / 2.0 else -0.55
    return add_rect(
        level_name,
        "Windows_Glass",
        name,
        x - 0.035,
        y - width / 2.0,
        0.07,
        width,
        sill,
        height,
        MATERIALS["glass"],
    )


def add_guardrail(level_name, name, x1, y1, x2, y2):
    return add_wall(
        level_name,
        "Railings",
        name,
        x1,
        y1,
        x2,
        y2,
        height=3.4,
        thickness=0.13,
        mat=MATERIALS["rail"],
    )


def add_stairs(
    level_name,
    name,
    x,
    y,
    w,
    d,
    steps=13,
    direction="x",
    up_label="UP",
    total_rise=8.6,
    reverse_rise=False,
):
    stair_coll = LEVEL_COLLECTIONS[level_name]["Stairs"]
    step_height = total_rise / steps
    if direction == "x":
        tread_w = w / steps
        for i in range(steps):
            sx = x + i * tread_w
            step_z = (steps - i) * step_height if reverse_rise else (i + 1) * step_height
            add_rect(
                level_name,
                "Stairs",
                f"{name}_Tread_{i + 1:02d}",
                sx,
                y,
                tread_w * 0.92,
                d,
                0.0,
                step_z,
                MATERIALS["stair"],
            )
        add_text(level_name, "Labels", f"{name}_Direction_Label", up_label, x + w * 0.55, y + d * 0.52, z=0.23, size=0.85)
        bx, by = LEVELS[level_name]["base"]
        add_curve_polyline(
            f"{name}_Direction_Arrow",
            [(bx + x + w * 0.18, by + y + d * 0.50, 0.21), (bx + x + w * 0.82, by + y + d * 0.50, 0.21)],
            MATERIALS["label"],
            stair_coll,
            bevel_depth=0.03,
        )
    else:
        tread_d = d / steps
        for i in range(steps):
            sy = y + i * tread_d
            step_z = (steps - i) * step_height if reverse_rise else (i + 1) * step_height
            add_rect(
                level_name,
                "Stairs",
                f"{name}_Tread_{i + 1:02d}",
                x,
                sy,
                w,
                tread_d * 0.92,
                0.0,
                step_z,
                MATERIALS["stair"],
            )
        add_text(level_name, "Labels", f"{name}_Direction_Label", up_label, x + w * 0.50, y + d * 0.55, z=0.23, size=0.85, rotation_z=math.radians(90))


def add_wc_fixtures(level_name, prefix, x, y):
    add_rect(level_name, "Fixtures", f"{prefix}_Toilet_Block", x + 0.45, y + 0.55, 1.0, 1.25, 0.0, 0.55, MATERIALS["fixture"])
    add_rect(level_name, "Fixtures", f"{prefix}_Sink_Block", x + 2.15, y + 0.45, 1.15, 0.75, 0.0, 0.85, MATERIALS["fixture"])


def add_room_label(level_name, name, label, x, y, size=1.0, rot=0.0):
    add_text(level_name, "Labels", name, label, x, y, z=0.18, size=size, rotation_z=rot)


def add_low_poly_person(level_name, name, x, y, rotation_z=0.0, height=SCALE_PERSON_HEIGHT, show_marker=False):
    level = LEVELS[level_name]
    bx, by = level["base"]
    parent = LEVEL_COLLECTIONS[level_name]["Scale_Figures"]
    person_coll = get_or_create_collection(name, parent)

    def world(local_x, local_y, z):
        c = math.cos(rotation_z)
        s = math.sin(rotation_z)
        return (bx + x + local_x * c - local_y * s, by + y + local_x * s + local_y * c, z)

    clothes = MATERIALS["person_clothes_a"] if sum(ord(ch) for ch in name) % 2 == 0 else MATERIALS["person_clothes_b"]
    skin = MATERIALS["person_skin"]
    marker = MATERIALS["person_marker"]

    add_box(f"{name}_Left_Leg", world(-0.16, 0.0, 1.35), (0.16, 0.16, 2.70), clothes, person_coll, rotation_z)
    add_box(f"{name}_Right_Leg", world(0.16, 0.0, 1.35), (0.16, 0.16, 2.70), clothes, person_coll, rotation_z)
    add_box(f"{name}_Left_Foot", world(-0.16, -0.20, 0.07), (0.20, 0.48, 0.14), clothes, person_coll, rotation_z)
    add_box(f"{name}_Right_Foot", world(0.16, -0.20, 0.07), (0.20, 0.48, 0.14), clothes, person_coll, rotation_z)
    add_box(f"{name}_Pelvis", world(0.0, 0.0, 2.78), (0.62, 0.34, 0.26), clothes, person_coll, rotation_z)
    add_cylinder(f"{name}_Torso", world(0.0, 0.0, 3.90), 0.36, 1.95, clothes, person_coll, vertices=6, rotation_z=rotation_z)
    add_box(f"{name}_Left_Arm", world(-0.50, 0.0, 3.85), (0.12, 0.12, 1.85), clothes, person_coll, rotation_z)
    add_box(f"{name}_Right_Arm", world(0.50, 0.0, 3.85), (0.12, 0.12, 1.85), clothes, person_coll, rotation_z)
    add_cylinder(f"{name}_Neck", world(0.0, 0.0, 4.95), 0.10, 0.25, skin, person_coll, vertices=8, rotation_z=rotation_z)
    add_uv_sphere(f"{name}_Head", world(0.0, 0.0, height - 0.28), 0.28, skin, person_coll, segments=8, ring_count=4)

    if show_marker:
        add_cylinder(f"{name}_Scale_Marker_5ft9in", world(0.90, 0.0, height / 2.0), 0.025, height, marker, person_coll, vertices=6)
        add_box(f"{name}_Scale_Marker_Top_Tick", world(0.90, 0.0, height), (0.45, 0.04, 0.04), marker, person_coll, rotation_z)
        bpy.ops.object.text_add(location=world(1.25, 0.0, height), rotation=(0.0, 0.0, rotation_z))
        label = bpy.context.object
        label.name = f"{name}_Scale_Label_5ft9in"
        label.data.name = f"{name}_Scale_Label_5ft9in_Curve"
        label.data.body = "5 ft 9 in"
        label.data.align_x = "LEFT"
        label.data.align_y = "CENTER"
        label.data.size = 0.34
        label.data.extrude = 0.01
        assign_mat(label, marker)
        move_to_collection(label, person_coll)


def add_global_text(name, text, loc, size, mat, coll, rotation_z=0.0):
    bpy.ops.object.text_add(location=loc, rotation=(0.0, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Curve"
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.01
    assign_mat(obj, mat)
    move_to_collection(obj, coll)
    return obj


def add_scale_reference_strip():
    root = bpy.data.collections["240_West_37th_Street_Side_By_Side_Model"]
    coll = get_or_create_collection("Scale_Reference", root)
    skin = MATERIALS["person_skin"]
    clothes = MATERIALS["person_clothes_a"]
    marker = MATERIALS["person_marker"]
    door = MATERIALS["door"]
    wall = MATERIALS["wall_interior"]
    base_x = 160.0
    base_y = -48.0

    add_box("ScaleRef_Person_Left_Leg", (base_x - 8.16, base_y, 1.35), (0.16, 0.16, 2.70), clothes, coll)
    add_box("ScaleRef_Person_Right_Leg", (base_x - 7.84, base_y, 1.35), (0.16, 0.16, 2.70), clothes, coll)
    add_box("ScaleRef_Person_Torso", (base_x - 8.0, base_y, 3.90), (0.72, 0.38, 1.95), clothes, coll)
    add_box("ScaleRef_Person_Left_Arm", (base_x - 8.50, base_y, 3.85), (0.12, 0.12, 1.85), clothes, coll)
    add_box("ScaleRef_Person_Right_Arm", (base_x - 7.50, base_y, 3.85), (0.12, 0.12, 1.85), clothes, coll)
    add_cylinder("ScaleRef_Person_Neck", (base_x - 8.0, base_y, 4.95), 0.10, 0.25, skin, coll, vertices=8)
    add_uv_sphere("ScaleRef_Person_Head_5ft9in", (base_x - 8.0, base_y, SCALE_PERSON_HEIGHT - 0.28), 0.28, skin, coll, segments=8, ring_count=4)
    add_box("ScaleRef_Door_7ft", (base_x - 2.0, base_y, STANDARD_DOOR_HEIGHT / 2.0), (3.0, 0.16, STANDARD_DOOR_HEIGHT), door, coll)
    add_box("ScaleRef_Wall_9ft_Cellar", (base_x + 3.0, base_y, 4.5), (0.35, 0.20, 9.0), wall, coll)
    add_box("ScaleRef_Wall_15ft6in_FirstFloor", (base_x + 5.0, base_y, 7.75), (0.35, 0.20, 15.5), wall, coll)
    add_box("ScaleRef_Wall_8ft7in_Mezzanine", (base_x + 7.0, base_y, 4.3), (0.35, 0.20, 8.6), wall, coll)
    add_global_text("ScaleRef_Label_Person", "5 ft 9 in person", (base_x - 8.0, base_y - 1.2, 0.05), 0.45, marker, coll)
    add_global_text("ScaleRef_Label_Door", "7 ft door", (base_x - 2.0, base_y - 1.2, 0.05), 0.45, marker, coll)
    add_global_text("ScaleRef_Label_Walls", "wall heights: 9 ft / 15.5 ft / 8.6 ft", (base_x + 5.0, base_y - 1.2, 0.05), 0.42, marker, coll)


def add_level_title(level_name):
    level = LEVELS[level_name]
    add_text(
        level_name,
        "Labels",
        f"Label_{level_name}_Level_Title",
        f"240 WEST 37TH STREET | {level['label']}",
        level["length"] / 2.0,
        -4.0,
        z=0.22,
        size=1.45,
    )


def build_common_shell(level_name):
    length = LEVELS[level_name]["length"]
    width = LEVELS[level_name]["width"]
    h = LEVELS[level_name]["wall_height"]
    wall_t = 0.72
    add_rect(level_name, "Floor_Slabs", f"Floor_{level_name}_Full_Plate", 0, 0, length, width, FLOOR_Z, FLOOR_THICKNESS, MATERIALS["floor"])
    add_wall(level_name, "Exterior_Walls", f"Wall_{level_name}_Exterior_South", 0, 0, length, 0, h, 0.72, MATERIALS["wall_exterior"])
    add_wall(level_name, "Exterior_Walls", f"Wall_{level_name}_Exterior_North", 0, width, length, width, h, 0.72, MATERIALS["wall_exterior"])
    add_wall(level_name, "Exterior_Walls", f"Wall_{level_name}_Exterior_West", 0, wall_t / 2.0, 0, width - wall_t / 2.0, h, wall_t, MATERIALS["wall_exterior"])
    add_wall(level_name, "Exterior_Walls", f"Wall_{level_name}_Exterior_East", length, wall_t / 2.0, length, width - wall_t / 2.0, h, wall_t, MATERIALS["wall_exterior"])
    add_level_title(level_name)
    add_reference_plan(level_name)


def build_cellar():
    level = "Cellar"
    build_common_shell(level)

    # Left service rooms and green room.
    add_wall(level, "Interior_Walls", "Wall_Cellar_GreenRoom_North", 3, 15, 24, 15, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_GreenRoom_East", 24, 5, 24, 15, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_GreenRoom_West", 3, 5, 3, 15, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_OfficeStorage_South", 14, 16.6, 27, 16.6, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_OfficeStorage_East", 27, 18.3, 27, 23.5, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_StaffRoom_North", 27, 18.3, 38, 18.3, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_StaffRoom_South", 27, 9.6, 38, 9.6, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_StaffRoom_West", 27, 9.6, 27, 18.3, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_StaffRoom_East", 38, 9.6, 38, 18.3, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_LeftStair_North", 2, 5.0, 31, 5.0, thickness=0.42)

    # Bar and central hall.
    add_wall(level, "Interior_Walls", "Wall_Cellar_Bar_Core_West", 36.5, 5.0, 36.5, 22.0, thickness=0.5)
    add_wall(level, "Interior_Walls", "Wall_Cellar_Bar_ServicePartition", 44.5, 7.0, 44.5, 21.5, thickness=0.5)
    add_rect(level, "Fixtures", "Fixture_Cellar_Bar_Counter_Back", 39.0, 14.0, 5.0, 6.5, 0, 3.1, MATERIALS["bar"])
    add_rect(level, "Fixtures", "Fixture_Cellar_Bar_Counter_Front", 39.0, 7.2, 5.0, 1.0, 0, 3.1, MATERIALS["bar"])
    add_rect(level, "Fixtures", "Fixture_Cellar_Bar_Counter_Return", 43.0, 7.2, 1.0, 13.3, 0, 3.1, MATERIALS["bar"])
    add_rect(level, "Fixtures", "Fixture_Cellar_GreenRoom_Table", 10.0, 8.8, 5.4, 2.0, 0, 0.75, MATERIALS["fixture"])

    # Right rooms, kitchen, storage and second stair.
    add_wall(level, "Interior_Walls", "Wall_Cellar_RightCorridor_North", 66, 14.0, 98, 14.0, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_WC1_East", 73.0, 14.0, 73.0, 23.2, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_WC2_East", 80.0, 14.0, 80.0, 23.2, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_Kitchen_East", 90.0, 14.0, 90.0, 23.2, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_LiquorStorage_North", 66, 5.6, 78, 5.6, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_LiquorStorage_East", 78, 0.8, 78, 5.6, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_StoreRoom_East", 84, 0.8, 84, 5.6, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Cellar_RightStair_North", 84, 5.6, 98, 5.6, thickness=0.42)
    add_rect(level, "Fixtures", "Fixture_Cellar_Kitchen_Counter_North", 82.0, 20.2, 7.2, 1.1, 0, 3.0, MATERIALS["fixture"])
    add_rect(level, "Fixtures", "Fixture_Cellar_Kitchen_Counter_East", 88.6, 14.8, 1.0, 6.2, 0, 3.0, MATERIALS["fixture"])
    add_wc_fixtures(level, "Fixture_Cellar_WC1", 67.6, 15.0)
    add_wc_fixtures(level, "Fixture_Cellar_WC2", 74.6, 15.0)

    add_stairs(level, "Stair_Cellar_Left_Main", 4.5, 0.7, 27.0, 3.2, steps=17, direction="x", up_label="UP", total_rise=9.0)
    add_stairs(level, "Stair_Cellar_Right_Main", 84.8, 0.7, 12.8, 3.4, steps=12, direction="x", up_label="UP", total_rise=9.0)

    add_door(level, "Door_Cellar_GreenRoom", 23.9, 9.1, 2.6, "vertical", (24.0, 7.8), 90, 180)
    add_door(level, "Door_Cellar_StaffRoom", 38.0, 13.7, 2.6, "vertical", (38.0, 12.4), 90, 0)
    add_door(level, "Door_Cellar_Bar_Service", 36.5, 12.6, 2.4, "vertical", (36.5, 11.4), 0, 90)
    add_door(level, "Door_Cellar_WC1", 69.4, 14.0, 2.3, "horizontal", (68.3, 14.0), 270, 360)
    add_door(level, "Door_Cellar_WC2", 76.5, 14.0, 2.3, "horizontal", (75.4, 14.0), 270, 360)
    add_door(level, "Door_Cellar_Kitchen", 83.9, 14.0, 2.6, "horizontal", (82.6, 14.0), 180, 270)
    add_door(level, "Door_Cellar_StorageTrash", 92.0, 18.0, 2.6, "vertical", (92.0, 16.7), 180, 270)
    add_window(level, "Window_Cellar_Exit_Lightwell_Glass", 98.9, 19.0, 5.0, "vertical", sill=1.4, height=6.2)

    add_room_label(level, "Label_Cellar_GreenRoom", "GREEN ROOM", 13.5, 10.2, 1.1)
    add_room_label(level, "Label_Cellar_OfficeStorage", "OFFICE/\nSTORAGE", 20.5, 20.1, 0.85)
    add_room_label(level, "Label_Cellar_StaffRoom", "STAFF\nROOM", 32.3, 13.7, 0.9)
    add_room_label(level, "Label_Cellar_Bar", "BAR", 40.5, 13.3, 0.95)
    add_room_label(level, "Label_Cellar_OpenHall", "OPEN CELLAR AREA", 55.0, 13.2, 1.1)
    add_room_label(level, "Label_Cellar_WC1", "W.C.", 69.7, 18.6, 0.85)
    add_room_label(level, "Label_Cellar_WC2", "W.C.", 76.6, 18.6, 0.85)
    add_room_label(level, "Label_Cellar_Kitchen", "KITCHEN", 85.3, 18.7, 0.9)
    add_room_label(level, "Label_Cellar_StorageTrash", "STORAGE/\nTRASH", 94.5, 18.9, 0.8)
    add_room_label(level, "Label_Cellar_LiquorStorage", "LIQUOR\nSTORAGE", 72.0, 2.8, 0.78)
    add_room_label(level, "Label_Cellar_Stor", "STOR.", 81.0, 3.1, 0.78)
    add_room_label(level, "Label_Cellar_Exit", "EXIT", 97.0, 21.8, 0.85)
    add_low_poly_person(level, "ScalePerson_Cellar_OpenArea_5ft9in", 55.0, 12.0, rotation_z=math.radians(15), show_marker=True)
    add_low_poly_person(level, "ScalePerson_Cellar_GreenRoom_5ft9in", 13.0, 8.0, rotation_z=math.radians(-25))


def build_first_floor():
    level = "First_Floor"
    build_common_shell(level)

    # Main enclosure and left/front elements.
    add_wall(level, "Interior_Walls", "Wall_First_LeftStair_North", 5.0, 5.2, 24.0, 5.2, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_Entrance_Return", 0.8, 8.0, 0.8, 22.0, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_CoatCloset_North", 20.5, 18.1, 28.5, 18.1, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_CoatCloset_South", 20.5, 8.8, 28.5, 8.8, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_CoatCloset_West", 20.5, 8.8, 20.5, 18.1, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_CoatCloset_East", 28.5, 8.8, 28.5, 18.1, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_MainRoom_West", 31.5, 4.2, 31.5, 23.5, thickness=0.54)
    add_wall(level, "Interior_Walls", "Wall_First_MainRoom_East", 69.0, 4.2, 69.0, 23.5, thickness=0.54)

    # Back of house and restrooms.
    add_wall(level, "Interior_Walls", "Wall_First_BackHouse_South", 69.0, 14.2, 94.5, 14.2, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_WC1_East", 76.0, 14.2, 76.0, 23.4, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_WC2_East", 84.0, 14.2, 84.0, 23.4, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_WC3_East", 91.0, 14.2, 91.0, 23.4, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_ServiceCounter_North", 75.0, 10.0, 93.0, 10.0, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_ServiceCounter_West", 75.0, 4.8, 75.0, 10.0, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_First_RightStair_North", 75.0, 6.0, 94.0, 6.0, thickness=0.42)
    add_rect(level, "Fixtures", "Fixture_First_ServiceCounter_Main", 77.0, 8.6, 15.5, 1.05, 0, 3.0, MATERIALS["bar"])
    add_rect(level, "Fixtures", "Fixture_First_ServiceCounter_Back", 88.3, 5.1, 1.2, 4.8, 0, 3.0, MATERIALS["bar"])

    add_stairs(level, "Stair_First_Left_Down", 6.5, 0.8, 17.5, 3.4, steps=14, direction="x", up_label="DN", total_rise=9.0, reverse_rise=True)
    add_stairs(level, "Stair_First_Left_Up", 24.5, 0.8, 6.2, 3.4, steps=7, direction="x", up_label="UP", total_rise=8.6)
    add_stairs(level, "Stair_First_Right_Down", 76.0, 0.8, 8.0, 3.9, steps=8, direction="x", up_label="DN", total_rise=9.0, reverse_rise=True)
    add_stairs(level, "Stair_First_Right_Up", 84.5, 0.8, 9.2, 3.9, steps=9, direction="x", up_label="UP", total_rise=8.6)

    add_window(level, "Window_First_Entrance_Glass_West", 0.0, 15.2, 8.5, "vertical", sill=1.2, height=8.0)
    add_window(level, "Window_First_Storefront_South_01", 9.5, 0.0, 7.0, "horizontal", sill=1.2, height=8.0)
    add_window(level, "Window_First_Storefront_South_02", 17.0, 0.0, 7.0, "horizontal", sill=1.2, height=8.0)
    add_window(level, "Window_First_Rear_Service_Glass", 94.5, 17.0, 5.0, "vertical", sill=2.0, height=6.0)

    add_door(level, "Door_First_Main_Entrance", 0.8, 11.2, 3.0, "vertical", (0.8, 9.7), 270, 360)
    add_door(level, "Door_First_CoatCloset", 20.5, 13.1, 2.4, "vertical", (20.5, 11.9), 0, 90)
    add_door(level, "Door_First_WC1", 72.8, 14.2, 2.4, "horizontal", (71.6, 14.2), 270, 360)
    add_door(level, "Door_First_WC2", 80.5, 14.2, 2.4, "horizontal", (79.3, 14.2), 270, 360)
    add_door(level, "Door_First_WC3", 87.8, 14.2, 2.4, "horizontal", (86.6, 14.2), 270, 360)
    add_door(level, "Door_First_ServiceArea", 75.0, 7.3, 2.4, "vertical", (75.0, 6.1), 90, 180)

    add_wc_fixtures(level, "Fixture_First_WC1", 70.0, 15.2)
    add_wc_fixtures(level, "Fixture_First_WC2", 77.6, 15.2)
    add_wc_fixtures(level, "Fixture_First_WC3", 85.1, 15.2)

    add_room_label(level, "Label_First_Entrance", "ENTRANCE", 2.1, 16.3, 0.9, rot=math.radians(90))
    add_room_label(level, "Label_First_FrontRoom", "FRONT ROOM", 12.5, 13.5, 1.05)
    add_room_label(level, "Label_First_CoatCloset", "COAT\nCLOSET", 24.4, 13.4, 0.83)
    add_room_label(level, "Label_First_MainOpen", "MAIN OPEN AREA", 50.3, 13.2, 1.2)
    add_room_label(level, "Label_First_WC1", "W.C.", 72.5, 19.1, 0.85)
    add_room_label(level, "Label_First_WC2", "W.C.", 80.2, 19.1, 0.85)
    add_room_label(level, "Label_First_WC3", "W.C.", 87.5, 19.1, 0.85)
    add_room_label(level, "Label_First_ServiceCounter", "SERVICE/\nBAR", 84.6, 7.7, 0.78)
    add_low_poly_person(level, "ScalePerson_First_MainOpen_5ft9in", 51.0, 12.2, rotation_z=math.radians(8), show_marker=True)
    add_low_poly_person(level, "ScalePerson_First_FrontRoom_5ft9in", 13.0, 13.2, rotation_z=math.radians(-12))


def build_mezzanine():
    level = "Mezzanine"

    # The mezzanine has real slab only at the equipment platform, stairs/landings,
    # and right-hand room. Void markers keep the open-to-below zones readable.
    length = LEVELS[level]["length"]
    width = LEVELS[level]["width"]
    h = LEVELS[level]["wall_height"]
    wall_t = 0.72
    add_wall(level, "Exterior_Walls", f"Wall_{level}_Exterior_South", 0, 0, length, 0, h, wall_t, MATERIALS["wall_exterior"])
    add_wall(level, "Exterior_Walls", f"Wall_{level}_Exterior_North", 0, width, length, width, h, wall_t, MATERIALS["wall_exterior"])
    add_wall(level, "Exterior_Walls", f"Wall_{level}_Exterior_West", 0, wall_t / 2.0, 0, width - wall_t / 2.0, h, wall_t, MATERIALS["wall_exterior"])
    add_wall(level, "Exterior_Walls", f"Wall_{level}_Exterior_East", length, wall_t / 2.0, length, width - wall_t / 2.0, h, wall_t, MATERIALS["wall_exterior"])
    add_level_title(level)
    add_reference_plan(level)

    add_rect(level, "Floor_Slabs", "Floor_Mezzanine_Left_Stair_Landing", 2.0, 0.0, 25.5, 5.0, FLOOR_Z, FLOOR_THICKNESS, MATERIALS["floor"])
    add_rect(level, "Floor_Slabs", "Floor_Mezzanine_Equipment_Platform_Grated", 21.0, 5.05, 6.8, 17.65, FLOOR_Z, FLOOR_THICKNESS, MATERIALS["metal_grate"])
    add_rect(level, "Floor_Slabs", "Floor_Mezzanine_Right_Occupied_Area", 69.0, 5.65, 25.0, 17.25, FLOOR_Z, FLOOR_THICKNESS, MATERIALS["floor"])
    add_rect(level, "Floor_Slabs", "Floor_Mezzanine_Right_Stair_Landing", 74.0, 0.0, 18.0, 5.55, FLOOR_Z, FLOOR_THICKNESS, MATERIALS["floor"])
    add_plane_rect(level, "Void_Markers", "Void_Mezzanine_Left_Open_To_Below", 2.0, 5.4, 18.4, 17.0, 0.08, MATERIALS["void"])
    add_plane_rect(level, "Void_Markers", "Void_Mezzanine_Center_Open_To_Below", 31.0, 4.5, 36.5, 18.2, 0.08, MATERIALS["void"])

    add_guardrail(level, "Railing_Mezzanine_LeftVoid_South", 2.0, 5.4, 20.4, 5.4)
    add_guardrail(level, "Railing_Mezzanine_LeftVoid_East", 20.4, 5.4, 20.4, 22.4)
    add_guardrail(level, "Railing_Mezzanine_CenterVoid_West", 31.0, 4.5, 31.0, 22.7)
    add_guardrail(level, "Railing_Mezzanine_CenterVoid_East", 67.5, 4.5, 67.5, 22.7)
    add_guardrail(level, "Railing_Mezzanine_CenterVoid_South", 31.0, 4.5, 67.5, 4.5)
    add_guardrail(level, "Railing_Mezzanine_CenterVoid_North", 31.0, 22.7, 67.5, 22.7)

    add_wall(level, "Interior_Walls", "Wall_Mezzanine_EquipPlatform_West", 21.0, 5.0, 21.0, 22.7, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_EquipPlatform_East", 27.8, 5.0, 27.8, 22.7, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_RightRoom_West", 69.0, 4.1, 69.0, 22.9, thickness=0.54)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_RightRoom_South", 69.0, 4.1, 94.0, 4.1, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_RightRoom_North", 69.0, 22.9, 94.0, 22.9, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_WC_West", 88.7, 14.3, 88.7, 23.4, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_WC_South", 88.7, 14.3, 96.0, 14.3, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_StoreMech_North", 88.7, 8.1, 96.0, 8.1, thickness=0.42)
    add_wall(level, "Interior_Walls", "Wall_Mezzanine_StoreMech_West", 88.7, 0.5, 88.7, 8.1, thickness=0.42)

    add_stairs(level, "Stair_Mezzanine_Left_Down", 4.0, 0.8, 17.0, 3.8, steps=14, direction="x", up_label="DN", total_rise=8.6, reverse_rise=True)
    add_stairs(level, "Stair_Mezzanine_Equipment_Down", 22.0, 0.8, 5.4, 3.8, steps=7, direction="x", up_label="DN", total_rise=8.6, reverse_rise=True)
    add_stairs(level, "Stair_Mezzanine_Right_Down", 75.0, 0.8, 16.0, 3.8, steps=13, direction="x", up_label="DN", total_rise=8.6, reverse_rise=True)

    add_window(level, "Window_Mezzanine_Left_Glass_West", 0.0, 14.0, 9.0, "vertical", sill=1.2, height=6.3)
    add_window(level, "Window_Mezzanine_RightRoom_North_Glass", 79.0, 22.9, 8.0, "horizontal", sill=2.0, height=4.8)
    add_door(level, "Door_Mezzanine_RightRoom", 69.0, 10.0, 2.6, "vertical", (69.0, 8.7), 0, 90)
    add_door(level, "Door_Mezzanine_WC", 88.7, 17.8, 2.4, "vertical", (88.7, 16.6), 90, 180)
    add_door(level, "Door_Mezzanine_StoreMech", 88.7, 5.4, 2.4, "vertical", (88.7, 4.2), 180, 270)
    add_wc_fixtures(level, "Fixture_Mezzanine_WC", 90.0, 15.4)

    add_room_label(level, "Label_Mezzanine_Left_OpenToBelow", "OPEN TO BELOW", 11.0, 13.7, 0.95)
    add_room_label(level, "Label_Mezzanine_EquipPlatform", "EQUIP.\nPLATFORM", 24.4, 13.9, 0.78)
    add_room_label(level, "Label_Mezzanine_Center_OpenToBelow", "OPEN TO BELOW", 49.5, 13.8, 1.05)
    add_room_label(level, "Label_Mezzanine_RightRoom", "MEZZANINE ROOM", 78.5, 14.0, 0.95)
    add_room_label(level, "Label_Mezzanine_WC", "W.C.", 92.1, 19.0, 0.82)
    add_room_label(level, "Label_Mezzanine_StoreMech", "STOR/\nMECH", 92.1, 4.6, 0.78)
    add_low_poly_person(level, "ScalePerson_Mezzanine_RightRoom_5ft9in", 78.5, 13.0, rotation_z=math.radians(18), show_marker=True)
    add_low_poly_person(level, "ScalePerson_Mezzanine_EquipmentPlatform_5ft9in", 24.4, 10.5, rotation_z=math.radians(-10))


def setup_scene():
    bpy.context.scene.unit_settings.system = "IMPERIAL"
    bpy.context.scene.unit_settings.length_unit = "FEET"
    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"
    bpy.context.scene.eevee.taa_render_samples = 64
    bpy.context.scene.world.color = (1.0, 1.0, 1.0)
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.view_settings.look = "None"
    bpy.context.scene.view_settings.exposure = 0.0
    bpy.context.scene.view_settings.gamma = 1.0

    root = get_or_create_collection("240_West_37th_Street_Side_By_Side_Model")
    global LEVEL_COLLECTIONS
    LEVEL_COLLECTIONS = {}
    for level_name in LEVELS:
        level_root = get_or_create_collection(level_name, root)
        LEVEL_COLLECTIONS[level_name] = {}
        for child in [
            "Reference_Plans",
            "Floor_Slabs",
            "Void_Markers",
            "Exterior_Walls",
            "Interior_Walls",
            "Doors",
            "Windows_Glass",
            "Railings",
            "Stairs",
            "Fixtures",
            "Scale_Figures",
            "Labels",
        ]:
            LEVEL_COLLECTIONS[level_name][child] = get_or_create_collection(child, level_root)

    global MATERIALS
    MATERIALS = {
        "floor": make_mat("Mat_Floor_Slab_Light_Concrete", (0.78, 0.78, 0.74, 1.0)),
        "wall_exterior": make_mat("Mat_Wall_Exterior_Dark_Grey", (0.18, 0.18, 0.18, 1.0)),
        "wall_interior": make_mat("Mat_Wall_Interior_Warm_Grey", (0.48, 0.48, 0.46, 1.0)),
        "glass": make_mat("Mat_Windows_Glass_Transparent_Blue", (0.35, 0.72, 0.95, 0.36), alpha=0.36),
        "door": make_mat("Mat_Doors_Warm_Wood", (0.46, 0.27, 0.14, 1.0)),
        "door_swing": make_mat("Mat_Door_Swing_Black", (0.02, 0.02, 0.02, 1.0)),
        "stair": make_mat("Mat_Stairs_Dark_Concrete", (0.34, 0.34, 0.33, 1.0)),
        "fixture": make_mat("Mat_Fixtures_Off_White", (0.86, 0.85, 0.80, 1.0)),
        "bar": make_mat("Mat_Bar_Counter_Dark_Wood", (0.20, 0.12, 0.07, 1.0)),
        "label": make_mat("Mat_Labels_Black", (0.0, 0.0, 0.0, 1.0)),
        "rail": make_mat("Mat_Railings_Matte_Black", (0.02, 0.02, 0.02, 1.0)),
        "void": make_mat("Mat_Open_To_Below_Transparent_Marker", (0.58, 0.77, 0.92, 0.28), alpha=0.28),
        "metal_grate": make_mat("Mat_Equipment_Platform_Grating", (0.42, 0.45, 0.45, 0.72), alpha=0.72, metallic=0.25),
        "backdrop": make_emission_mat("Mat_Backdrop_White_Review_Surface", (1.0, 1.0, 1.0, 1.0), strength=1.0),
        "person_skin": make_mat("Mat_Scale_Figure_Skin", (0.72, 0.52, 0.40, 1.0)),
        "person_clothes_a": make_mat("Mat_Scale_Figure_Clothes_Teal", (0.05, 0.32, 0.35, 1.0)),
        "person_clothes_b": make_mat("Mat_Scale_Figure_Clothes_Rust", (0.55, 0.18, 0.08, 1.0)),
        "person_marker": make_mat("Mat_Scale_Figure_Height_Marker", (0.0, 0.0, 0.0, 1.0)),
    }


def add_camera_and_lighting():
    root = bpy.data.collections["240_West_37th_Street_Side_By_Side_Model"]
    scene_coll = get_or_create_collection("Scene_Setup", root)
    add_box(
        "Scene_Backdrop_White_Matte",
        (160.0, 10.0, -0.30),
        (340.0, 150.0, 0.04),
        MATERIALS["backdrop"],
        scene_coll,
    )

    bpy.ops.object.light_add(type="AREA", location=(160.0, 18.0, 80.0))
    light = bpy.context.object
    light.name = "Light_Area_Top_Down_Softbox"
    light.data.energy = 4200.0
    light.data.size = 90.0
    light.data.use_shadow = False

    bpy.ops.object.light_add(type="SUN", location=(160.0, 18.0, 60.0), rotation=(0.0, 0.0, 0.0))
    sun = bpy.context.object
    sun.name = "Light_Sun_Top_Down_Fill"
    sun.data.energy = 3.5

    bpy.ops.object.camera_add(location=(160.0, 10.0, 145.0), rotation=(0.0, 0.0, 0.0))
    camera = bpy.context.object
    camera.name = "Camera_Top_Down_All_Floors"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 340.0
    bpy.context.scene.camera = camera

    bpy.ops.object.camera_add(location=(160.0, -34.0, 22.0))
    scale_camera = bpy.context.object
    scale_camera.name = "Camera_Oblique_FirstFloor_Scale_Check"
    scale_camera.data.type = "ORTHO"
    scale_camera.data.ortho_scale = 58.0
    direction = Vector((160.0, 12.0, 5.5)) - scale_camera.location
    scale_camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    bpy.ops.object.camera_add(location=(160.0, -76.0, 13.0))
    ref_camera = bpy.context.object
    ref_camera.name = "Camera_Oblique_Scale_Reference"
    ref_camera.data.type = "ORTHO"
    ref_camera.data.ortho_scale = 32.0
    direction = Vector((160.0, -48.0, 6.0)) - ref_camera.location
    ref_camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    bpy.context.scene.render.resolution_x = 2600
    bpy.context.scene.render.resolution_y = 1050


def add_model_notes():
    notes_coll = get_or_create_collection("Model_Notes", bpy.data.collections["240_West_37th_Street_Side_By_Side_Model"])
    text = (
        "Simplified trace model from three source screenshots. "
        "Floors are laid out side by side, not vertically stacked. "
        "Reference plan planes can be hidden via each level's Reference_Plans collection."
    )
    bpy.ops.object.text_add(location=(160.0, 30.5, 0.2), rotation=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = "Label_Model_Notes"
    obj.data.name = "Label_Model_Notes_Curve"
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = 1.0
    obj.data.extrude = 0.01
    assign_mat(obj, MATERIALS["label"])
    move_to_collection(obj, notes_coll)


def main():
    clear_scene()
    setup_scene()
    build_cellar()
    build_first_floor()
    build_mezzanine()
    add_scale_reference_strip()
    add_camera_and_lighting()
    add_model_notes()
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    print(f"Saved Blender model to {OUTPUT_BLEND}")


if __name__ == "__main__":
    main()
