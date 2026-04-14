import json, math, struct
from pathlib import Path
from dataclasses import dataclass
import numpy as np

OUT = Path('/mnt/data/work_v17/zoi-style-editor-v17-reference-human/public/assets/models')
OUT.mkdir(parents=True, exist_ok=True)

# -----------------------------
# Skeleton definition
# -----------------------------

@dataclass
class BoneDef:
    name: str
    parent: int | None
    translation: tuple[float, float, float]

# Human-ish proportions, meters, A-pose.
BONES = [
    BoneDef('Hips', None, (0.0, 1.02, 0.0)),
    BoneDef('Spine', 0, (0.0, 0.16, 0.0)),
    BoneDef('Chest', 1, (0.0, 0.20, 0.0)),
    BoneDef('Neck', 2, (0.0, 0.17, 0.0)),
    BoneDef('Head', 3, (0.0, 0.12, 0.0)),
    BoneDef('LeftShoulder', 2, (0.18, 0.10, 0.0)),
    BoneDef('LeftUpperArm', 5, (0.08, -0.02, 0.0)),
    BoneDef('LeftLowerArm', 6, (0.27, -0.06, 0.0)),
    BoneDef('LeftHand', 7, (0.26, -0.04, 0.0)),
    BoneDef('RightShoulder', 2, (-0.18, 0.10, 0.0)),
    BoneDef('RightUpperArm', 9, (-0.08, -0.02, 0.0)),
    BoneDef('RightLowerArm', 10, (-0.27, -0.06, 0.0)),
    BoneDef('RightHand', 11, (-0.26, -0.04, 0.0)),
    BoneDef('LeftUpperLeg', 0, (0.11, -0.12, 0.0)),
    BoneDef('LeftLowerLeg', 13, (0.0, -0.43, 0.0)),
    BoneDef('LeftFoot', 14, (0.0, -0.42, 0.05)),
    BoneDef('RightUpperLeg', 0, (-0.11, -0.12, 0.0)),
    BoneDef('RightLowerLeg', 16, (0.0, -0.43, 0.0)),
    BoneDef('RightFoot', 17, (0.0, -0.42, 0.05)),
]


def translation_matrix(t):
    x, y, z = t
    m = np.eye(4, dtype=np.float32)
    m[:3, 3] = [x, y, z]
    return m


def compute_global_matrices():
    mats = []
    for i, bone in enumerate(BONES):
        local = translation_matrix(bone.translation)
        if bone.parent is None:
            mats.append(local)
        else:
            mats.append(mats[bone.parent] @ local)
    return mats

GLOBAL_MATS = compute_global_matrices()
GLOBAL_POS = np.array([m[:3, 3] for m in GLOBAL_MATS], dtype=np.float32)
INV_BIND = np.array([np.linalg.inv(m) for m in GLOBAL_MATS], dtype=np.float32)

# -----------------------------
# Mesh builder
# -----------------------------

class MeshBuilder:
    def __init__(self):
        self.pos = []
        self.norm = []
        self.col = []
        self.joints = []
        self.weights = []
        self.idx = []

    def add(self, positions, normals, indices, color_rgba, joint_ids, weight_vals):
        base = len(self.pos)
        self.pos.extend(positions.tolist())
        self.norm.extend(normals.tolist())
        color = np.array(color_rgba, dtype=np.float32) / 255.0
        if color.shape == (4,):
            self.col.extend(np.tile(color, (len(positions), 1)).tolist())
        else:
            self.col.extend(color.tolist())
        self.joints.extend(joint_ids.tolist())
        self.weights.extend(weight_vals.tolist())
        self.idx.extend((indices + base).tolist())

    def arrays(self):
        return {
            'POSITION': np.array(self.pos, dtype=np.float32),
            'NORMAL': np.array(self.norm, dtype=np.float32),
            'COLOR_0': np.array(self.col, dtype=np.float32),
            'JOINTS_0': np.array(self.joints, dtype=np.uint16),
            'WEIGHTS_0': np.array(self.weights, dtype=np.float32),
            'indices': np.array(self.idx, dtype=np.uint32),
        }


def normalize(v):
    v = np.array(v, dtype=np.float32)
    n = np.linalg.norm(v)
    return v / (n if n > 1e-8 else 1.0)


def orthonormal_basis(direction):
    d = normalize(direction)
    up = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    if abs(np.dot(d, up)) > 0.92:
        up = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    u = normalize(np.cross(d, up))
    v = normalize(np.cross(d, u))
    return u, v, d


