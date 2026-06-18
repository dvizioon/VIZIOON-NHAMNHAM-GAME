from PIL import Image

path = 'public/assets/sprites/enemies/frog/atacando.png'
im = Image.open(path).convert('RGBA')
fw = im.size[0] // 4
fh = im.size[1]


def body_centroid(frame_idx, x_max_ratio=0.42):
    frame = im.crop((frame_idx * fw, 0, (frame_idx + 1) * fw, fh))
    pixels = frame.load()
    xs, ys = [], []
    limit = int(fw * x_max_ratio)
    for y in range(fh):
        for x in range(limit):
            if pixels[x, y][3] > 20:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return sum(xs) / len(xs), sum(ys) / len(ys)


for ratio in [0.35, 0.38, 0.40, 0.42, 0.45, 0.50]:
    ref = body_centroid(0, ratio)
    print(f'--- ratio {ratio} ref={ref} ---')
    for i in range(4):
        c = body_centroid(i, ratio)
        if c and ref:
            print(f'  f{i}: ({c[0]-ref[0]:.1f}, {c[1]-ref[1]:.1f})', end='')
        else:
            print(f'  f{i}: None', end='')
    print()
