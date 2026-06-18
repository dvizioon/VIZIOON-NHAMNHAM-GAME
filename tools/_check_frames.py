from PIL import Image
from pathlib import Path

p = Path(r'C:\Users\Daniel Estevão\Desktop\PROJETOS\NHAMNHAM - Largatinha da Turminha\game\public\assets\sprites\enemies\frog\atacando.png')
im = Image.open(p).convert('RGBA')
fw = im.size[0] // 3
for i in range(3):
    f = im.crop((i*fw, 0, (i+1)*fw, im.size[1]))
    b = f.split()[-1].getbbox()
    print(f'frame {i} bbox={b}')