def capped_cylinder(a, b, r0, r1, sides=14, cap_start=True, cap_end=True):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    u, v, d = orthonormal_basis(b - a)
    positions = []
    normals = []
    indices = []
    for i in range(sides):
        t = (i / sides) * math.tau
        ring = math.cos(t) * u + math.sin(t) * v
        positions.append(a + ring * r0)
        positions.append(b + ring * r1)
        normals.append(ring)
        normals.append(ring)
    for i in range(sides):
        ni = (i + 1) % sides
        a0, b0 = 2 * i, 2 * i + 1
        a1, b1 = 2 * ni, 2 * ni + 1
        indices.extend([a0, a1, b1, a0, b1, b0])
    if cap_start:
        center_idx = len(positions)
        positions.append(a)
        normals.append(-d)
        for i in range(sides):
            ni = (i + 1) % sides
            indices.extend([center_idx, 2 * ni, 2 * i])
    if cap_end:
        center_idx = len(positions)
        positions.append(b)
        normals.append(d)
        for i in range(sides):
            ni = (i + 1) % sides
            indices.extend([center_idx, 2 * i + 1, 2 * ni + 1])
    return np.array(positions, dtype=np.float32), np.array(normals, dtype=np.float32), np.array(indices, dtype=np.uint32)


def sphere(center, rx, ry, rz, lats=10, lons=14):
    center = np.array(center, dtype=np.float32)
    positions = []
    normals = []
    indices = []
    for lat in range(lats + 1):
        phi = math.pi * lat / lats
        sy = math.cos(phi)
        sr = math.sin(phi)
        for lon in range(lons + 1):
            th = math.tau * lon / lons
            x = math.cos(th) * sr
            y = sy
            z = math.sin(th) * sr
            positions.append(center + np.array([x * rx, y * ry, z * rz], dtype=np.float32))
            normals.append(normalize([x / max(rx, 1e-6), y / max(ry, 1e-6), z / max(rz, 1e-6)]))
    cols = lons + 1
    for lat in range(lats):
        for lon in range(lons):
            i0 = lat * cols + lon
            i1 = i0 + 1
            i2 = i0 + cols
            i3 = i2 + 1
            indices.extend([i0, i2, i1, i1, i2, i3])
    return np.array(positions, dtype=np.float32), np.array(normals, dtype=np.float32), np.array(indices, dtype=np.uint32)


def box(center, sx, sy, sz):
    cx, cy, cz = center
    x = sx / 2; y = sy / 2; z = sz / 2
    p = np.array([
        [cx-x, cy-y, cz+z], [cx+x, cy-y, cz+z], [cx+x, cy+y, cz+z], [cx-x, cy+y, cz+z],
        [cx+x, cy-y, cz-z], [cx-x, cy-y, cz-z], [cx-x, cy+y, cz-z], [cx+x, cy+y, cz-z],
        [cx-x, cy-y, cz-z], [cx-x, cy-y, cz+z], [cx-x, cy+y, cz+z], [cx-x, cy+y, cz-z],
        [cx+x, cy-y, cz+z], [cx+x, cy-y, cz-z], [cx+x, cy+y, cz-z], [cx+x, cy+y, cz+z],
        [cx-x, cy+y, cz+z], [cx+x, cy+y, cz+z], [cx+x, cy+y, cz-z], [cx-x, cy+y, cz-z],
        [cx-x, cy-y, cz-z], [cx+x, cy-y, cz-z], [cx+x, cy-y, cz+z], [cx-x, cy-y, cz+z],
    ], dtype=np.float32)
    n = np.array([
        [0,0,1]]*4 + [[0,0,-1]]*4 + [[-1,0,0]]*4 + [[1,0,0]]*4 + [[0,1,0]]*4 + [[0,-1,0]]*4,
        dtype=np.float32,
    )
    idx = []
    for f in range(6):
        b = f*4
        idx.extend([b,b+1,b+2,b,b+2,b+3])
    return p, n, np.array(idx, dtype=np.uint32)


