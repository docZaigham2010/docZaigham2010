# Synthesised sound design shared by the reels: every sample is generated here.
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
_rng = np.random.default_rng(11)


def seconds(d):
    return np.arange(int(round(d * SR))) / SR


def noise(n):
    return _rng.standard_normal(n)


def band(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def high(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def low(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def db(x):
    return 10 ** (x / 20)


def sweep(f, t):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


class Track:
    """A mono timeline that clips are placed onto; mixed to stereo with a room."""

    def __init__(self, dur):
        self.dry = np.zeros(int(round(dur * SR)))
        self.wet = np.zeros_like(self.dry)

    def add(self, clip, at, level=0.0, room=True, taper=0.2):
        k = min(len(clip), int(taper * SR))
        clip = clip.copy() * db(level)
        clip[-k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
        i = int(round(at * SR))
        j = min(len(self.dry), i + len(clip))
        if i >= len(self.dry):
            return
        (self.wet if room else self.dry)[i:j] += clip[:j - i]

    def render(self, path, wet=0.16):
        out = []
        for _ in range(2):
            ir = low(noise(int(0.7 * SR)), 5000) * np.exp(-seconds(0.7) / 0.2)
            ir /= np.sqrt(np.sum(ir ** 2))
            out.append(self.wet + wet * signal.fftconvolve(self.wet, ir)[:len(self.wet)] + self.dry)
        mix = np.stack(out, axis=1)
        mix /= np.max(np.abs(mix)) / db(-1.5)
        wavfile.write(path, SR, (mix * 32767).astype(np.int16))


def room_tone(d, level=-58):
    pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786],
                          [1, -2.494956002, 2.017265875, -0.522189400], noise(int(d * SR)))
    x = band(pink, 60, 7000)
    return x / np.sqrt(np.mean(x ** 2)) * db(level)


def boom():
    t = seconds(1.3)
    sub = sweep(43 + 85 * np.exp(-t / 0.04), t) * np.exp(-t / 0.34) * (1 - np.exp(-t / 0.002))
    knock = sweep(92 + 70 * np.exp(-t / 0.015), t) * np.exp(-t / 0.05)
    snap = high(noise(len(t)), 1800) * np.exp(-t / 0.013)
    air = band(noise(len(t)), 1300, 4800) * np.exp(-t / 0.17) * (1 - np.exp(-t / 0.004))
    x = 0.7 * sub + 0.45 * knock + 0.30 * snap + 0.24 * air
    return np.tanh(2.4 * x) / np.tanh(2.4)


def whoosh(d=0.45, lo=300, hi=3000):
    t = seconds(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    x = band(noise(len(t)), lo, hi) * env
    return x / np.max(np.abs(x))


def thud():
    t = seconds(0.5)
    body = sweep(70 + 60 * np.exp(-t / 0.02), t) * np.exp(-t / 0.09)
    grit = band(noise(len(t)), 200, 1500) * np.exp(-t / 0.03)
    return 0.9 * body + 0.4 * grit


def crack_rock():
    t = seconds(1.2)
    shards = np.zeros(len(t))
    for _ in range(40):
        i = int(_rng.uniform(0, 0.25) * SR)
        n = int(_rng.uniform(0.001, 0.006) * SR)
        shards[i:i + n] += noise(n) * np.exp(-np.arange(n) / (n / 3)) * _rng.uniform(0.3, 1)
    rumble = low(noise(len(t)), 220) * np.exp(-t / 0.35) * 3
    return high(shards, 900) + rumble


def key_click():
    t = seconds(0.05)
    x = band(noise(len(t)), 1500, 7000) * np.exp(-t / 0.004)
    return x / np.max(np.abs(x))


def pop():
    t = seconds(0.25)
    blip = sweep(780 + 620 * (1 - np.exp(-t / 0.02)), t) * np.exp(-t / 0.045)
    click = high(noise(len(t)), 4000) * np.exp(-t / 0.001)
    return (0.8 * blip + 0.2 * click) * (1 - np.exp(-t / 0.0015))


def ping(f=1320):
    t = seconds(0.35)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.06) * (t < 0.09)
         + np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-(t - 0.09).clip(0) / 0.09) * (t >= 0.09))
    return x * (1 - np.exp(-t / 0.002))


def chime():
    t = seconds(0.6)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(1047, 0.25), (1568, 0.18), (2093, 0.12)])
    return x / 3 * (1 - np.exp(-t / 0.003))


def crash():
    t = seconds(1.0)
    body = np.zeros(len(t))
    th = thud()
    body[:len(th)] = th
    return high(noise(len(t)), 600) * np.exp(-t / 0.25) * 0.6 + body
