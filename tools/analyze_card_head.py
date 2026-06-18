#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "public/assets/sprites/characters/caterpillar"
im = Image.open(ASSETS / "cabeça_largata_card.png").convert("RGBA")
FW, FH = 620, 552
BLEED = 4
px = im.load()

frames = []
for fi in range(4):
    sx = fi * FW
    minx, miny, maxx, maxy = FW, FH, 0, 0
    ok = False
    for y in range(FH):
        for x in range(sx, sx + FW):
            if px[x, y][3] > 10:
                ok = True
                lx, ly = x - sx, y
                minx = min(minx, lx)
                maxx = max(maxx, lx)
                miny = min(miny, ly)
                maxy = max(maxy, ly)
    if not ok:
        continue
    ax0, ax1 = sx + minx, sx + maxx
    ay0, ay1 = miny, maxy
    cx = (ax0 + ax1) / 2
    cy = (ay0 + ay1) / 2
    frames.append({"fi": fi, "cx": cx, "cy": cy, "w": ax1 - ax0 + 1, "h": ay1 - ay0 + 1})

ref = frames[0]
box_w = max(f["w"] for f in frames) + BLEED * 2
box_h = max(f["h"] for f in frames) + BLEED * 2
print(f"ref center {ref['cx']:.1f} box {box_w}x{box_h}")

crops = []
for f in frames:
    sx = f["fi"] * FW
    left = int(round(f["cx"] - box_w / 2))
    top = int(round(f["cy"] - box_h / 2))
    left = max(0, left)
    top = max(0, top)
    right = min(im.width, left + box_w)
    bottom = min(im.height, top + box_h)
    crops.append({"x": left, "y": top, "width": right - left, "height": bottom - top})
    drift = f["cx"] - ref["cx"]
    print(f"  f{f['fi']} drift={drift:+.1f} crop={crops[-1]}")

import json
print(json.dumps(crops, indent=2))