def loft_ellipses(rings, sides=18, close_bottom=False, close_top=False):
    # rings: list[(center, rx, rz)] in order bottom->top
    positions = []
    normals = []
    indices = []
    ring_count = len(rings)
    for ri, (center, rx, rz) in enumerate(rings):
        center = np.array(center, dtype=np.float32)
        for i in range(sides):
            t = (i / sides) * math.tau
            local = np.array([math.cos(t) * rx, 0.0, math.sin(t) * rz], dtype=np.float32)
            positions.append(center + local)
            normals.append(normalize([math.cos(t)/max(rx,1e-6), 0.0, math.sin(t)/max(rz,1e-6)]))
    for r in range(ring_count - 1):
        for i in range(sides):
            ni = (i + 1) % sides
            a0 = r * sides + i
            a1 = r * sides + ni
            b0 = (r + 1) * sides + i
            b1 = (r + 1) * sides + ni
            indices.extend([a0, a1, b1, a0, b1, b0])
    if close_bottom:
        cidx = len(positions)
        c = np.array(rings[0][0], dtype=np.float32)
        positions.append(c)
        normals.append(np.array([0,-1,0], dtype=np.float32))
        for i in range(sides):
            ni = (i + 1) % sides
            indices.extend([cidx, ni, i])
    if close_top:
        cidx = len(positions)
        c = np.array(rings[-1][0], dtype=np.float32)
        positions.append(c)
        normals.append(np.array([0,1,0], dtype=np.float32))
        base = (ring_count - 1) * sides
        for i in range(sides):
            ni = (i + 1) % sides
            indices.extend([cidx, base + i, base + ni])
    return np.array(positions, dtype=np.float32), np.array(normals, dtype=np.float32), np.array(indices, dtype=np.uint32)


def weights_single(count, joint):
    joints = np.zeros((count, 4), dtype=np.uint16)
    weights = np.zeros((count, 4), dtype=np.float32)
    joints[:, 0] = joint
    weights[:, 0] = 1.0
    return joints, weights


def weights_blend_by_y(positions, y0, y1, joint_low, joint_high):
    t = np.clip((positions[:, 1] - y0) / max(y1 - y0, 1e-6), 0.0, 1.0)
    joints = np.zeros((len(positions), 4), dtype=np.uint16)
    weights = np.zeros((len(positions), 4), dtype=np.float32)
    joints[:, 0] = joint_low
    joints[:, 1] = joint_high
    weights[:, 0] = 1.0 - t
    weights[:, 1] = t
    return joints, weights


def rgba(hex_rgb, a=255):
    return [hex_rgb[0], hex_rgb[1], hex_rgb[2], a]

SKIN = rgba((231, 204, 184))
HAIR = rgba((96, 71, 54))
UNDER = rgba((174, 176, 182))
WHITE = rgba((245, 246, 248))
BLACK = rgba((34, 36, 40))
GRAY = rgba((183, 190, 199))
BLUE = rgba((121, 168, 231))
BLUE_DARK = rgba((74, 122, 199))
BEIGE = rgba((210, 187, 156))
OLIVE = rgba((110, 128, 78))
DENIM = rgba((70, 103, 151))
STONE = rgba((170, 168, 160))
RED = rgba((226, 104, 104))
OFFWHITE = rgba((230, 231, 224))
CAMEL = rgba((183, 140, 97))
YELLOW = rgba((215, 174, 48))
DARKOLIVE = rgba((84, 93, 52))
NAVY = rgba((50, 61, 88))


def add_cylinder_piece(builder, a, b, r0, r1, color, joint_low, joint_high=None):
    p, n, idx = capped_cylinder(a, b, r0, r1)
    if joint_high is None:
        j, w = weights_single(len(p), joint_low)
    else:
        axis = np.array(b) - np.array(a)
        u = np.dot((p - np.array(a)), normalize(axis))
        t = np.clip(u / max(np.linalg.norm(axis), 1e-6), 0.0, 1.0)
        j = np.zeros((len(p), 4), dtype=np.uint16)
        w = np.zeros((len(p), 4), dtype=np.float32)
        j[:, 0] = joint_low
        j[:, 1] = joint_high
        w[:, 0] = 1.0 - t
        w[:, 1] = t
    builder.add(p, n, idx, color, j, w)


def add_sphere_piece(builder, center, rx, ry, rz, color, joint):
    p, n, idx = sphere(center, rx, ry, rz)
    j, w = weights_single(len(p), joint)
    builder.add(p, n, idx, color, j, w)


