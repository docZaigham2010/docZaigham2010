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

# documentary looks applied after the film LUT
LOOK = {
    'doc':   "eq=saturation=0.82:contrast=1.06:gamma=0.97,colorbalance=rs=-0.04:gs=0.0:bs=0.05:rh=0.05:gh=0.01:bh=-0.04",
    'dread': "eq=saturation=0.5:contrast=1.08:gamma=0.9:brightness=-0.03,colorbalance=rs=-0.05:bs=0.07:rm=-0.02:bm=0.03",
    'warm':  "eq=saturation=1.02:contrast=1.03,colorbalance=rh=0.03:bh=-0.02",
}
# (start, end, clip, source in, speed, crop centre x, zoom from, zoom to, look, note)
def shots():
    rush = [s('rush') + i * (s('rain') - s('rush')) / 4 for i in range(5)]
    return [
        (0.0, s('nobody'), 2919, 0.2, .45, .45, 1.10, 1.22, 'doc', 'hook: hands on apples, Rs 2,000 crore'),
        (s('nobody'), s('why'), 1052, 17.0, .4, .45, 1.04, 1.12, 'dread', 'nobody saw it coming: night road'),
        (s('why'), s('sealed'), 2903, 1.0, 1.0, .55, 1.04, 1.08, 'doc', "here's why: the storage"),
        (s('sealed'), s('shut'), 2940, 3.0, 1.0, .50, 1.02, 1.10, 'doc', 'bins driven into the chamber'),
        (s('shut'), s('moment'), 2938, 0.0, .3, .55, 1.00, 1.10, 'doc', 'the chamber door'),
        (s('moment'), c('moment', 'At') - .1, 2912, 17.0, 1.0, .50, 1.04, 1.10, 'doc', 'one moment'),
        (c('moment', 'At') - .1, s('question'), 2911, 9.3, 1.0, .55, 1.04, 1.10, 'doc', 'at the gate'),
        (s('question'), s('guess'), 2930, 0.4, .8, .45, 1.04, 1.12, 'doc', 'good enough to store?'),
        (s('guess'), s('truck'), 2909, 5.5, .8, .55, 1.08, 1.16, 'doc', 'mostly a guess'),
        (s('truck'), c('truck', 'Only') - .1, 2933, 1.0, 1.0, .50, 1.04, 1.10, 'doc', '150 crates'),
        (c('truck', 'Only') - .1, s('rush'), 2920, 1.0, .85, .45, 1.08, 1.16, 'doc', 'only five checked'),
        (rush[0], rush[1], 2899, 10.0, 1.3, .55, 1.06, 1.12, 'doc', 'the rush'),
        (rush[1], rush[2], 2898, 7.0, 1.3, .50, 1.06, 1.12, 'doc', ''),
        (rush[2], rush[3], 2907, 6.0, 1.3, .50, 1.06, 1.12, 'doc', ''),
        (rush[3], rush[4], 2932, 12.6, 1.3, .55, 1.06, 1.12, 'doc', 'often none'),
        (s('rain'), s('rushed'), 1052, 29.0, .4, .50, 1.05, 1.15, 'dread', '2024: rain shut the highway'),
        (s('rushed'), c('rushed', 'Unripe') - .1, 2904, 10.5, 1.15, .50, 1.04, 1.10, 'dread', 'rushed in'),
        (c('rushed', 'Unripe') - .1, s('opened'), 2939, 8.0, 1.0, .50, 1.04, 1.12, 'dread', 'unripe fruit went in'),
        (s('opened'), c('opened', 'shrivelled') - .1, 2940, 24.0, .6, .50, 1.00, 1.10, 'dread', 'months later, doors opened'),
        (c('opened', 'shrivelled') - .1, s('fix'), 2937, 12.6, .4, .28, 1.06, 1.18, 'dread', 'shrivelled, spoiled'),
        (s('fix'), s('photo'), 2891, 1.0, 1.0, .50, 1.02, 1.08, 'warm', 'Malus Lens fixes that moment'),
        (s('photo'), c('photo', 'Every') - .05, 2891, 6.0, 1.0, .72, 1.00, 1.04, 'warm', 'one photo of a crate'),
        (c('photo', 'Every') - .05, s('know'), 2891, 7.7, 0.0, .72, 1.00, 1.00, 'warm', 'freeze: every apple graded'),
        (s('know'), c('know', 'before') - .1, 2905, .5, 1.0, .55, 1.00, 1.08, 'warm', 'know what goes in'),
        (c('know', 'before') - .1, s('cta'), 2936, 1.0, 1.0, .46, 1.04, 1.10, 'warm', 'before the door shuts'),
        (s('cta'), TL['dur'], None, 0, 1, 0, 1, 1, '', 'black stage: CTA'),
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
