# The problem-scoping reel: every shot is anchored to a narration cue from timeline.json,
# graded (HLG tone map -> per-shot balance -> Malus film LUT -> act look) and rendered to frames/.
import json, os, subprocess, sys
import numpy as np
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = '/home/user/docZaigham2010/showreel/footage/30th September 2026'
LUT = os.path.join(HERE, '..', 'film', 'grade', 'malus2.cube')
OUT = os.path.join(HERE, 'frames')
FPS = 30
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
L = TL['lines']
s = lambda n: L[n]['s']
c = lambda n, k: L[n]['cue'][k]

# act looks applied after the film LUT
LOOK = {
    'problem': "eq=saturation=0.8:gamma=0.98,colorbalance=rs=-0.03:bs=0.04:rm=-0.01:bm=0.02",
    'dread':   "eq=saturation=0.62:gamma=0.93:brightness=-0.02,colorbalance=rs=-0.04:bs=0.06:rm=-0.02:bm=0.03",
    'warm':    "eq=saturation=1.0",
}
# (start, end, clip, source in, speed, crop centre x, zoom from, zoom to, look, note)
def shots():
    rush = [s('rush') + i * (s('rain') - s('rush')) / 4 for i in range(5)]
    return [
        (0.0, c('scale', 'twenty') - .2, 1052, 4.6, .25, .46, 1.0, 1.08, 'problem', 'night: the season arrives'),
        (c('scale', 'twenty') - .2, s('half'), 2930, 0.0, 1.0, .40, 1.04, 1.12, 'problem', '20 lakh tonnes'),
        (s('half'), s('gate'), 2908, 2.0, 1.0, .50, 1.04, 1.10, 'problem', 'half the valley lives on them'),
        (s('gate'), s('decision'), 2912, 19.0, 1.0, .55, 1.02, 1.10, 'problem', 'the cold storage gate'),
        (s('decision'), c('decision', 'is this') - .1, 2902, 3.0, 1.0, .50, 1.04, 1.10, 'problem', 'one decision'),
        (c('decision', 'is this') - .1, s('handful'), 2911, 6.5, 1.0, .50, 1.06, 1.14, 'problem', 'good enough to store?'),
        (s('handful'), s('crates'), 2919, 0.4, .8, .42, 1.12, 1.20, 'problem', 'rests on a handful'),
        (s('crates'), s('apples'), 2899, 2.0, 1.0, .50, 1.04, 1.08, 'problem', '5 of 150 crates (grid)'),
        (s('apples'), c('apples', 'thousands') - .15, 2920, 1.0, .85, .45, 1.08, 1.16, 'problem', '400 apples by hand'),
        (c('apples', 'thousands') - .15, s('rush'), 2917, 8.0, 1.0, .55, 1.04, 1.10, 'problem', 'to judge thousands'),
        (rush[0], rush[1], 2932, 6.0, 1.25, .40, 1.06, 1.12, 'problem', 'peak-season rush'),
        (rush[1], rush[2], 2899, 14.0, 1.25, .55, 1.06, 1.12, 'problem', ''),
        (rush[2], rush[3], 2907, 6.0, 1.25, .50, 1.06, 1.12, 'problem', ''),
        (rush[3], rush[4], 2898, 2.0, 1.25, .50, 1.06, 1.12, 'problem', 'not even that'),
        (s('rain'), s('rushed'), 1052, 12.4, .3, .50, 1.05, 1.15, 'dread', '2024: rain shut the highway'),
        (s('rushed'), s('checks'), 2904, 5.5, 1.15, .50, 1.04, 1.10, 'dread', 'rushed into storage'),
        (s('checks'), s('months'), 2913, 10.0, .8, .50, 1.00, 1.10, 'dread', 'the checks could not catch it'),
        (s('months'), c('months', 'shrivelled') - .1, 2938, 0.0, .3, .55, 1.00, 1.08, 'dread', 'the chambers opened'),
        (c('months', 'shrivelled') - .1, s('loss'), 2937, 12.5, .6, .50, 1.08, 1.16, 'dread', 'shrivelled, scalded'),
        (s('loss'), s('drop'), None, 0, 1, 0, 1, 1, '', 'black stage: the loss'),
        (s('drop'), s('photo') - .3, None, 0, 1, 0, 1, 1, '', 'black stage: the mark on the drop'),
        (s('photo') - .3, s('detect'), 2891, 0.6, 1.0, .50, 1.00, 1.06, 'warm', 'one photo per crate'),
        (s('detect'), s('phone'), 2891, 7.7, 0.0, .72, 1.00, 1.00, 'warm', 'freeze: every apple detected, graded'),
        (s('phone'), s('acc1'), 2901, 3.0, 1.0, .50, 1.00, 1.06, 'warm', 'on the phone the storage owns'),
        (s('acc1'), s('acc2'), 2909, 4.0, 1.0, .50, 1.04, 1.10, 'warm', '99% detection'),
        (s('acc2'), s('clear'), 2918, 3.0, 1.0, .50, 1.04, 1.10, 'warm', '95% grading, real batches'),
        (s('clear'), c('clear', 'before') - .1, 2905, .5, 1.0, .55, 1.00, 1.08, 'warm', 'a clear number at the gate'),
        (c('clear', 'before') - .1, s('end'), 2936, 1.0, 1.0, .46, 1.04, 1.10, 'warm', 'before the doors close'),
        (s('end'), TL['dur'], None, 0, 1, 0, 1, 1, '', 'black stage: end card'),
    ]
