# Paper grain for the text cards: soft multi-scale value noise, centred on mid-grey.
import os

import numpy as np
from PIL import Image

W, H = 1080, 1920
rng = np.random.default_rng(7)
acc = np.zeros((H, W), np.float32)
for cell, weight in [(2, 0.35), (6, 0.30), (22, 0.22), (90, 0.13)]:
    small = rng.standard_normal((H // cell + 2, W // cell + 2)).astype(np.float32)
    img = Image.fromarray(small, mode='F').resize((W + 2 * cell, H + 2 * cell), Image.BICUBIC)
    acc += weight * np.asarray(img)[cell:cell + H, cell:cell + W]
acc /= acc.std()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build', 'paper.png')
Image.fromarray(np.clip(128 + acc * 22, 0, 255).astype(np.uint8)).save(out)
print('paper.png', acc.min(), acc.max())
