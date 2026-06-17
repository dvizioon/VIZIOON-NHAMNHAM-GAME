#!/usr/bin/env python3
"""Analisa folhas de cabeca do caterpillar."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "sprites" / "characters" / "caterpillar"

HEADS = {
    "headIdle": ("cabeça_parada.png", 560, 510, 100, 4),
    "headRise": ("cabeça_erguendo.png", 575, 502, 100, 4),
    "headWalk": ("cabeça_andando.png", 575, 502, 100, 4),
}

BLEED = 4


def slot_x(fi, fw, sp):
    return fi * (fw + sp)


def bounds(im, x0, x1, y1, alpha=10):
    px = im.load()
    minx, miny, maxx, maxy = x1 - x0, y1, 0, 0
    ok = False
    for y in range(y1):
        for x in range(x0, x1):
            if px[x, y][3] > alpha:
                ok = True
                lx, ly = x - x0, y
                minx = min(minx, lx)
                maxx = max(maxx, lx)
                miny = min(miny, ly)
                maxy = max(maxy, ly)
    return (minx, miny, maxx, maxy) if ok else None


for name, (fn, fw, fh, sp, n) in HEADS.items():
    im = Image.open(ASSETS / fn).convert("RGBA")
    print(f"\n=== {name} {im.size} frame {fw}x{fh} sp {sp} ===")
    for fi in range(n):
        sx = slot_x(fi, fw, sp)
        b = bounds(im, max(0, sx - 100), min(im.width, sx + fw + 120), fh)
        if not b:
            continue
        lmin, tmin, lmax, bmax = b
        ax0, ax1 = sx - 100 + lmin, sx - 100 + lmax
        if sx - 100 < 0:
            ax0, ax1 = lmin, lmax  # simplified
        # recompute absolute
        search_x0 = max(0, sx - 100)
        abs_minx = search_x0 + lmin
        abs_maxx = search_x0 + lmax
        cx = max(0, abs_minx - BLEED)
        cy = max(0, tmin - BLEED)
        cx2 = min(im.width, abs_maxx + 1 + BLEED)
        cy2 = min(im.height, bmax + 1 + BLEED)
        mid = (tmin + bmax) // 2
        row = [x for x in range(abs_minx, abs_maxx + 1) if im.getpixel((x, mid))[3] > 10]
        print(
            f"  f{fi} slot={sx} opaco={abs_minx}-{abs_maxx} "
            f"crop={{x:{cx},y:{cy},w:{cx2-cx},h:{cy2-cy}}} mid={row[0]}-{row[-1] if row else '?'}"
        )
