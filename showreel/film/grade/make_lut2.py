# "Malus v2" film look: print-film style contrast, saturation roll-off (loud colours compress,
# subtle ones survive), truer apple reds, clean creamy whites, deep cool-neutral blacks.
import numpy as np
N = 33
g = np.linspace(0, 1, N)
B, G, R = np.meshgrid(g, g, g, indexing='ij')
rgb = np.stack([R, G, B], -1).reshape(-1, 3)

def to_lin(c): return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def to_srgb(c): c = np.clip(c, 0, None); return np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055)
# OKLab (perceptual) for hue/chroma work
M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
def oklab(c): return (np.cbrt(to_lin(c) @ M1.T)) @ M2.T
def from_oklab(l):
    lms = l @ np.linalg.inv(M2).T
    return to_srgb((lms ** 3) @ np.linalg.inv(M1).T)

lab = oklab(rgb)
L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
C = np.hypot(a, b); h = np.degrees(np.arctan2(b, a)) % 360
# hue tweaks: reds a touch warmer (away from magenta); cyan/teal plastics pulled toward deep teal
h = h + 6 * np.exp(-(((h - 20 + 180) % 360 - 180) / 22) ** 2) - 8 * np.exp(-(((h - 200 + 180) % 360 - 180) / 30) ** 2)
# hue-dependent chroma ceiling, then soft roll-off: C' = Cmax * tanh(C / Cmax)
def hz(c): return np.exp(-(((h - c + 180) % 360 - 180) / 28) ** 2)
cmax = .2 - .07 * hz(200) - .05 * hz(255) - .045 * hz(140) - .03 * hz(95) + .06 * hz(28) + .05 * hz(8)
C2 = cmax * np.tanh(C / cmax) * 1.02
# tone: print-like S-curve on lightness, deep blacks with a hint of lift, creamy roll-off
x = np.clip(L, 0, 1)
s = x ** 1.72 / (x ** 1.72 + (1 - x) ** 1.72 * .92)
s = .9 * s + .1 * x
s = np.where(s > .8, .8 + (1 - np.exp(-(s - .8) / .2 * 1.7)) / (1 - np.exp(-1.7)) * .17, s)
L2 = .026 + .955 * s
# chroma fades gently in deep shadows and bright highlights (film-like)
C2 *= np.clip(L2 / .25, .35, 1) * np.clip((1.02 - L2) / .2, .5, 1)
a2, b2 = C2 * np.cos(np.radians(h)), C2 * np.sin(np.radians(h))
# split tone in OKLab: shadows toward cool teal-blue, highlights toward warm cream
ws = np.clip(1 - L2 / .5, 0, 1) ** 2; wh = np.clip((L2 - .55) / .45, 0, 1) ** 1.4
a2 += ws * -.006 + wh * .004; b2 += ws * -.012 + wh * .016
out = np.clip(from_oklab(np.stack([L2, a2, b2], -1)), 0, 1)
with open('grade/malus2.cube', 'w') as fh:
    fh.write('TITLE "Malus Lens v2"\nLUT_3D_SIZE 33\n')
    for r in out: fh.write(f'{r[0]:.6f} {r[1]:.6f} {r[2]:.6f}\n')
print('wrote grade/malus2.cube')
