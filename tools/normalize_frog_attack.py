"""Reempacota atacando.png: 3 frames de largura igual, corpo alinhado."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public/assets/sprites/enemies/frog/atacando.png'
BAK = ROOT / 'public/assets/sprites/enemies/frog/atacando.before-normalize.png'
OUT = SRC

FRAME_COUNT = 3
BODY_ANCHOR_X = 0.14
BODY_ANCHOR_Y = 0.72
BODY_REGION_X_RATIO = 0.42
ALPHA_MIN = 12
GAP_MIN_WIDTH = 40


def column_density(im: Image.Image) -> list[int]:
    pixels = im.load()
    w, h = im.size
    return [sum(1 for y in range(h) if pixels[x, y][3] > ALPHA_MIN) for x in range(w)]


def find_frame_splits(im: Image.Image, frame_count: int) -> list[tuple[int, int]]:
    w, h = im.size
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


def body_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    fw, fh = frame.size
    limit = int(fw * BODY_REGION_X_RATIO)
    region = frame.crop((0, 0, limit, fh))
    return content_bbox(region)


def body_pin(frame: Image.Image) -> tuple[int, int]:
    bbox = body_bbox(frame)
    if not bbox:
        return 0, 0
    left, top, right, bottom = bbox
    return (
        left + int((right - left) * BODY_ANCHOR_X),
        top + int((bottom - top) * BODY_ANCHOR_Y),
    )


def normalize_frames(raw_frames: list[Image.Image]) -> tuple[Image.Image, int, int]:
    pin_x, pin_y = body_pin(raw_frames[0])
    placements: list[tuple[Image.Image, int, int]] = []

    max_right = 0
    max_bottom = 0
    for frame in raw_frames:
        fx, fy = body_pin(frame)
        dx, dy = pin_x - fx, pin_y - fy
        placements.append((frame, dx, dy))
        bbox = content_bbox(frame)
        if bbox:
            max_right = max(max_right, dx + bbox[2])
            max_bottom = max(max_bottom, dy + bbox[3])

    cell_w = max_right + 24
    cell_h = max(max_bottom + 16, max(f.size[1] for f in raw_frames))

    sheet = Image.new('RGBA', (cell_w * len(placements), cell_h), (0, 0, 0, 0))
    for i, (frame, dx, dy) in enumerate(placements):
        cell = Image.new('RGBA', (cell_w, cell_h), (0, 0, 0, 0))
        cell.paste(frame, (dx, dy), frame)
        sheet.paste(cell, (i * cell_w, 0))

    return sheet, cell_w, cell_h


def main():
    source = BAK if BAK.exists() else SRC
    im = Image.open(source).convert('RGBA')
    print(f'source: {source.name} {im.size}')

    if not BAK.exists() and source == SRC:
        im.save(BAK)
        print(f'backup: {BAK}')

    splits = find_frame_splits(im, FRAME_COUNT)
    print('splits:', splits, 'widths:', [b - a for a, b in splits])

    raw_frames = [im.crop((a, 0, b, im.size[1])) for a, b in splits]
    sheet, cell_w, cell_h = normalize_frames(raw_frames)
    sheet.save(OUT)

    print(f'output: {sheet.size}  cells={cell_w}x{cell_h}')
    print('frogAttackConfig:')
    print(f'  FRAME_COUNT={FRAME_COUNT}')
    print(f'  FRAME_W={cell_w} FRAME_H={cell_h} SHEET_W={sheet.size[0]}')
    print('  BODY_OFFSET all zeros (corpo alinhado na normalização)')


if __name__ == '__main__':
    main()
