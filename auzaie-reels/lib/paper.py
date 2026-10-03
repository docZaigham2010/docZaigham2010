# Crumpled kraft paper, built from random folds (sums of tent ridges) lit from the top left.
import sys

import numpy as np
from PIL import Image

W, H = 1080, 1920


def crumpled(out, base=(222, 210, 188), tint=1.0, seed=3):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    h = np.zeros((H, W), np.float32)
    for k in range(170):
        a = rng.uniform(0, np.pi)
        n = np.array([np.cos(a), np.sin(a)], np.float32)
        c = rng.uniform(-200, 1300) * n[0] + rng.uniform(-200, 2100) * n[1]
        d = x * n[0] + y * n[1] - c
        reach = rng.uniform(40, 300)
        h += rng.uniform(0.15, 0.55) * np.clip(1 - np.abs(d) / reach, 0, None) * reach * rng.choice([-1, 1])
    small = rng.standard_normal((H // 3, W // 3)).astype(np.float32)
    h += 0.7 * np.asarray(Image.fromarray(small, 'F').resize((W, H), Image.BICUBIC))
    gy, gx = np.gradient(h)
    nz = 1 / np.sqrt(gx ** 2 + gy ** 2 + 1)
    light = np.array([-0.55, -0.6, 0.58])
    shade = (-gx * nz * light[0] - gy * nz * light[1] + nz * light[2])
    shade = (shade - shade.mean()) / shade.std()
    grain = rng.standard_normal((H, W)).astype(np.float32) * 2.2
    img = np.stack([np.clip(base[i] * tint + shade * 13 + grain, 0, 255) for i in range(3)], -1)
    Image.fromarray(img.astype(np.uint8)).save(out)


if __name__ == '__main__':
    crumpled(sys.argv[1], tint=float(sys.argv[2]) if len(sys.argv) > 2 else 1.0)