def build_body_mesh():
    b = MeshBuilder()
    hips = GLOBAL_POS[0]
    spine = GLOBAL_POS[1]
    chest = GLOBAL_POS[2]
    neck = GLOBAL_POS[3]
    head = GLOBAL_POS[4]
    l_sh = GLOBAL_POS[5]
    l_el = GLOBAL_POS[7]
    l_hand = GLOBAL_POS[8]
    r_sh = GLOBAL_POS[9]
    r_el = GLOBAL_POS[11]
    r_hand = GLOBAL_POS[12]
    l_hip = GLOBAL_POS[13]
    l_knee = GLOBAL_POS[14]
    l_foot = GLOBAL_POS[15]
    r_hip = GLOBAL_POS[16]
    r_knee = GLOBAL_POS[17]
    r_foot = GLOBAL_POS[18]

    # Torso / pelvis shell
    rings = [
        ((0.0, hips[1] + 0.01, 0.0), 0.19, 0.135),
        ((0.0, spine[1] + 0.02, 0.0), 0.16, 0.12),
        ((0.0, chest[1] - 0.01, 0.0), 0.20, 0.14),
        ((0.0, chest[1] + 0.11, 0.0), 0.22, 0.145),
        ((0.0, neck[1] - 0.02, 0.0), 0.105, 0.09),
    ]
    p, n, idx = loft_ellipses(rings, sides=20, close_bottom=True, close_top=True)
    j = np.zeros((len(p), 4), dtype=np.uint16)
    w = np.zeros((len(p), 4), dtype=np.float32)
    # 3-way blend hips -> spine -> chest based on y
    y = p[:, 1]
    for i, yy in enumerate(y):
        if yy < spine[1] + 0.02:
            t = np.clip((yy - rings[0][0][1]) / (spine[1] + 0.02 - rings[0][0][1] + 1e-6), 0, 1)
            j[i, 0], j[i, 1] = 0, 1
            w[i, 0], w[i, 1] = 1 - t, t
        else:
            t = np.clip((yy - (spine[1] + 0.02)) / ((neck[1] - 0.02) - (spine[1] + 0.02) + 1e-6), 0, 1)
            j[i, 0], j[i, 1] = 1, 2
            w[i, 0], w[i, 1] = 1 - t, t
    # dark underwear lower torso blend for bottom half
    colors = np.tile(np.array(UNDER, dtype=np.float32) / 255.0, (len(p), 1))
    chest_mask = p[:, 1] > (spine[1] + 0.02)
    colors[chest_mask] = np.array(SKIN, dtype=np.float32) / 255.0
    b.add(p, n, idx, colors, j, w)

    # Head, neck, shoulders, arms, hands
    add_sphere_piece(b, head + np.array([0.0, 0.12, 0.0]), 0.10, 0.13, 0.10, SKIN, 4)
    add_sphere_piece(b, head + np.array([0.0, 0.20, -0.01]), 0.105, 0.08, 0.11, HAIR, 4)
    add_cylinder_piece(b, neck + np.array([0.0, -0.02, 0.0]), head + np.array([0.0, 0.04, 0.0]), 0.05, 0.05, SKIN, 3, 4)
    add_sphere_piece(b, l_sh, 0.06, 0.06, 0.06, SKIN, 5)
    add_sphere_piece(b, r_sh, 0.06, 0.06, 0.06, SKIN, 9)
    add_cylinder_piece(b, l_sh, l_el, 0.07, 0.055, SKIN, 6, 7)
    add_cylinder_piece(b, l_el, l_hand, 0.052, 0.042, SKIN, 7, 8)
    add_sphere_piece(b, l_el, 0.052, 0.052, 0.052, SKIN, 7)
    add_sphere_piece(b, l_hand + np.array([0.03, -0.01, 0.0]), 0.045, 0.028, 0.026, SKIN, 8)
    add_cylinder_piece(b, r_sh, r_el, 0.07, 0.055, SKIN, 10, 11)
    add_cylinder_piece(b, r_el, r_hand, 0.052, 0.042, SKIN, 11, 12)
    add_sphere_piece(b, r_el, 0.052, 0.052, 0.052, SKIN, 11)
    add_sphere_piece(b, r_hand + np.array([-0.03, -0.01, 0.0]), 0.045, 0.028, 0.026, SKIN, 12)

    # Legs and feet
    add_cylinder_piece(b, l_hip, l_knee, 0.095, 0.065, SKIN, 13, 14)
    add_cylinder_piece(b, l_knee, l_foot, 0.066, 0.052, SKIN, 14, 15)
    add_sphere_piece(b, l_knee, 0.057, 0.057, 0.057, SKIN, 14)
    p, n, idx = box(l_foot + np.array([0.0, -0.025, 0.10]), 0.11, 0.075, 0.28)
    j, w = weights_single(len(p), 15)
    b.add(p, n, idx, UNDER, j, w)
    add_cylinder_piece(b, r_hip, r_knee, 0.095, 0.065, SKIN, 16, 17)
    add_cylinder_piece(b, r_knee, r_foot, 0.066, 0.052, SKIN, 17, 18)
    add_sphere_piece(b, r_knee, 0.057, 0.057, 0.057, SKIN, 17)
    p, n, idx = box(r_foot + np.array([0.0, -0.025, 0.10]), 0.11, 0.075, 0.28)
    j, w = weights_single(len(p), 18)
    b.add(p, n, idx, UNDER, j, w)
    return b.arrays()


