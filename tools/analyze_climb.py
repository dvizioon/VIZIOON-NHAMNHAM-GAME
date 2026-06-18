#!/usr/bin/env python3
"""Analisa parada_subindo.png e subindo.png — detecta frames verticais."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("pip install pillow")

ASSETS = Path(__file__).resolve().parents[1] / "public/assets/sprites/characters/caterpillar"


def row_has_content(im, y0, y1, alpha_min=10):
    px = im.load()
    for y in range(y0, y1):
        for x in range(im.width):
            if px[x, y][3] > alpha_min:
                return True
    return False


def find_horizontal_gaps(im, alpha_min=10):
  """Linhas vazias horizontais = separadores de frame."""
  px = im.load()
  gaps = []
  in_gap = False
  gap_start = 0
  for y in range(im.height):
    empty = all(px[x, y][3] <= alpha_min for x in range(im.width))
    if empty and not in_gap:
      in_gap = True
      gap_start = y
    elif not empty and in_gap:
      in_gap = False
      if y - gap_start >= 2:
        gaps.append((gap_start, y))
  return gaps


def opaque_bounds(im, x0, y0, x1, y1, alpha_min=10):
    px = im.load()
    minx, miny = x1 - x0, y1 - y0
    maxx, maxy = 0, 0
    found = False
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > alpha_min:
                found = True
                lx, ly = x - x0, y - y0
                minx = min(minx, lx)
                maxx = max(maxx, lx)
                miny = min(miny, ly)
                maxy = max(maxy, ly)
    if not found:
        return None
    return minx, miny, maxx, maxy


def analyze_grid(fn, fw, fh, count):
    path = ASSETS / fn
    im = Image.open(path).convert("RGBA")
    print(f"\n=== {fn} grid {fw}x{fh} x{count} ===")
    crops = []
    for fi in range(count):
        sx, sy = 0, fi * fh
        bounds = opaque_bounds(im, sx, sy, sx + fw, sy + fh)
        if not bounds:
            print(f"  f{fi}: empty")
            continue
        lmin, tmin, lmax, bmax = bounds
        abs_minx = sx + lmin
        abs_miny = sy + tmin
        abs_maxx = sx + lmax
        abs_maxy = sy + bmax
        cx = max(0, abs_minx - 4)
        cy = max(0, abs_miny - 4)
        cx2 = min(im.width, abs_maxx + 1 + 4)
        cy2 = min(im.height, abs_maxy + 1 + 4)
        cw, ch = cx2 - cx, cy2 - cy
        center_x = (abs_minx + abs_maxx) / 2
        slot_center = fw / 2
        drift = center_x - slot_center
        print(
            f"  f{fi} y={sy}-{sy+fh} centerX={center_x:.1f} drift={drift:+.1f} "
            f"crop={{x:{cx}, y:{cy}, w:{cw}, h:{ch}}}"
        )
        crops.append({"x": cx, "y": cy, "width": cw, "height": ch})
    return crops


def analyze(fn):
    path = ASSETS / fn
    im = Image.open(path).convert("RGBA")
    print(f"\n=== {fn} {im.size[0]}x{im.size[1]} ===")
    gaps = find_horizontal_gaps(im)
    print(f"  gaps horizontais (y): {gaps}")
    bounds = [0] + [g[1] for g in gaps] + [im.height]
    blocks = []
    for i in range(len(bounds) - 1):
        y0, y1 = bounds[i], bounds[i + 1]
        if row_has_content(im, y0, y1):
            blocks.append((y0, y1, y1 - y0))
    print(f"  blocos de conteúdo: {len(blocks)}")
    for i, (y0, y1, h) in enumerate(blocks):
        print(f"    f{i}: y={y0}-{y1} h={h}")


def count_slots(fn, fh):
    im = Image.open(ASSETS / fn).convert("RGBA")
    px = im.load()
    n = im.height // fh
    active = 0
    for i in range(n):
        y0, y1 = i * fh, (i + 1) * fh
        if any(px[x, y][3] > 10 for y in range(y0, y1) for x in range(im.width)):
            active += 1
    return n, active


if __name__ == "__main__":
    for f in ("parada_subindo.png", "subindo.png"):
        analyze(f)

    climb_crops = analyze_grid("subindo.png", 702, 272, 5)
    idle_crops = analyze_grid("parada_subindo.png", 702, 272, 5)

    print("\n--- grade 2 frames (681px) ---")
    climb2 = analyze_grid("subindo.png", 702, 681, 2)
    idle2 = analyze_grid("parada_subindo.png", 702, 681, 2)

    out = Path(__file__).resolve().parent / "climb_frame_crops.json"
    import json
    out.write_text(json.dumps({
        "climb5": climb_crops,
        "climbIdle5": idle_crops,
        "climb2": climb2,
        "climbIdle2": idle2,
    }, indent=2), encoding="utf-8")
    print(f"\nSalvo: {out}")