SHOTS = shots()

_corr = {}
def correction(clip, sin, cx):
    # white balance from near-neutral pixels + exposure toward a common mid level (as in the film)
    key = (clip, round(sin, 1), cx)
    if key in _corr: return _corr[key]
    TM = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24"
    w, h = 320, 180
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(sin), '-i', f'{SRC}/IMG_{clip}.MOV', '-frames:v', '1', '-vf', TM + f',scale={w}:{h}',
                          '-f', 'rawvideo', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(float) / 255
    x0 = int((w - h * 9 / 16) * cx); a = a[:, x0:x0 + int(h * 9 / 16)]
    Y = a @ [.2126, .7152, .0722]; sat = a.max(-1) - a.min(-1); m = (sat < .12) & (Y > .35) & (Y < .95)
    gains = [1, 1, 1]
    if m.sum() > 60: mean = a[m].mean(0); gains = list(np.clip(mean.mean() / mean, .88, 1.12))
    gains = [round(float(g) ** .7, 3) for g in gains]
    ev = round(float(np.clip(np.log2(.40 / max(float(np.median(Y)), .02)) * .6, -.6, .6)), 2)
    _corr[key] = (gains, ev); return _corr[key]

def render(i):
    t0, t1, clip, sin, speed, cx, z0, z1, look, note = SHOTS[i]
    start = round(t0 * FPS); n = round(t1 * FPS) - start
    if n <= 0: return i
    if clip is None:
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r={FPS}', '-frames:v', str(n)]
    else:
        src = f'{SRC}/IMG_{clip}.MOV'
        (r, g, b), ev = correction(clip, sin, cx)
        if speed == 0:
            pre = ['-ss', str(sin), '-i', src]; time = f"trim=end_frame=1,loop=loop={n}:size=1:start=0,setpts=N/{FPS}/TB,"
        else:
            pre = ['-ss', str(sin), '-t', str((t1 - t0) * speed + .5), '-i', src]; time = f"setpts=(PTS-STARTPTS)/{speed},fps={FPS},tpad=stop_mode=clone:stop_duration=3,"
        d = t1 - t0
        z = f"({z0}+({z1}-{z0})*(t/{d})*(t/{d})*(3-2*(t/{d})))"
        grade = (f"zscale=t=linear:npl=100,format=gbrpf32le,exposure=exposure={ev}:black=0,zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
                 f"zscale=t=bt709:m=bt709:r=tv,format=gbrp16le,colorchannelmixer=rr={r}:gg={g}:bb={b},lut3d={LUT}:interp=tetrahedral,")
        frame = (f"scale=w='trunc(1920*{z}/2)*2':h=-2:eval=frame:flags=lanczos,crop=608:1080:'(in_w-608)*{cx}':'(in_h-1080)/2',"
                 "scale=1080:1920:flags=lanczos,")
        hal = ("format=gbrp,split[a][b];[b]curves=all='0/0 0.72/0 1/0.9',gblur=sigma=26,colorchannelmixer=rr=1:gg=.55:bb=.35[h];"
               "[a][h]blend=all_mode=screen:all_opacity=.16,")
        vf = time + grade + frame + "format=yuv444p," + LOOK[look] + "," + hal + "vignette=angle=0.5:mode=forward,format=yuvj444p"
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', *pre, '-filter_complex', vf, '-frames:v', str(n)]
    subprocess.run(cmd + ['-q:v', '2', '-start_number', str(start), os.path.join(OUT, '%05d.jpg')], check=True)
    return i

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = [int(x) for x in sys.argv[1:]] or range(len(SHOTS))
    for i in only:   # measure corrections first (cheap), then render in parallel
        if SHOTS[i][2]: correction(SHOTS[i][2], SHOTS[i][3], SHOTS[i][5])
    with ThreadPoolExecutor(3) as ex:
        for i in ex.map(render, only): print('shot', i, f'{SHOTS[i][0]:.2f}-{SHOTS[i][1]:.2f}', SHOTS[i][9])