def build_top_variant(kind):
    b = MeshBuilder()
    hips = GLOBAL_POS[0]; spine = GLOBAL_POS[1]; chest = GLOBAL_POS[2]; neck = GLOBAL_POS[3]
    l_sh = GLOBAL_POS[5]; l_el = GLOBAL_POS[7]; l_hand = GLOBAL_POS[8]
    r_sh = GLOBAL_POS[9]; r_el = GLOBAL_POS[11]; r_hand = GLOBAL_POS[12]

    if kind == 'bomber':
        main = BLACK; accent = GRAY; trim = BLUE_DARK
        shoulder_rx, waist_rx, depth = 0.245, 0.19, 0.17
        sleeve_upper = (0.085, 0.072)
        sleeve_lower = (0.075, 0.068)
        hem_extra = 0.03
    elif kind == 'shirt':
        main = OFFWHITE; accent = BLUE; trim = BLUE_DARK
        shoulder_rx, waist_rx, depth = 0.23, 0.17, 0.16
        sleeve_upper = (0.08, 0.064)
        sleeve_lower = (0.068, 0.058)
        hem_extra = 0.015
    else:  # tee
        main = RED; accent = OFFWHITE; trim = OFFWHITE
        shoulder_rx, waist_rx, depth = 0.225, 0.165, 0.155
        sleeve_upper = (0.077, 0.062)
        sleeve_lower = (0.0, 0.0)
        hem_extra = 0.01

    rings = [
        ((0.0, hips[1] + 0.05, 0.0), waist_rx, depth),
        ((0.0, spine[1] + 0.07, 0.0), waist_rx * 0.98, depth * 0.97),
        ((0.0, chest[1] + 0.01, 0.0), shoulder_rx * 0.95, depth * 0.98),
        ((0.0, chest[1] + 0.15, 0.0), shoulder_rx, depth),
        ((0.0, neck[1] - 0.01, 0.0), 0.115, 0.10),
    ]
    p, n, idx = loft_ellipses(rings, sides=24, close_bottom=True, close_top=False)
    j = np.zeros((len(p), 4), dtype=np.uint16)
    w = np.zeros((len(p), 4), dtype=np.float32)
    y = p[:, 1]
    for i, yy in enumerate(y):
        if yy < spine[1] + 0.07:
            t = np.clip((yy - rings[0][0][1]) / ((spine[1] + 0.07) - rings[0][0][1] + 1e-6), 0, 1)
            j[i, 0], j[i, 1] = 0, 1
            w[i, 0], w[i, 1] = 1 - t, t
        else:
            t = np.clip((yy - (spine[1] + 0.07)) / ((neck[1] - 0.01) - (spine[1] + 0.07) + 1e-6), 0, 1)
            j[i, 0], j[i, 1] = 1, 2
            w[i, 0], w[i, 1] = 1 - t, t
    colors = np.tile(np.array(main, dtype=np.float32) / 255.0, (len(p), 1))
    # center placket / zipper strip
    front_mask = np.abs(p[:, 0]) < 0.022
    z_mask = p[:, 2] > depth * 0.72
    colors[front_mask & z_mask] = np.array(accent, dtype=np.float32) / 255.0
    # torso side stripe for shirt
    if kind == 'shirt':
        stripe = (np.abs(np.abs(p[:,0]) - shoulder_rx*0.82) < 0.018) & z_mask
        colors[stripe] = np.array(BLUE_DARK, dtype=np.float32) / 255.0
    b.add(p, n, idx, colors, j, w)

    # Sleeves
    add_cylinder_piece(b, l_sh + np.array([0.01, 0.0, 0.0]), l_el, sleeve_upper[0], sleeve_upper[1], main, 6, 7)
    add_cylinder_piece(b, r_sh + np.array([-0.01, 0.0, 0.0]), r_el, sleeve_upper[0], sleeve_upper[1], main, 10, 11)
    if kind != 'tee':
        add_cylinder_piece(b, l_el, l_hand + np.array([-0.02, 0.01, 0.0]), sleeve_lower[0], sleeve_lower[1], main, 7, 8)
        add_cylinder_piece(b, r_el, r_hand + np.array([0.02, 0.01, 0.0]), sleeve_lower[0], sleeve_lower[1], main, 11, 12)
        # cuffs
        add_cylinder_piece(b, l_hand + np.array([-0.04, 0.01, 0.0]), l_hand + np.array([0.0, 0.01, 0.0]), sleeve_lower[1]*1.02, sleeve_lower[1]*1.02, trim, 8)
        add_cylinder_piece(b, r_hand + np.array([0.04, 0.01, 0.0]), r_hand + np.array([0.0, 0.01, 0.0]), sleeve_lower[1]*1.02, sleeve_lower[1]*1.02, trim, 12)
    else:
        add_cylinder_piece(b, l_el + np.array([0.07,-0.01,0.0]), l_el + np.array([0.10,-0.015,0.0]), sleeve_upper[1], sleeve_upper[1], accent, 7)
        add_cylinder_piece(b, r_el + np.array([-0.07,-0.01,0.0]), r_el + np.array([-0.10,-0.015,0.0]), sleeve_upper[1], sleeve_upper[1], accent, 11)

    # Collar + hem
    p, n, idx = loft_ellipses([
        ((0.0, neck[1] - 0.012, 0.0), 0.13, 0.11),
        ((0.0, neck[1] + 0.01, 0.0), 0.10, 0.09),
    ], sides=20, close_bottom=False, close_top=False)
    j, w = weights_blend_by_y(p, neck[1] - 0.012, neck[1] + 0.01, 2, 3)
    b.add(p, n, idx, trim, j, w)
    p, n, idx = loft_ellipses([
        ((0.0, hips[1] + 0.02, 0.0), waist_rx * 1.02, depth * 1.02),
        ((0.0, hips[1] + 0.02 + hem_extra, 0.0), waist_rx * 0.99, depth * 0.99),
    ], sides=24, close_bottom=False, close_top=False)
    j, w = weights_blend_by_y(p, hips[1] + 0.02, hips[1] + 0.02 + hem_extra, 0, 1)
    b.add(p, n, idx, trim, j, w)
    return b.arrays()


