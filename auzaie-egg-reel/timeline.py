# Shared timing for picture and sound.
#
# The egg shot is speed-ramped: the roll plays slow to stretch the tension,
# then eases to real speed just before the egg tips, so the drop itself falls
# at true gravity. The hard cut to the first card lands where the egg would
# hit the floor.
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
STORY = json.load(open(os.path.join(HERE, 'story.json')))
FPS = STORY['fps']
EGG_FRAMES = STORY['eggEndsAt']

SRC_LAST = 1.51      # source second of the last egg frame (just above the floor)
SRC_TIP = 1.17       # source second the egg leaves the counter edge
SRC_ROLL_END = 1.06  # source second the egg stops rolling and reaches the lip
SRC_RAW_FROM = 1.10  # from here the egg moves too fast to interpolate cleanly; use the clip's own frames
RAMP = (1.30, 1.65)  # output seconds over which playback eases from slow to 1x
DT = 1 / 4800


def _speed(t, slow):
    a, b = RAMP
    if t <= a:
        return slow
    if t >= b:
        return 1.0
    x = (t - a) / (b - a)
    return slow + (1 - slow) * x * x * (3 - 2 * x)


def _integrate(slow, until):
    s, t = 0.0, 0.0
    while t < until - 1e-12:
        s += _speed(t, slow) * DT
        t += DT
    return s


def _solve_slow():
    last = (EGG_FRAMES - 1) / FPS
    lo, hi = 0.2, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if _integrate(mid, last) < SRC_LAST:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


SLOW = _solve_slow()


def source_time(t):
    """Source-clip second shown at output second t (egg section only)."""
    return _integrate(SLOW, t)


def output_time(src):
    """First output second at which the source clip reaches second src."""
    s, t = 0.0, 0.0
    while s < src:
        s += _speed(t, SLOW) * DT
        t += DT
    return t


def card_seconds():
    return [(c['id'], c['from'] / FPS) for c in STORY['cards']]


if __name__ == '__main__':
    print(f'slow roll speed {SLOW:.3f}x')
    print(f'egg reaches lip at {output_time(SRC_ROLL_END):.3f}s, tips at {output_time(SRC_TIP):.3f}s, '
          f'cut at {EGG_FRAMES / FPS:.3f}s')
    for cid, sec in card_seconds():
        print(f'{cid:5s} {sec:.3f}s')
