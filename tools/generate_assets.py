import math
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
TEXTURES = os.path.join(ASSETS, "textures")
RNG = np.random.default_rng(20261109)


class ObjWriter:
    def __init__(self):
        self.vertices = []
        self.faces = []

    def add_vertex(self, position, normal, uv):
        self.vertices.append((position, normal, uv))
        return len(self.vertices)

    def add_polygon(self, vertices):
        ids = [self.add_vertex(*vertex) for vertex in vertices]
        for i in range(1, len(ids) - 1):
            self.faces.append((ids[0], ids[i], ids[i + 1]))

    def write(self, path, name, mtllib):
        lines = [f"mtllib {mtllib}", f"o {name}"]
        for position, normal, uv in self.vertices:
            lines.append(f"v {position[0]:.6f} {position[1]:.6f} {position[2]:.6f}")
            lines.append(f"vt {uv[0]:.6f} {uv[1]:.6f}")
            lines.append(f"vn {normal[0]:.6f} {normal[1]:.6f} {normal[2]:.6f}")
        for face in self.faces:
            lines.append("f " + " ".join(f"{i}/{i}/{i}" for i in face))
        with open(path, "w", encoding="utf-8") as file:
            file.write("\n".join(lines) + "\n")


def write_mtl(path, name, diffuse, texture=None):
    lines = [
        f"newmtl {name}",
        "Ka 0.100 0.100 0.100",
        f"Kd {diffuse[0]:.4f} {diffuse[1]:.4f} {diffuse[2]:.4f}",
        "Ks 0.500 0.500 0.500",
        "Ns 48.0",
        "d 1.0",
        "illum 2",
    ]
    if texture:
        lines.append(f"map_Kd {texture}")
    with open(path, "w", encoding="utf-8") as file:
        file.write("\n".join(lines) + "\n")


def make_car_body():
    width = 0.6
    height = 0.24
    depth = 1.0
    center_y = 0.30
    x0, x1 = -width / 2, width / 2
    y0, y1 = center_y - height / 2, center_y + height / 2
    z0, z1 = -depth / 2, depth / 2
    uvs = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
    faces = [
        ([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0.0, 0.0, -1.0)),
        ([(x1, y0, z1), (x0, y0, z1), (x0, y1, z1), (x1, y1, z1)], (0.0, 0.0, 1.0)),
        ([(x0, y0, z1), (x0, y0, z0), (x0, y1, z0), (x0, y1, z1)], (-1.0, 0.0, 0.0)),
        ([(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], (1.0, 0.0, 0.0)),
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0.0, 1.0, 0.0)),
        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0.0, -1.0, 0.0)),
    ]
    writer = ObjWriter()
    for corners, normal in faces:
        writer.add_polygon([
            (corner, normal, uvs[index])
            for index, corner in enumerate(corners)
        ])
    writer.write(os.path.join(ASSETS, "car_body.obj"), "car_body", "car_body.mtl")


def add_cylinder(writer, center, radius, half_width, segments=24):
    cx, cy, cz = center
    for i in range(segments):
        a0 = 2.0 * math.pi * i / segments
        a1 = 2.0 * math.pi * (i + 1) / segments
        n0 = (0.0, math.cos(a0), math.sin(a0))
        n1 = (0.0, math.cos(a1), math.sin(a1))
        p0 = (cx - half_width, cy + radius * n0[1], cz + radius * n0[2])
        p1 = (cx - half_width, cy + radius * n1[1], cz + radius * n1[2])
        p2 = (cx + half_width, cy + radius * n1[1], cz + radius * n1[2])
        p3 = (cx + half_width, cy + radius * n0[1], cz + radius * n0[2])
        u0 = i / segments
        u1 = (i + 1) / segments
        writer.add_polygon([
            (p0, n0, (u0, 0.0)),
            (p1, n1, (u1, 0.0)),
            (p2, n1, (u1, 1.0)),
            (p3, n0, (u0, 1.0)),
        ])

    for side, x, normal in ((-1, cx - half_width, (-1.0, 0.0, 0.0)), (1, cx + half_width, (1.0, 0.0, 0.0))):
        center_vertex = ((x, cy, cz), normal, (0.5, 0.5))
        ring = []
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            y = cy + radius * math.cos(angle)
            z = cz + radius * math.sin(angle)
            uv = (0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle))
            ring.append(((x, y, z), normal, uv))
        for i in range(segments):
            p0 = ring[i]
            p1 = ring[(i + 1) % segments]
            if side < 0:
                writer.add_polygon([center_vertex, p1, p0])
            else:
                writer.add_polygon([center_vertex, p0, p1])