def build_bottom_variant(kind):
    b = MeshBuilder()
    hips = GLOBAL_POS[0]
    l_hip, l_knee, l_foot = GLOBAL_POS[13], GLOBAL_POS[14], GLOBAL_POS[15]
    r_hip, r_knee, r_foot = GLOBAL_POS[16], GLOBAL_POS[17], GLOBAL_POS[18]

    if kind == 'cargo':
        main = OLIVE; accent = DARKOLIVE; long = True; wide = 0.12
    elif kind == 'denim':
        main = DENIM; accent = BLUE_DARK; long = True; wide = 0.11
    else:
        main = CAMEL; accent = BEIGE; long = False; wide = 0.108

    # hip shell/skirt base
    rings = [
        ((0.0, hips[1] + 0.02, 0.0), 0.20, 0.15),
        ((0.0, hips[1] - 0.08, 0.0), 0.22, 0.16),
        ((0.0, hips[1] - 0.18, 0.0), 0.18, 0.145),
    ]
    p, n, idx = loft_ellipses(rings, sides=22, close_bottom=False, close_top=False)
    j, w = weights_blend_by_y(p, hips[1] - 0.18, hips[1] + 0.02, 0, 13)
    # mix right leg near x<0 lower half
    mask = (p[:,0] < 0) & (p[:,1] < hips[1] - 0.02)
    j[mask,0], j[mask,1] = 0, 16
    w[mask,0], w[mask,1] = 0.45, 0.55
    b.add(p, n, idx, main, j, w)

    left_end = l_foot if long else (l_hip + (l_knee - l_hip) * 0.55)
    right_end = r_foot if long else (r_hip + (r_knee - r_hip) * 0.55)
    add_cylinder_piece(b, l_hip + np.array([0.0,-0.05,0.0]), l_knee if long else left_end, wide, wide * 0.88, main, 13, 14)
    add_cylinder_piece(b, r_hip + np.array([0.0,-0.05,0.0]), r_knee if long else right_end, wide, wide * 0.88, main, 16, 17)
    if long:
        add_cylinder_piece(b, l_knee, l_foot + np.array([0.0,0.03,0.0]), wide * 0.86, wide * 0.72, main, 14, 15)
        add_cylinder_piece(b, r_knee, r_foot + np.array([0.0,0.03,0.0]), wide * 0.86, wide * 0.72, main, 17, 18)
    # cuffs / pockets
    if kind == 'cargo':
        p, n, idx = box(l_hip + np.array([0.09,-0.22,0.08]), 0.08, 0.11, 0.03); j, w = weights_single(len(p), 13); b.add(p,n,idx,accent,j,w)
        p, n, idx = box(r_hip + np.array([-0.09,-0.22,0.08]), 0.08, 0.11, 0.03); j, w = weights_single(len(p), 16); b.add(p,n,idx,accent,j,w)
    return b.arrays()




