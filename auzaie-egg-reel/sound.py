# Sound design, synthesised from scratch so the reel owns every sample.
#
#   0.00s  room tone + the egg rolling on stone
#   1.65s  the roll stops at the lip; 1.76s a soft tock as it tips over
#   ...    a held breath while it falls
#   2.13s  CRACK + BOOM on the cut ("dropping leads?") - the sound of the dropped lead
#   then   one boom per card, then a small pop as @auzaie signs off
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

from timeline import FPS, EGG_FRAMES, SRC_ROLL_END, SRC_TIP, STORY, card_seconds, output_time

SR = 48000
DUR = STORY['end'] / FPS
CUT = EGG_FRAMES / FPS
rng = np.random.default_rng(11)


def seconds(d):
    return np.arange(int(round(d * SR))) / SR


def noise(n):
    return rng.standard_normal(n)


def band(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def high(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def low(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def db(x):
    return 10 ** (x / 20)


def place(bus, clip, at, taper=0.25):
    # raised-cosine tail so a clip never stops on a click
    k = min(len(clip), int(taper * SR))
    clip = clip.copy()
    clip[-k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
    i = int(round(at * SR))
    j = min(len(bus), i + len(clip))
    bus[i:j] += clip[:j - i]


def room_tone(d):
    pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786],
                          [1, -2.494956002, 2.017265875, -0.522189400], noise(int(d * SR)))
    x = band(pink, 60, 7000)
    return x / np.sqrt(np.mean(x ** 2)) * db(-60)


def roll(d):
    t = seconds(d)
    body = band(noise(len(t)), 140, 1100)
    body /= np.sqrt(np.mean(body ** 2))
    # an egg is lopsided, so it rumbles in pulses as it turns
    turn = np.cumsum(2.0 + 1.2 * t / d) / SR
    pulse = 0.55 + 0.45 * np.sin(2 * np.pi * turn) ** 2
    grit = high(noise(len(t)) * (rng.random(len(t)) < 0.0025), 2500) * 9
    x = body * pulse + low(grit, 9000)
    fade = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.12)
    return x * fade * db(-41)


def tock():
    t = seconds(0.12)
    ping = np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.007)
    click = high(noise(len(t)), 3000) * np.exp(-t / 0.0015)
    return (0.6 * ping + 0.4 * click) * db(-30)


def boom():
    t = seconds(1.3)
    sub = np.sin(2 * np.pi * np.cumsum(43 + 85 * np.exp(-t / 0.04)) / SR)
    sub *= np.exp(-t / 0.34) * (1 - np.exp(-t / 0.002))
    knock = np.sin(2 * np.pi * np.cumsum(92 + 70 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.05)
    snap = high(noise(len(t)), 1800) * np.exp(-t / 0.013)
    # the reference hits carry a bright 2-3 kHz wash that hangs for ~0.6 s
    air = band(noise(len(t)), 1300, 4800) * np.exp(-t / 0.17) * (1 - np.exp(-t / 0.004))
    # sub sets the peaks but barely moves loudness, so it is trimmed and driven harder
    x = 0.7 * sub + 0.45 * knock + 0.30 * snap + 0.24 * air
    return np.tanh(2.4 * x) / np.tanh(2.4)


def crack():
    t = seconds(0.3)
    shell = np.zeros(len(t))
    for _ in range(11):
        i = int(rng.uniform(0, 0.032) * SR)
        n = int(rng.uniform(0.0006, 0.0035) * SR)
        shell[i:i + n] += noise(n) * np.exp(-np.arange(n) / (n / 4)) * rng.uniform(0.35, 1.0)
    shell = high(shell, 2200)
    splat = band(noise(len(t)), 320, 1500) * np.exp(-t / 0.055) * (1 - np.exp(-t / 0.008))
    return 1.0 * shell + 0.35 * splat


def pop():
    t = seconds(0.25)
    blip = np.sin(2 * np.pi * np.cumsum(780 + 620 * (1 - np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.045)
    click = high(noise(len(t)), 4000) * np.exp(-t / 0.001)
    return (0.8 * blip + 0.2 * click) * (1 - np.exp(-t / 0.0015))


def reverb(x, tail=0.7, tau=0.2, wet=0.16):
    out = []
    for _ in range(2):  # decorrelated left/right tails for width
        ir = low(noise(int(tail * SR)), 5000) * np.exp(-seconds(tail) / tau)
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(x + wet * signal.fftconvolve(x, ir)[:len(x)])
    return np.stack(out, axis=1)


n = int(round(DUR * SR))
egg = np.zeros(n)
hits = np.zeros(n)

# the egg's world exists only until the cut
egg[:int(CUT * SR)] += room_tone(CUT)[:int(CUT * SR)]
place(egg, roll(output_time(SRC_ROLL_END)), 0.0)
place(egg, tock(), output_time(SRC_TIP))

cards = dict(card_seconds())
for cid, at in card_seconds():
    if cid == 'sign':
        place(hits, pop() * db(-9), at)
        continue
    level = 0 if cid == 'hook' else -2.5
    place(hits, boom() * db(level), at)
place(hits, crack() * db(-7), cards['hook'])

mix = reverb(hits) + egg[:, None]
mix /= np.max(np.abs(mix)) / db(-1.5)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build', 'sound.wav')
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f'wrote {out}  {DUR:.2f}s  hits at ' + ', '.join(f'{s:.3f}' for _, s in card_seconds()))
