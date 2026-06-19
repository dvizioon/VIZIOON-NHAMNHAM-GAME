#!/usr/bin/env python3
"""Reempacota mexendo.png: 6 frames sem bleed do vizinho."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/sprites/ui/cocoon/mexendo.png"
BAK = ROOT / "public/assets/sprites/ui/cocoon/mexendo.before-normalize.png"
OUT = SRC
CROPS_JSON = ROOT / "tools/cocoon_wobble_crops.json"

FRAME_COUNT = 6
ALPHA_MIN = 12
GAP_MIN_WIDTH = 24
BLEED = 2
CELL_PAD_X = 56
CELL_PAD_Y = 20
STEM_ANCHOR_X = 0.5
STEM_ANCHOR_Y = 0.04


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


def trim_frame(frame: Image.Image) -> Image.Image:
    bbox = content_bbox(frame)
    if not bbox:
        return frame
    left, top, right, bottom = bbox
    left = max(0, left - BLEED)
    top = max(0, top - BLEED)
    right = min(frame.size[0] - 1, right + BLEED)
    bottom = min(frame.size[1] - 1, bottom + BLEED)
    return frame.crop((left, top, right + 1, bottom + 1))


def stem_pin(frame: Image.Image) -> tuple[int, int]:
    bbox = content_bbox(frame)
    if not bbox:
        return frame.size[0] // 2, 0
    left, top, right, bottom = bbox
    return (
        left + int((right - left) * STEM_ANCHOR_X),
        top + int((bottom - top) * STEM_ANCHOR_Y),
    )


def normalize_frames(raw_frames: list[Image.Image]) -> tuple[Image.Image, int, int, list[dict]]:
    trimmed = [trim_frame(f) for f in raw_frames]
    pin_x, pin_y = stem_pin(trimmed[0])

    placements: list[tuple[Image.Image, int, int]] = []
    min_left = 10**9
    max_right = 0
    max_bottom = 0
    for frame in trimmed:
        fx, fy = stem_pin(frame)
        dx, dy = pin_x - fx, pin_y - fy
        placements.append((frame, dx, dy))
        bbox = content_bbox(frame)
        if bbox:
            min_left = min(min_left, dx + bbox[0])
            max_right = max(max_right, dx + bbox[2])
            max_bottom = max(max_bottom, dy + bbox[3])

    if min_left == 10**9:
        min_left = 0

    cell_w = int(max_right - min_left + CELL_PAD_X * 2)
    cell_h = int(max(max_bottom + CELL_PAD_Y, pin_y + CELL_PAD_Y * 2))
    shift_x = CELL_PAD_X - min_left

    sheet = Image.new("RGBA", (cell_w * len(placements), cell_h), (0, 0, 0, 0))
    crops: list[dict] = []
    for i, (frame, dx, dy) in enumerate(placements):
        cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        cell.paste(frame, (dx + shift_x, dy), frame)
        sheet.paste(cell, (i * cell_w, 0))
        crops.append({
            "frame": i,
            "x": i * cell_w,
            "y": 0,
            "width": cell_w,
            "height": cell_h,
            "stemX": pin_x + shift_x + i * cell_w,
            "stemY": pin_y,
        })

    return sheet, cell_w, cell_h, crops


def main() -> None:
    source = BAK if BAK.exists() else SRC
    im = Image.open(source).convert("RGBA")
    print(f"source: {source.name} {im.size}")

    if not BAK.exists() and source == SRC:
        im.save(BAK)
        print(f"backup: {BAK}")

    splits = find_frame_splits(im, FRAME_COUNT)
    print("splits:", splits, "widths:", [b - a for a, b in splits])

    raw_frames = [im.crop((a, 0, b, im.size[1])) for a, b in splits]
    sheet, cell_w, cell_h, crops = normalize_frames(raw_frames)
    sheet.save(OUT)

    meta = {
        "frameCount": FRAME_COUNT,
        "frameWidth": cell_w,
        "frameHeight": cell_h,
        "sheetWidth": sheet.size[0],
        "sheetHeight": sheet.size[1],
        "originY": STEM_ANCHOR_Y,
        "frames": crops,
    }
    CROPS_JSON.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"output: {sheet.size}  cells={cell_w}x{cell_h}")
    print(f"crops: {CROPS_JSON.relative_to(ROOT)}")
    print("cocoonConfig.js:")
    print(f"  COCOON_FRAME_COUNT={FRAME_COUNT}")
    print(f"  COCOON_FRAME_W={cell_w}")
    print(f"  COCOON_FRAME_H={cell_h}")


if __name__ == "__main__":
    main()
