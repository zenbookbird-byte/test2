#!/usr/bin/env python3
"""Generate Slipstream extension icons (pure stdlib, no PIL)."""
import struct, zlib, math, os

OUT = os.path.join(os.path.dirname(__file__), "icons")

BG = (7, 9, 13)
TEAL = (94, 234, 212)
CYAN = (34, 211, 238)
INDIGO = (129, 140, 248)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(size):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]
    r = size * 0.22  # corner radius
    for y in range(size):
        for x in range(size):
            # rounded-rect mask
            dx = min(x, size - 1 - x)
            dy = min(y, size - 1 - y)
            inside = True
            if dx < r and dy < r:
                if math.hypot(r - dx, r - dy) > r:
                    inside = False
            if not inside:
                continue
            # vertical gradient background
            t = y / size
            bg = lerp((10, 14, 20), (7, 9, 13), t)
            px[y][x] = (bg[0], bg[1], bg[2], 255)

    # three "slipstream" wave lines
    waves = [
        (0.62, TEAL, 255),
        (0.50, CYAN, 200),
        (0.38, INDIGO, 150),
    ]
    thick = max(1.0, size * 0.085)
    for cy_frac, color, alpha in waves:
        amp = size * 0.10
        for x in range(size):
            xn = x / size
            cy = size * cy_frac - math.sin(xn * math.pi) * amp
            for y in range(size):
                d = abs(y - cy)
                if d < thick:
                    edge = 1.0 - (d / thick)
                    a = int(alpha * min(1.0, edge * 1.6))
                    if a <= 0:
                        continue
                    base = px[y][x]
                    if base[3] == 0:
                        continue
                    f = a / 255
                    px[y][x] = (
                        int(base[0] + (color[0] - base[0]) * f),
                        int(base[1] + (color[1] - base[1]) * f),
                        int(base[2] + (color[2] - base[2]) * f),
                        255,
                    )

    # leading dot top-right
    dot_r = size * 0.10
    dx0, dy0 = size * 0.80, size * 0.30
    for y in range(size):
        for x in range(size):
            if px[y][x][3] == 0:
                continue
            if math.hypot(x - dx0, y - dy0) < dot_r:
                px[y][x] = (TEAL[0], TEAL[1], TEAL[2], 255)
    return px


def write_png(path, px):
    size = len(px)
    raw = bytearray()
    for row in px:
        raw.append(0)
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


for s in (16, 32, 48, 128):
    write_png(os.path.join(OUT, f"icon{s}.png"), make(s))
    print(f"icon{s}.png")