def make_car_wheels():
    writer = ObjWriter()
    radius = 0.18
    half_width = 0.06
    wheel_y = 0.18
    for x in (-0.32, 0.32):
        for z in (-0.32, 0.32):
            add_cylinder(writer, (x, wheel_y, z), radius, half_width)
    writer.write(os.path.join(ASSETS, "car_wheels.obj"), "car_wheels", "car_wheels.mtl")


def make_coin():
    writer = ObjWriter()
    radius = 1.0
    half_height = 0.18
    segments = 24
    for i in range(segments):
        a0 = 2.0 * math.pi * i / segments
        a1 = 2.0 * math.pi * (i + 1) / segments
        n0 = (math.cos(a0), 0.0, math.sin(a0))
        n1 = (math.cos(a1), 0.0, math.sin(a1))
        p0 = (radius * n0[0], -half_height, radius * n0[2])
        p1 = (radius * n0[0], half_height, radius * n0[2])
        p2 = (radius * n1[0], half_height, radius * n1[2])
        p3 = (radius * n1[0], -half_height, radius * n1[2])
        writer.add_polygon([
            (p0, n0, (i / segments, 0.0)),
            (p1, n0, (i / segments, 1.0)),
            (p2, n1, ((i + 1) / segments, 1.0)),
            (p3, n1, ((i + 1) / segments, 0.0)),
        ])

    for y, normal, reverse in ((half_height, (0.0, 1.0, 0.0), True), (-half_height, (0.0, -1.0, 0.0), False)):
        center = ((0.0, y, 0.0), normal, (0.5, 0.5))
        ring = []
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            ring.append((
                (radius * math.cos(angle), y, radius * math.sin(angle)),
                normal,
                (0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)),
            ))
        for i in range(segments):
            p0 = ring[i]
            p1 = ring[(i + 1) % segments]
            writer.add_polygon([center, p1, p0] if reverse else [center, p0, p1])
    writer.write(os.path.join(ASSETS, "coin.obj"), "coin", "coin.mtl")


def make_cone():
    writer = ObjWriter()
    radius = 0.5
    height = 1.0
    segments = 24
    slope = radius / height
    for i in range(segments):
        a0 = 2.0 * math.pi * i / segments
        a1 = 2.0 * math.pi * (i + 1) / segments
        n0 = (math.cos(a0), slope, math.sin(a0))
        n1 = (math.cos(a1), slope, math.sin(a1))
        base0 = ((radius * math.cos(a0), 0.0, radius * math.sin(a0)), n0, (i / segments, 0.0))
        base1 = ((radius * math.cos(a1), 0.0, radius * math.sin(a1)), n1, ((i + 1) / segments, 0.0))
        tip = ((0.0, height, 0.0), n0, (i / segments, 1.0))
        writer.add_polygon([base0, tip, base1])

    normal = (0.0, -1.0, 0.0)
    center = ((0.0, 0.0, 0.0), normal, (0.5, 0.5))
    ring = []
    for i in range(segments):
        angle = 2.0 * math.pi * i / segments
        ring.append((
            (radius * math.cos(angle), 0.0, radius * math.sin(angle)),
            normal,
            (0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)),
        ))
    for i in range(segments):
        writer.add_polygon([center, ring[i], ring[(i + 1) % segments]])
    writer.write(os.path.join(ASSETS, "cone.obj"), "cone", "cone.mtl")


