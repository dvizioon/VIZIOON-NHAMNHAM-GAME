"""Mede deslocamento do corpo do sapo em atacando.png (3 frames).

Frame 3 só estende a língua — no jogo usa o mesmo offset do frame 2.
"""
from PIL import Image

PATH = 'public/assets/sprites/enemies/frog/atacando.png'
FRAME_COUNT = 3
BODY_X_RATIO = 0.42


def body_centroid(frame_img, x_max_ratio=BODY_X_RATIO):
    fw, fh = frame_img.size
    pixels = frame_img.load()
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


def main():
    im = Image.open(PATH).convert('RGBA')
    fw = im.size[0] // FRAME_COUNT
    fh = im.size[1]

    ref = body_centroid(im.crop((0, 0, fw, fh)))
    print('frame 0 ref:', ref)
    offsets = []
    for i in range(FRAME_COUNT):
        frame = im.crop((i * fw, 0, (i + 1) * fw, fh))
        c = body_centroid(frame)
        if c and ref:
            offsets.append((c[0] - ref[0], c[1] - ref[1]))
            print(f'frame {i}: offset ({offsets[-1][0]:.1f}, {offsets[-1][1]:.1f})')
        else:
            offsets.append(None)
            print(f'frame {i}: (corpo fora da faixa esquerda — usar offset manual)')

    if offsets[2] is not None:
        print(f'\nframe 3 sugerido (= frame 2): {offsets[2]}')


if __name__ == '__main__':
    main()
