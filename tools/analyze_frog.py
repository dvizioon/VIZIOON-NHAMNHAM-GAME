from PIL import Image
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "public/assets/sprites/enemies/frog/pulando.png"
im = Image.open(path).convert("RGBA")
w, h = im.size
fw, sp = 622, 100
px = im.load()


def is_empty(r, g, b, a):
    if a < 20:
        return True
    return r < 24 and g < 24 and b < 24


print("size", w, h)
for i in range(4):
    x0 = i * (fw + sp)
    min_x, min_y = x0 + fw, h
    max_x, max_y = x0, 0
    found = False
    for y in range(h):
        for x in range(x0, x0 + fw):
            r, g, b, a = px[x, y]
            if is_empty(r, g, b, a):
                continue
            found = True
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
    if found:
        print(f"frame{i}", {
            "x": min_x,
            "y": min_y,
            "width": max_x - min_x + 1,
            "height": max_y - min_y + 1,
        })