def build_empty_variant():
    b = MeshBuilder()
    p, n, idx = box((0.0, -50.0, 0.0), 0.001, 0.001, 0.001)
    j, w = weights_single(len(p), 0)
    b.add(p, n, idx, [255, 255, 255, 0], j, w)
    return b.arrays()


def build_shoes_variant(kind):
    b = MeshBuilder()
    l_foot, r_foot = GLOBAL_POS[15], GLOBAL_POS[18]
    if kind == 'runner':
        main, sole = WHITE, BLUE
        sy = 0.11
    elif kind == 'boots':
        main, sole = STONE, BLACK
        sy = 0.18
    else:
        main, sole = BLACK, WHITE
        sy = 0.13
    for center, bone in [(l_foot, 15), (r_foot, 18)]:
        p, n, idx = box(center + np.array([0.0, -0.03 + sy * 0.08, 0.12]), 0.13, sy, 0.32)
        j, w = weights_single(len(p), bone)
        b.add(p, n, idx, main, j, w)
        p, n, idx = box(center + np.array([0.0, -0.07, 0.12]), 0.138, 0.032, 0.33)
        j, w = weights_single(len(p), bone)
        b.add(p, n, idx, sole, j, w)
    return b.arrays()

# -----------------------------
# GLB writer
# -----------------------------

COMPONENT_MAP = {
    np.dtype(np.float32): 5126,
    np.dtype(np.uint16): 5123,
    np.dtype(np.uint32): 5125,
}
TYPE_INFO = {
    1: 'SCALAR',
    2: 'VEC2',
    3: 'VEC3',
    4: 'VEC4',
    16: 'MAT4',
}

