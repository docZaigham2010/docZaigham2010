# Reel 1 — "The missed shot"
# A player winds up for a big shot under the floodlights... whiffs it and hits the turf.
# Cut on the fall: missing follow-ups? -> custom. -> automated. -> converting. -> CTA -> AUZAIE.
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from common import FPS, compose, render_cards  # noqa: E402
import sfx  # noqa: E402

B = os.path.join(HERE, 'build')
HOOK = (os.path.join(B, 'hook_veo.mp4'), 0.9, 3.1)   # run-up -> whiff -> lands on his back
HOOK_S = HOOK[2] - HOOK[1]

LIGHT, DARK = {'color': '#FBFAFA'}, {'color': '#232323'}
TYPE = {'font': 'Anton', 'size': 112, 'skew': 9, 'y': 960, 'lineHeight': 1.12}
BEATS = [  # (name, background, text, frames on screen)
    ('hook', LIGHT, 'missing follow-ups?', 30),
    ('w1', DARK, 'custom.', 30),
    ('w2', LIGHT, 'automated.', 30),
    ('w3', DARK, 'converting.', 30),
    ('cta', LIGHT, 'DM or comment "CRM"\nfor a free demo', 30),
]

frames = [{'name': n, 'bg': bg, 'layers': [dict(TYPE, text=t, color='#111111' if bg is LIGHT else '#FFFFFF')]}
          for n, bg, t, _ in BEATS]
frames.append({'name': 'logo', 'bg': DARK, 'layers': [
    {'badge': 'A', 'y': 790, 'r': 150},
    {'text': 'AUZAIE', 'font': 'Anton', 'size': 120, 'tracking': 0.08, 'color': '#FFFFFF', 'skew': 9, 'y': 1050},
    {'text': 'Custom CRM & Business OS', 'font': 'Anton', 'size': 70, 'color': '#C9CED6', 'skew': 9, 'y': 1160},
]})
render_cards(frames, B, os.path.join(B, 'cards.json'))
timeline = [(os.path.join(B, n + '.png'), k) for n, _, _, k in BEATS] + [(os.path.join(B, 'logo.png'), 45)]

# sound: night pitch, run-up, the whiff, the fall — then one hit per card
dur = HOOK_S + sum(k for _, k in timeline) / FPS
tr = sfx.Track(dur)
tr.add(sfx.room_tone(HOOK_S, -52), 0, room=False)
for k in range(5):
    tr.add(sfx.thud(), 0.12 + k * 0.26, level=-30)          # studs on turf
tr.add(sfx.whoosh(0.35, 400, 4000), 1.25, level=-14)          # the swing
tr.add(sfx.thud(), 2.05, level=-8)                            # hits the deck
t = HOOK_S
for n, _, _, k in BEATS:
    tr.add(sfx.boom(), t, level=0 if n == 'hook' else -2.5)
    t += k / FPS
tr.add(sfx.boom(), t, level=-4)
tr.add(sfx.pop(), t + 0.05, level=-10)
tr.render(os.path.join(B, 'sound.wav'))

compose(os.path.join(HERE, 'AUZAIE_reel1_missed_shot.mp4'), timeline, os.path.join(B, 'sound.wav'), B, hook=HOOK)
