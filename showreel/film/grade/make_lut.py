# Builds the "Malus" film look as a 33-point 3D LUT (Rec.709 in -> Rec.709 out).
import numpy as np
N = 33
g = np.linspace(0, 1, N)
B, G, R = np.meshgrid(g, g, g, indexing='ij')          # .cube order: R fastest
rgb = np.stack([R, G, B], -1).reshape(-1, 3)

Y = rgb @ np.array([.2126, .7152, .0722])
C = rgb - Y[:, None]
# hue angle on opponent axes, 0 = red
a = rgb[:, 0] - .5 * (rgb[:, 1] + rgb[:, 2]); b = (np.sqrt(3) / 2) * (rgb[:, 1] - rgb[:, 2])
hue = (np.degrees(np.arctan2(b, a)) + 360) % 360
# saturation by hue: keep apples/crates rich, protect skin, tame loud plastics
keys = np.array([[0, 1.06], [25, .98], [45, .86], [60, .7], [120, .58], [180, .42], [215, .48], [250, .58], [300, .8], [340, 1.0], [360, 1.06]])
f = np.interp(hue, keys[:, 0], keys[:, 1]) * .94
rgb = Y[:, None] + C * f[:, None]
# nudge cyans toward a deeper teal, and push reds slightly toward crimson
cy = np.exp(-((hue - 180) / 30) ** 2)[:, None]
rgb += cy * (C * 0) + cy * np.array([-.02, -.01, .015]) * np.abs(C).sum(1, keepdims=True)
rd = np.exp(-((((hue + 180) % 360) - 180) / 18) ** 2)[:, None]
rgb += rd * np.array([0, -.012, .006]) * np.abs(C).sum(1, keepdims=True)
# filmic tone curve: gentle S, soft shoulder, slightly matte blacks
def curve(x):
    x = np.clip(x, 0, 1) ** 1.08; p = 1.42
    s = x ** p / (x ** p + (1 - x) ** p)
    s = .82 * s + .18 * x                          # keep some linearity in mids
    shoulder = 1 - np.exp(-3.2 * s) ; shoulder /= (1 - np.exp(-3.2))
    s = np.where(s > .7, .7 + (shoulder - (1 - np.exp(-3.2*.7))/(1 - np.exp(-3.2))) * .9, s) if False else s
    s = np.where(s > .72, .72 + (1 - np.exp(-(s - .72) / .28 * 1.6)) / (1 - np.exp(-1.6)) * .2, s)   # highlight shoulder
    return .022 + .97 * s
rgb = curve(rgb)
# split tone: cool shadows, warm highlights
Y2 = rgb @ np.array([.2126, .7152, .0722])
ws = np.clip(1 - Y2 / .55, 0, 1) ** 2; wh = np.clip((Y2 - .45) / .55, 0, 1) ** 1.5
rgb += ws[:, None] * np.array([-.016, .006, .026]) + wh[:, None] * np.array([.034, .012, -.03])
rgb = np.clip(rgb, 0, 1)
with open('malus.cube', 'w') as fh:
    fh.write('TITLE "Malus Lens film look"\nLUT_3D_SIZE 33\n')
    for r in rgb: fh.write(f'{r[0]:.6f} {r[1]:.6f} {r[2]:.6f}\n')
print('wrote malus.cube')
