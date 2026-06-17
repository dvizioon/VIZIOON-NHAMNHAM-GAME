#!/usr/bin/env python3
"""Exporta preview de cada frame recortado (crop sugerido) para inspecao visual."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "sprites" / "characters" / "caterpillar"
OUT = ROOT / "tools" / "previews"
OUT.mkdir(parents=True, exist_ok=True)

CROPS = {
    "rise_old_f3": {"file": "erguendo.png", "x": 2106, "y": 63, "w": 362, "h": 384},
    "rise_new_f3": {"file": "erguendo.png", "x": 2023, "y": 59, "w": 448, "h": 392},
    "rise_new_f0": {"file": "erguendo.png", "x": 53, "y": 59, "w": 438, "h": 392},
    "idle_f0": {"file": "parada.png", "x": 56, "y": 5, "w": 392, "h": 492},
}


def edge_profile(im, label):
    px = im.load()
    w, h = im.size
    mid = h // 2
    xs = [x for x in range(w) if px[x, mid][3] > 10]
    if not xs:
        return
    print(f"{label}: midY={mid} opaque x={xs[0]}-{xs[-1]} w={xs[-1]-xs[0]+1}")


for name, c in CROPS.items():
    im = Image.open(ASSETS / c["file"]).convert("RGBA")
    crop = im.crop((c["x"], c["y"], c["x"] + c["w"], c["y"] + c["h"]))
    edge_profile(crop, name)
    crop.save(OUT / f"{name}.png")

print(f"Previews em {OUT}")
