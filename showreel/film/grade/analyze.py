# Measures each shot after tone mapping: white balance gains from near-neutral bright pixels
# and an exposure offset toward a common mid level. Writes grade/shot_corr.json.
import json, subprocess, numpy as np, sys
sys.path.insert(0, '.')
from edl import SHOTS, SRC
TM = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24"
out = {}
for i, (t0, t1, clip, sin, speed, cx, *_r) in enumerate(SHOTS):
    if clip is None: continue
    w, h = 320, 180
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(sin + (t1 - t0) * (speed or 1) / 2), '-i', f'{SRC}/IMG_{clip}.MOV', '-frames:v', '1',
                          '-vf', TM + f',scale={w}:{h}', '-f', 'rawvideo', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(float) / 255
    x0 = int((w - h * 9 / 16) * cx); a = a[:, x0:x0 + int(h * 9 / 16)]           # the 9:16 window actually used
    Y = a @ [.2126, .7152, .0722]; sat = a.max(-1) - a.min(-1)
    m = (sat < .12) & (Y > .35) & (Y < .95)
    gains = [1, 1, 1]
    if m.sum() > 60:
        mean = a[m].mean(0); gains = list(np.clip(mean.mean() / mean, .88, 1.12))
    gains = [g ** .7 for g in gains]                                           # correct 70% of the way: keep the light's mood
    med = float(np.median(Y)); ev = float(np.clip(np.log2(.40 / max(med, .02)) * .6, -.6, .6))
    out[i] = {'gains': [round(g, 3) for g in gains], 'ev': round(ev, 2), 'median': round(med, 3), 'clip': clip}
    print(i, clip, out[i])
json.dump(out, open('grade/shot_corr.json', 'w'), indent=1)
