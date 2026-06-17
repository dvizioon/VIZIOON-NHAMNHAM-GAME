#!/usr/bin/env python3
"""Analisa spritesheets do caterpillar — bounds opacos + frameCrops sugeridos."""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Instale Pillow: pip install pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "sprites" / "characters" / "caterpillar"

SHEETS = {
    "idle": ("parada.png", 402, 510, 300, 4),
    "rise": ("erguendo.png", 402, 510, 300, 4),
    "walk": ("andando.png", 402, 510, 300, 4),
}

BLEED = 4  # px extra além do tight bounds (como parada idle f0)


def slot_x(frame_index: int, fw: int, spacing: int) -> int:
    return frame_index * (fw + spacing)


def opaque_bounds(im: Image.Image, x0: int, y0: int, x1: int, y1: int, alpha_min: int = 10):
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


def analyze_sheet(name: str, filename: str, fw: int, fh: int, spacing: int, count: int):
    path = ASSETS / filename
    im = Image.open(path).convert("RGBA")
    print(f"\n=== {name} ({filename}) {im.size[0]}x{im.size[1]} ===")
    print(f"  grade Phaser: frame {fw}x{fh}, spacing {spacing}, slots {count}")

    crops = []
    for fi in range(count):
        sx = slot_x(fi, fw, spacing)
        slot_end_x = sx + fw
        # busca opaco no slot + bleed nas laterais (como parada)
        search_x0 = max(0, sx - 80)
        search_x1 = min(im.width, slot_end_x + 120)
        bounds = opaque_bounds(im, search_x0, 0, search_x1, fh)
        if not bounds:
            print(f"  f{fi}: SEM PIXELS")
            continue
        lmin, tmin, lmax, bmax = bounds
        # coords absolutas na folha
        abs_minx = search_x0 + lmin
        abs_miny = tmin
        abs_maxx = search_x0 + lmax
        abs_maxy = bmax

        # tight
        tw = abs_maxx - abs_minx + 1
        th = abs_maxy - abs_miny + 1

        # crop com bleed (clamp na imagem)
        cx = max(0, abs_minx - BLEED)
        cy = max(0, abs_miny - BLEED)
        cx2 = min(im.width, abs_maxx + 1 + BLEED)
        cy2 = min(im.height, abs_maxy + 1 + BLEED)
        cw, ch = cx2 - cx, cy2 - cy

        slot_rel_left = abs_minx - sx
        slot_rel_right = abs_maxx - sx
        print(
            f"  f{fi} slot x={sx}-{slot_end_x} | "
            f"opaco x={abs_minx}-{abs_maxx} y={abs_miny}-{abs_maxy} ({tw}x{th}) | "
            f"rel slot L={slot_rel_left} R={slot_rel_right} | "
            f"crop {{x:{cx}, y:{cy}, w:{cw}, h:{ch}}}"
        )

        # perfil horizontal no meio — detecta borda reta
        mid_y = (abs_miny + abs_maxy) // 2
        row_x = [x for x in range(abs_minx, abs_maxx + 1) if im.getpixel((x, mid_y))[3] > 10]
        if row_x:
            left_flat = all(im.getpixel((x, mid_y))[3] > 10 for x in range(row_x[0], row_x[0] + 3))
            right_flat = all(im.getpixel((x, mid_y))[3] > 10 for x in range(row_x[-1] - 2, row_x[-1] + 1))
            print(f"       midY={mid_y} span={row_x[0]}-{row_x[-1]} left_flat={left_flat} right_flat={right_flat}")

        crops.append({"x": cx, "y": cy, "width": cw, "height": ch})

    return crops


def main():
    all_crops = {}
    for name, (fn, fw, fh, sp, n) in SHEETS.items():
        all_crops[name] = analyze_sheet(name, fn, fw, fh, sp, n)

    out = ROOT / "tools" / "suggested_frame_crops.json"
    out.write_text(json.dumps(all_crops, indent=2), encoding="utf-8")
    print(f"\nSalvo: {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