class GLBWriter:
    def __init__(self):
        self.json = {
            'asset': {'version': '2.0', 'generator': 'OpenAI custom rig generator'},
            'scene': 0,
            'scenes': [{'nodes': []}],
            'nodes': [],
            'meshes': [],
            'skins': [],
            'materials': [{'pbrMetallicRoughness': {'baseColorFactor': [1,1,1,1], 'metallicFactor': 0.05, 'roughnessFactor': 0.92}, 'doubleSided': True}],
            'buffers': [],
            'bufferViews': [],
            'accessors': [],
        }
        self.bin = bytearray()

    def pad4(self):
        while len(self.bin) % 4 != 0:
            self.bin.extend(b'\x00')

    def add_array(self, arr, target=None, normalized=False):
        arr = np.asarray(arr)
        self.pad4()
        offset = len(self.bin)
        blob = arr.tobytes(order='C')
        self.bin.extend(blob)
        bv = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(blob)}
        if target is not None:
            bv['target'] = target
        bv_idx = len(self.json['bufferViews'])
        self.json['bufferViews'].append(bv)
        comp = COMPONENT_MAP[arr.dtype]
        if arr.ndim == 1:
            count = arr.shape[0]
            typ = 'SCALAR'
            minv = [arr.min().item()] if count else [0]
            maxv = [arr.max().item()] if count else [0]
        else:
            count = arr.shape[0]
            typ = TYPE_INFO[arr.shape[1]]
            minv = arr.min(axis=0).tolist() if count else [0]*arr.shape[1]
            maxv = arr.max(axis=0).tolist() if count else [0]*arr.shape[1]
        acc = {
            'bufferView': bv_idx,
            'componentType': comp,
            'count': int(count),
            'type': typ,
            'normalized': normalized,
            'min': minv,
            'max': maxv,
        }
        # JOINTS_0 shouldn't have min/max requirement but harmless; remove for integer vec4? keep.
        acc_idx = len(self.json['accessors'])
        self.json['accessors'].append(acc)
        return acc_idx

    def add_node(self, name, translation=None, mesh=None, skin=None, children=None):
        node = {'name': name}
        if translation is not None:
            node['translation'] = list(map(float, translation))
        if mesh is not None:
            node['mesh'] = mesh
        if skin is not None:
            node['skin'] = skin
        if children:
            node['children'] = children
        idx = len(self.json['nodes'])
        self.json['nodes'].append(node)
        return idx

    def add_skinned_mesh(self, name, arrays):
        pos_acc = self.add_array(arrays['POSITION'])
        norm_acc = self.add_array(arrays['NORMAL'])
        color_acc = self.add_array(arrays['COLOR_0'])
        joints_acc = self.add_array(arrays['JOINTS_0'])
        weights_acc = self.add_array(arrays['WEIGHTS_0'])
        idx_acc = self.add_array(arrays['indices'], target=34963)
        primitive = {
            'attributes': {
                'POSITION': pos_acc,
                'NORMAL': norm_acc,
                'COLOR_0': color_acc,
                'JOINTS_0': joints_acc,
                'WEIGHTS_0': weights_acc,
            },
            'indices': idx_acc,
            'material': 0,
        }
        mesh_idx = len(self.json['meshes'])
        self.json['meshes'].append({'name': name, 'primitives': [primitive]})
        return mesh_idx

    def build_skeleton_nodes(self):
        node_indices = [None] * len(BONES)
        children_map = {i: [] for i in range(len(BONES))}
        for i, bone in enumerate(BONES):
            if bone.parent is not None:
                children_map[bone.parent].append(i)
        # create in order
        for i, bone in enumerate(BONES):
            node_indices[i] = self.add_node(bone.name, translation=bone.translation)
        # assign children after creation
        for i, bone in enumerate(BONES):
            ch = [node_indices[c] for c in children_map[i]]
            if ch:
                self.json['nodes'][node_indices[i]]['children'] = ch
        return node_indices

    def add_skin(self, node_indices):
        inv_acc = self.add_array(INV_BIND.reshape(len(BONES), 16))
        skin_idx = len(self.json['skins'])
        self.json['skins'].append({
            'name': 'HumanoidSkin',
            'inverseBindMatrices': inv_acc,
            'joints': node_indices,
            'skeleton': node_indices[0],
        })
        return skin_idx

    def write(self, path):
        self.json['buffers'] = [{'byteLength': len(self.bin)}]
        json_bytes = json.dumps(self.json, separators=(',', ':')).encode('utf-8')
        while len(json_bytes) % 4 != 0:
            json_bytes += b' '
        bin_bytes = bytes(self.bin)
        while len(bin_bytes) % 4 != 0:
            bin_bytes += b'\x00'
        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total_len))
            f.write(struct.pack('<I4s', len(json_bytes), b'JSON'))
            f.write(json_bytes)
            f.write(struct.pack('<I4s', len(bin_bytes), b'BIN\x00'))
            f.write(bin_bytes)
        print('wrote', path)


def export_asset(path, arrays):
    w = GLBWriter()
    mesh_idx = w.add_skinned_mesh(path.stem, arrays)
    bone_nodes = w.build_skeleton_nodes()
    skin_idx = w.add_skin(bone_nodes)
    mesh_node = w.add_node(path.stem + '_Mesh', translation=(0,0,0), mesh=mesh_idx, skin=skin_idx)
    w.json['scenes'][0]['nodes'] = [bone_nodes[0], mesh_node]
    w.write(path)


def main():
    export_asset(OUT / 'empty.glb', build_empty_variant())
    export_asset(OUT / 'mannequin.glb', build_body_mesh())
    export_asset(OUT / 'top_bomber.glb', build_top_variant('bomber'))
    export_asset(OUT / 'top_shirt.glb', build_top_variant('shirt'))
    export_asset(OUT / 'top_tee.glb', build_top_variant('tee'))
    export_asset(OUT / 'bottom_cargo.glb', build_bottom_variant('cargo'))
    export_asset(OUT / 'bottom_denim.glb', build_bottom_variant('denim'))
    export_asset(OUT / 'bottom_shorts.glb', build_bottom_variant('shorts'))
    export_asset(OUT / 'shoes_sneaker.glb', build_shoes_variant('sneaker'))
    export_asset(OUT / 'shoes_boot.glb', build_shoes_variant('boots'))
    export_asset(OUT / 'shoes_runner.glb', build_shoes_variant('runner'))

if __name__ == '__main__':
    main()
