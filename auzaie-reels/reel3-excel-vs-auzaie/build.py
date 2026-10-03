# Reel 3 — "Amateur vs pro": Excel + WhatsApp chaos collapses, a custom AI CRM runs calm, then the CTA.
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from common import FPS, compose  # noqa: E402
import sfx  # noqa: E402

B = os.path.join(HERE, 'build')
subprocess.run(['node', os.path.join(HERE, 'render.mjs')], check=True)
frames = sorted(os.listdir(os.path.join(B, 'frames')))
timeline = [(os.path.join(B, 'frames', f), 1) for f in frames]

MSG_T = [0.3, 0.68, 1.02, 1.32, 1.58, 1.8, 2.0, 2.18]   # keep in step with render.mjs
tr = sfx.Track(len(frames) / FPS)
tr.add(sfx.room_tone(3.3, -54), 0, room=False)
for k, t in enumerate(MSG_T):
    tr.add(sfx.ping(1150 + 70 * k), t, level=-9 + k * 0.6)       # pings pile up, a little higher each time
for i in range(11):
    tr.add(sfx.key_click(), 0.55 + i * 0.16, level=-22, room=False)  # rows flipping to MISSED
tr.add(sfx.whoosh(0.4, 200, 2500), 2.5, level=-12)
tr.add(sfx.crash(), 2.75, level=-3)                               # it all comes down
tr.add(sfx.boom(), 3.3, level=0)                                  # cut to the calm
tr.add(sfx.whoosh(0.5, 300, 3000), 3.32, level=-16)
for i in range(5):
    tr.add(sfx.chime(), 3.3 + 0.75 + i * 0.42, level=-13)         # each automation lands
tr.add(sfx.boom(), 6.6, level=-1)
tr.add(sfx.pop(), 7.5, level=-8)
tr.render(os.path.join(B, 'sound.wav'))

compose(os.path.join(HERE, 'AUZAIE_reel3_excel_vs_auzaie.mp4'), timeline, os.path.join(B, 'sound.wav'), B)
