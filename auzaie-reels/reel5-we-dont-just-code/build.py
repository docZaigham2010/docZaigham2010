# Reel 5 — "we don't just code": kinetic type, a beat per word, ends on DM "AUZAIE".
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from common import FPS, compose  # noqa: E402
import sfx  # noqa: E402

B = os.path.join(HERE, 'build')
beats = json.load(open(os.path.join(HERE, 'beats.json')))
subprocess.run(['node', os.path.join(HERE, 'render.mjs')], check=True)
frames = sorted(os.listdir(os.path.join(B, 'frames')))
timeline = [(os.path.join(B, 'frames', f), 1) for f in frames]


def kick():
    t = sfx.seconds(0.45)
    return sfx.sweep(48 + 110 * np.exp(-t / 0.03), t) * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.002))


def hat():
    t = sfx.seconds(0.08)
    return sfx.high(sfx.noise(len(t)), 7000) * np.exp(-t / 0.015)


tr = sfx.Track(beats['end'])
pad_t = sfx.seconds(9.3)
pad = sum(np.sin(2 * np.pi * f * pad_t + i) for i, f in enumerate([110, 164.8, 220, 277.2]))
pad *= np.minimum(1, pad_t / 0.4) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * pad_t)) / 4
tr.add(sfx.low(pad, 900), 0, level=-24, room=False)                     # warm bed under the words
for b in beats['beats']:
    if b.get('cta'):
        tr.add(sfx.boom(), b['at'], level=-1)
        continue
    tr.add(kick(), b['at'], level=-5 if b['dark'] else -8, room=False)
    tr.add(hat(), b['at'] + 0.15, level=-20, room=False)
    if b.get('fx') == 'warp':
        tr.add(sfx.whoosh(0.3, 400, 5000), b['at'] - 0.05, level=-12)
for k in range(4):                                                      # the stuttering "re-repe-repea"
    tr.add(sfx.key_click(), 7.8 + k * 0.1, level=-16, room=False)
tr.add(sfx.boom(), 8.9, level=-3)
tr.render(os.path.join(B, 'sound.wav'))

compose(os.path.join(HERE, 'AUZAIE_reel5_we_dont_just_code.mp4'), timeline, os.path.join(B, 'sound.wav'), B)
