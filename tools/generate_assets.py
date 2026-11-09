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


def main():
    os.makedirs(TEXTURES, exist_ok=True)
    make_car_body()
    make_car_wheels()
    make_sphere()
    write_mtl(os.path.join(ASSETS, "car_body.mtl"), "car_body", (1.0, 1.0, 1.0), "textures/car_spot.png")
    write_mtl(os.path.join(ASSETS, "car_wheels.mtl"), "car_wheels", (0.035, 0.035, 0.04))
    write_mtl(os.path.join(ASSETS, "sphere.mtl"), "sphere", (1.0, 1.0, 1.0), "textures/planet_noise.png")
    make_planet_noise()
    make_car_spot()


if __name__ == "__main__":
    main()
