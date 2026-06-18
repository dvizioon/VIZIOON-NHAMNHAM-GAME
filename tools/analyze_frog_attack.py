from PIL import Image

path = 'public/assets/sprites/enemies/frog/atacando.png'
im = Image.open(path).convert('RGBA')
fw = im.size[0] // 4
frame = im.crop((3 * fw, 0, 4 * fw, im.size[1]))
pixels = frame.load()
xs = []
ys = []
for y in range(im.size[1]):
    for x in range(280):
        if pixels[x, y][3] > 20:
            xs.append(x)
            ys.append(y)
print('frame3 body left region', sum(xs)/len(xs), sum(ys)/len(ys))
