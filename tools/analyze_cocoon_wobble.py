#!/usr/bin/env python3
"""Analisa mexendo.png — detecta bleed entre frames do casulo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/sprites/ui/cocoon/mexendo.png"
FRAME_COUNT = 6
ALPHA_MIN = 12
GAP_MIN_WIDTH = 24


def column_density(im: Image.Image) -> list[int]:
    pixels = im.load()
    w, h = im.size
    return [sum(1 for y in range(h) if pixels[x, y][3] > ALPHA_MIN) for x in range(w)]


def find_frame_splits(im: Image.Image, frame_count: int) -> list[tuple[int, int]]:
    w, _ = im.size
    density = column_density(im)
    threshold = max(density) * 0.02
    empty = [d <= threshold for d in density]

    runs: list[tuple[int, int]] = []
    i = 0
    while i < w:
        if not empty[i]:
            i += 1
            continue
        start = i
        while i < w and empty[i]:
            i += 1
        if (i - start) >= GAP_MIN_WIDTH:
            runs.append((start, i - 1))

    if len(runs) >= frame_count - 1:
        cuts = [0]
        for a, b in runs[: frame_count - 1]:
            cuts.append((a + b) // 2)
        cuts.append(w)
        return [(cuts[i], cuts[i + 1]) for i in range(frame_count)]

    fw = w // frame_count
    return [(i * fw, w if i == frame_count - 1 else (i + 1) * fw) for i in range(frame_count)]


def content_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.split()[-1].getbbox()


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    print(f"source: {SRC.name} {w}x{h}")

    equal_fw = w // FRAME_COUNT
    print(f"equal split fw={equal_fw}")
    for i in range(FRAME_COUNT):
        f = im.crop((i * equal_fw, 0, (i + 1) * equal_fw, h))
        b = content_bbox(f)
        bw = (b[2] - b[0] + 1) if b else 0
        print(f"  f{i} bbox={b} content_w={bw}")

    splits = find_frame_splits(im, FRAME_COUNT)
    print("gap splits:", splits, "widths:", [b - a for a, b in splits])


if __name__ == "__main__":
    main()