def make_sphere():
    segments = 48
    rings = 32
    writer = ObjWriter()
    ids = []
    for ring in range(rings + 1):
        v = ring / rings
        theta = v * math.pi
        row = []
        for segment in range(segments + 1):
            u = segment / segments
            phi = u * math.pi * 2.0
            position = (
                math.sin(theta) * math.cos(phi),
                math.cos(theta),
                math.sin(theta) * math.sin(phi),
            )
            normal = position
            uv = (u, 1.0 - v)
            row.append(writer.add_vertex(position, normal, uv))
        ids.append(row)

    for ring in range(rings):
        for segment in range(segments):
            a = ids[ring][segment]
            b = ids[ring + 1][segment]
            c = ids[ring][segment + 1]
            d = ids[ring + 1][segment + 1]
            writer.faces.append((a, b, c))
            writer.faces.append((c, b, d))

    writer.write(os.path.join(ASSETS, "sphere.obj"), "sphere", "sphere.mtl")


def periodic_noise(height, width, grid, rng):
    values = rng.random((grid, grid))
    yy = np.arange(height) * grid / height
    xx = np.arange(width) * grid / width
    y0 = np.floor(yy).astype(int) % grid
    x0 = np.floor(xx).astype(int) % grid
    y1 = (y0 + 1) % grid
    x1 = (x0 + 1) % grid
    fy = yy - np.floor(yy)
    fx = xx - np.floor(xx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    fx = fx * fx * (3.0 - 2.0 * fx)
    n00 = values[y0[:, None], x0[None, :]]
    n10 = values[y1[:, None], x0[None, :]]
    n01 = values[y0[:, None], x1[None, :]]
    n11 = values[y1[:, None], x1[None, :]]
    nx0 = n00 * (1.0 - fx[None, :]) + n01 * fx[None, :]
    nx1 = n10 * (1.0 - fx[None, :]) + n11 * fx[None, :]
    return nx0 * (1.0 - fy[:, None]) + nx1 * fy[:, None]


def make_planet_noise():
    size = 512
    value = np.zeros((size, size))
    amplitude = 1.0
    total = 0.0
    for grid in (4, 8, 16, 32, 64):
        value += periodic_noise(size, size, grid, RNG) * amplitude
        total += amplitude
        amplitude *= 0.55
    value /= total
    low, high = np.percentile(value, [2.0, 98.0])
    value = np.clip((value - low) / (high - low), 0.0, 1.0)
    value = 0.62 + 0.38 * value
    pixels = (value * 255.0).astype(np.uint8)
    image = Image.fromarray(np.stack([pixels, pixels, pixels], axis=-1), "RGB")
    image.save(os.path.join(TEXTURES, "planet_noise.png"), optimize=True)


def subgeodesic_centers(frequency):
    phi = (1.0 + math.sqrt(5.0)) * 0.5
    base = [
        (-1.0, phi, 0.0), (1.0, phi, 0.0),
        (-1.0, -phi, 0.0), (1.0, -phi, 0.0),
        (0.0, -1.0, phi), (0.0, 1.0, phi),
        (0.0, -1.0, -phi), (0.0, 1.0, -phi),
        (phi, 0.0, -1.0), (phi, 0.0, 1.0),
        (-phi, 0.0, -1.0), (-phi, 0.0, 1.0),
    ]
    base = [
        np.asarray(vertex, dtype=np.float64) / np.linalg.norm(vertex)
        for vertex in base
    ]
    faces = [
        (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
        (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
        (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
        (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
    ]
    unique = {}
    for face in faces:
        a, b, c = (base[index] for index in face)
        for i in range(frequency + 1):
            for j in range(frequency + 1 - i):
                k = frequency - i - j
                point = (a * k + b * i + c * j) / frequency
                point /= np.linalg.norm(point)
                unique[tuple(np.round(point, 8))] = point
    return np.asarray([unique[key] for key in sorted(unique.keys())], dtype=np.float32)


def make_earth_hex_grid():
    width = 1024
    height = 512
    centers = subgeodesic_centers(6)
    lon = (np.arange(width, dtype=np.float32) + 0.5) * (2.0 * math.pi / width) - math.pi
    lat = (np.arange(height, dtype=np.float32) + 0.5) * (math.pi / height) - math.pi * 0.5
    cos_lat = np.cos(lat)
    y = np.sin(lat)
    x_surface = np.cos(lon)[None, :] * cos_lat[:, None]
    z_surface = np.sin(lon)[None, :] * cos_lat[:, None]
    pixels = np.zeros((height, width, 3), dtype=np.float32)

    for start in range(0, height, 32):
        end = min(start + 32, height)
        directions = np.stack([
            x_surface[start:end].reshape(-1),
            np.broadcast_to(y[start:end, None], (end - start, width)).reshape(-1),
            z_surface[start:end].reshape(-1),
        ], axis=1)
        dots = directions @ centers.T
        top = np.argpartition(dots, -2, axis=1)[:, -2:]
        values = np.take_along_axis(dots, top, axis=1)
        edge = values.max(axis=1) - values.min(axis=1)

        line = (edge < 0.002).astype(np.float32).reshape(end - start, width)
        block = np.zeros((end - start, width, 3), dtype=np.float32)
        block[:, :, 0] = 0.055 + line * 0.945
        block[:, :, 1] = 0.015 + line * 0.165
        block[:, :, 2] = 0.11 + line * 0.61
        pixels[start:end] = np.clip(block * 255.0, 0.0, 255.0)

    Image.fromarray(pixels.astype(np.uint8), "RGB").save(
        os.path.join(TEXTURES, "earth_hex_grid.png"),
        optimize=True,
    )


def make_car_spot():
    size = 512
    image = Image.new("RGB", (size, size), (188, 28, 24))
    draw = ImageDraw.Draw(image)
    colors = [(112, 10, 10), (138, 16, 15), (218, 54, 35), (238, 92, 48)]
    for i in range(64):
        cx, cy = RNG.integers(0, size, 2)
        rx = int(RNG.integers(12, 52))
        ry = int(rx * RNG.uniform(0.55, 1.45))
        color = colors[int(RNG.integers(0, len(colors)))]
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                draw.ellipse(
                    [cx + dx - rx, cy + dy - ry, cx + dx + rx, cy + dy + ry],
                    fill=color,
                )
    pixels = np.asarray(image).astype(np.float32)
    grain = (periodic_noise(size, size, 64, RNG) - 0.5) * 20.0
    pixels = np.clip(pixels + grain[:, :, None], 0.0, 255.0).astype(np.uint8)
    Image.fromarray(pixels, "RGB").save(os.path.join(TEXTURES, "car_spot.png"), optimize=True)


def make_cone_texture():
    size = 256
    pixels = np.zeros((size, size, 3), dtype=np.uint8)
    pixels[:, :] = (255, 122, 28)
    for center, width in ((0.72, 0.035), (0.82, 0.03), (0.91, 0.025)):
        low = int(round((1.0 - center - width * 0.5) * size))
        high = int(round((1.0 - center + width * 0.5) * size))
        pixels[low:high, :] = (255, 245, 235)
    Image.fromarray(pixels, "RGB").save(
        os.path.join(TEXTURES, "cone_stripes.png"),
        optimize=True,
    )


def main():
    os.makedirs(TEXTURES, exist_ok=True)
    make_car_body()
    make_car_wheels()
    make_coin()
    make_cone()
    make_sphere()
    write_mtl(os.path.join(ASSETS, "car_body.mtl"), "car_body", (1.0, 1.0, 1.0), "textures/car_spot.png")
    write_mtl(os.path.join(ASSETS, "car_wheels.mtl"), "car_wheels", (0.035, 0.035, 0.04))
    write_mtl(os.path.join(ASSETS, "coin.mtl"), "coin", (1.0, 0.82, 0.12))
    write_mtl(os.path.join(ASSETS, "cone.mtl"), "cone", (0.9, 0.48, 0.2), "textures/cone_stripes.png")
    write_mtl(os.path.join(ASSETS, "sphere.mtl"), "sphere", (1.0, 1.0, 1.0), "textures/planet_noise.png")
    make_planet_noise()
    make_earth_hex_grid()
    make_car_spot()
    make_cone_texture()


if __name__ == "__main__":
    main()
