# Reel 2 — "The giant axe"
# A house-sized axe comes down and splits a boulder clean in two. Then, typed onto
# crumpled paper: AUZAIE isn't one tool, it's the whole stack — and a DM "GROW" CTA.
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from common import FPS, compose, render_cards  # noqa: E402
import sfx  # noqa: E402

B = os.path.join(HERE, 'build')
HOOK = (os.path.join(B, 'hook_veo.mp4'), 0.6, 3.2)   # wind-up -> impact -> boulder splits
HOOK_S = HOOK[2] - HOOK[1]
PAPER = {'image': os.path.join(B, 'paper.png')}
INK = {'font': 'Anton', 'size': 104, 'fit': 0.88, 'color': '#FFFFFF', 'skew': 9, 'y': 900, 'lineHeight': 1.1,
       'shadow': {'color': 'rgba(25,16,4,.92)', 'blur': 5, 'x': 5, 'y': 7}}

frames, timeline, clicks, hits = [], [], [], []
clock = [HOOK_S]


def show(name, layers, n):
    frames.append({'name': name, 'bg': PAPER, 'layers': layers})
    timeline.append((os.path.join(B, name + '.png'), n))
    clock[0] += n / FPS


def typewrite(name, text, hold, step=2, extra=()):
    full = len(text.replace('\n', ''))
    for k, shown in enumerate(range(step, full + step, step)):
        clicks.append(clock[0])
        show(f'{name}_{k:02d}', [dict(INK, text=text, reveal=shown)] + list(extra), 1)
    show(f'{name}_hold', [dict(INK, text=text)] + list(extra), hold)


hits.append(clock[0])
typewrite('t1', "WE'RE NOT JUST A\nSOFTWARE COMPANY.", 34)
for i, word in enumerate(['YOUR CRM.', 'YOUR AUTOMATIONS.', 'YOUR AI ASSISTANT.', 'YOUR BUSINESS OS.']):
    hits.append(clock[0])
    show(f'w{i}', [dict(INK, text=word)], 23)
hits.append(clock[0])
typewrite('t2', 'EVERYTHING YOUR BUSINESS NEEDS\nTO RUN ITSELF & GROW.', 36)

badge = {'badge': 'A', 'y': 760, 'r': 165}
tag = dict(INK, text='CRM • AUTOMATION • AI • BUSINESS OS', size=64, y=1040)
logo_at = clock[0]
hits.append(logo_at)
typewrite('logo', tag['text'], 18, step=3, extra=[badge])
# retarget the typed tagline to its own style (smaller, lower)
for fr in frames:
    if fr['name'].startswith('logo_'):
        fr['layers'][0] = dict(tag, reveal=fr['layers'][0].get('reveal'))
        fr['layers'][0] = {k: v for k, v in fr['layers'][0].items() if v is not None}
dm_at = clock[0]
show('logo_dm', [badge, tag, dict(INK, text='DM "GROW"', size=118, y=1185, color='#FFE27A')], 66)

render_cards(frames, B, os.path.join(B, 'cards.json'))

dur = clock[0]
tr = sfx.Track(dur)
tr.add(sfx.room_tone(HOOK_S, -50), 0, room=False)
tr.add(sfx.whoosh(0.6, 120, 1600), 0.62, level=-6)           # the axe comes down
tr.add(sfx.boom(), 1.22, level=-3)                           # impact
tr.add(sfx.crack_rock(), 1.24, level=-6)                     # the boulder splits
for i, t in enumerate(hits):
    tr.add(sfx.boom(), t, level=0 if i == 0 else -4)
for t in clicks:
    tr.add(sfx.key_click(), t, level=-20, room=False)
tr.add(sfx.pop(), dm_at, level=-8)
tr.render(os.path.join(B, 'sound.wav'))

compose(os.path.join(HERE, 'AUZAIE_reel2_giant_axe.mp4'), timeline, os.path.join(B, 'sound.wav'), B, hook=HOOK)
