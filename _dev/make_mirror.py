"""Cut a photo into the round object on the home screen.
   Run:  /usr/bin/python3 _dev/make_mirror.py <photo>   (that python has Pillow)"""
from PIL import Image, ImageOps, ImageDraw
import sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/photo.jpg')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mirror.webp')
N, SIDE = 620, 2600              # output size, and how much of the photo to take
CX, CY = .46, .50                # where the subject sits, as a fraction of the photo

src = ImageOps.exif_transpose(Image.open(SRC)).convert('RGB')
W, H = src.size
cx, cy = int(W * CX), int(H * CY)
side = min(SIDE, W, H)
sq = src.crop((max(0, cx - side // 2), max(0, cy - side // 2),
               min(W, cx + side // 2), min(H, cy + side // 2))).resize((N, N), Image.LANCZOS)

mask = Image.new('L', (N * 4, N * 4), 0)          # 4x then downsample = smooth edge
ImageDraw.Draw(mask).ellipse((0, 0, N * 4 - 1, N * 4 - 1), fill=255)
out = sq.convert('RGBA')
out.putalpha(mask.resize((N, N), Image.LANCZOS))
out.save(OUT, quality=90, method=5)
print('wrote', OUT, out.size)
