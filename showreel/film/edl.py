# Cuts, frames (9:16), grades and renders the base picture of the Malus Lens brand film
# straight to JPEG frames at 30 fps (frames/00000.jpg ...), one ffmpeg pass per shot.
#
# Each shot: (film start, film end, clip, source in, speed, crop centre x, zoom from, zoom to, exposure, note)
# Film time = voiceover time + 2.52 s; the score starts 8 s in so its drop lands on "Malus Lens" at 17.0 s.
import os, subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor

SRC = os.path.expanduser('/home/user/docZaigham2010/showreel/footage/30th September 2026')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frames')
LUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grade', 'malus2.cube')
CORR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grade', 'shot_corr.json')))
FPS = 30
SHOTS = [
    (0.00, 2.20, 1052, 4.6, .25, .46, 1.00, 1.08, 0, 'night, slow-motion headlights: title'),
    (2.20, 4.75, 2930, 0.0, 1.0, .40, 1.04, 1.12, 0, '"Every apple ... arrives with a story."'),
    (4.75, 6.30, 2911, 5.2, 1.0, .50, 1.10, 1.04, 0, '"Picked at dawn."'),
    (6.30, 8.10, 1052, 12.4, .35, .50, 1.05, 1.15, 0, '"Driven through the night."'),
    (8.10, 8.85, 2940, 16.6, 1.0, .50, 1.10, 1.18, 0, '"Stacked ..."'),
    (8.85, 9.95, 2939, 7.2, 1.0, .50, 1.05, 1.12, 0, '"... by the thousand ..."'),
    (9.95, 11.00, 2906, 0.2, 1.0, .58, 1.00, 1.07, 0, '"... in the cold." (inside the letters)'),
    (11.00, 12.55, 2919, 0.4, .8, .42, 1.12, 1.20, 0, '"And for years ..."'),
    (12.55, 13.85, 2920, 6.0, .85, .48, 1.08, 1.16, 0, '"its grade came down to"'),
    (13.85, 16.30, 2913, 10.0, .8, .50, 1.00, 1.10, 0, '"tired hands, and a long shift."'),
    (16.30, 18.70, None, 0, 1, 0, 1, 1, 0, 'black stage: the breath, then the mark on the drop'),
    (18.70, 20.45, 2891, 0.6, 1.0, .50, 1.00, 1.06, 0, '"One photo per crate." (revealed through the lens)'),
    (20.45, 25.90, 2891, 7.7, 0.0, .72, 1.00, 1.00, 0, 'freeze: AI counts and grades every apple'),
    (25.90, 27.85, 2901, 3.0, 1.0, .50, 1.00, 1.06, 0, '"Clear counts."'),
    (27.85, 29.40, 2901, 6.6, 1.0, .55, 1.06, 1.00, 0, '"Real weights."'),
    (29.40, 31.60, 2932, 6.0, 1.0, .40, 1.00, 1.06, 0, '"A report you can share"'),
    (31.60, 33.40, 2912, 21.2, 1.0, .55, 1.02, 1.08, 0, '"before the next truck arrives."'),
    (33.40, 34.10, 2917, 4.0, 1.0, .55, 1.06, 1.10, 0, '"Built for the people"'),
    (34.10, 34.80, 2899, 14.0, 1.0, .55, 1.06, 1.10, 0, ''),
    (34.80, 35.50, 2936, 13.6, 1.0, .46, 1.06, 1.10, 0, ''),
    (35.50, 36.40, 2908, 6.0, 1.0, .50, 1.04, 1.08, 0, '"who keep the cold store running."'),
    (36.40, 43.40, None, 0, 1, 0, 1, 1, 0, 'black stage: "Malus Lens. Apple quality, assessed in seconds."'),
]

def grade_chain(i):
    c = CORR.get(str(i), {'gains': [1, 1, 1], 'ev': 0})
    r, g, b = c['gains']
    return (f"zscale=t=linear:npl=100,format=gbrpf32le,exposure=exposure={c['ev']}:black=0,"
            "zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=gbrp16le,"
            f"colorchannelmixer=rr={r}:gg={g}:bb={b},lut3d={LUT}:interp=tetrahedral")

def render(i):
    t0, t1, clip, sin, speed, cx, z0, z1, ev, note = SHOTS[i]
    start = round(t0 * FPS); n = round(t1 * FPS) - start
    if clip is None:
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r={FPS}', '-frames:v', str(n)]
    else:
        src = os.path.join(SRC, f'IMG_{clip}.MOV')
        if speed == 0:   # freeze frame
            pre = ['-ss', str(sin), '-i', src]
            time = f"trim=end_frame=1,loop=loop={n}:size=1:start=0,setpts=N/{FPS}/TB,"
        else:
            pre = ['-ss', str(sin), '-t', str((t1 - t0) * speed + .5), '-i', src]
            time = f"setpts=(PTS-STARTPTS)/{speed},fps={FPS},"
        d = t1 - t0
        z = f"({z0}+({z1}-{z0})*(t/{d})*(t/{d})*(3-2*(t/{d})))"   # eased push
        frame = (f"scale=w='trunc(1920*{z}/2)*2':h=-2:eval=frame:flags=lanczos,"
                 f"crop=608:1080:'(in_w-608)*{cx}':'(in_h-1080)/2',scale=1080:1920:flags=lanczos,")
        # halation: a soft warm bloom from the highlights
        hal = ("split[a][b];[b]curves=all='0/0 0.72/0 1/0.9',gblur=sigma=26,colorchannelmixer=rr=1:gg=.55:bb=.35[h];"
               "[a][h]blend=all_mode=screen:all_opacity=.16,")
        vf = time + grade_chain(i) + ',' + frame + "format=gbrp," + hal + "vignette=angle=0.5:mode=forward,format=yuvj444p"
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', *pre, '-filter_complex', vf, '-frames:v', str(n)]
    cmd += ['-q:v', '2', '-start_number', str(start), os.path.join(OUT, '%05d.jpg')]
    subprocess.run(cmd, check=True)
    return i

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = [int(x) for x in sys.argv[1:]] or range(len(SHOTS))
    with ThreadPoolExecutor(3) as ex:
        for i in ex.map(render, only): print('shot', i, 'done', SHOTS[i][9])
    json.dump([s[:2] for s in SHOTS], open(os.path.join(os.path.dirname(OUT), 'shots.json'), 'w'))
