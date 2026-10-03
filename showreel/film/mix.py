# Mixes the brand film: narration, score (from 8 s in, ducked under the voice), location sound
# from every shot, and sound design on the key beats -> out/MalusLens_BrandFilm.mp4
import subprocess, os
from edl import SHOTS, SRC

A = 'audio/'
DUR = 43.4
VO_AT = 2.52
inp = ['-i', 'out/film-silent.mp4', '-i', A + 'vo.mp3', '-i', A + 'music.mp3']
fc = [
    f"[1:a]highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=150,volume=1.5,adelay={int(VO_AT*1000)}:all=1,apad=whole_dur={DUR}[vo]",
    f"[2:a]atrim=8,asetpts=PTS-STARTPTS,volume=0.6,afade=t=in:st=0:d=1.5,afade=t=out:st={DUR-2.4}:d=2.4[mus]",
    "[vo]asplit=2[vo1][vosc]",
    "[mus][vosc]sidechaincompress=threshold=0.035:ratio=4:attack=25:release=400:makeup=1[duck]",
]
# location sound: each real-speed shot carries its own audio, quietly; the silent beat stays silent
nat, k = [], len(inp) // 2
for t0, t1, clip, sin, speed, *_ in SHOTS:
    if clip is None or speed not in (1.0,): continue
    d = t1 - t0
    inp += ['-ss', str(sin), '-t', str(d + .2), '-i', os.path.join(SRC, f'IMG_{clip}.MOV')]
    lvl = .55 if t0 < 16.3 else .3
    fc.append(f"[{k}:a]atrim=0:{d:.3f},asetpts=PTS-STARTPTS,highpass=f=90,volume={lvl},afade=t=in:d=0.08,afade=t=out:st={d-.12:.3f}:d=0.12,adelay={int(t0*1000)}:all=1[n{k}]")
    nat.append(f'[n{k}]'); k += 1
fc.append(f"{''.join(nat)}amix=inputs={len(nat)}:normalize=0,volume=0.8[nat]")
sfx = [('whoosh', 16.45, .9), ('impact', 17.0, 1.0), ('shutter', 20.1, .8), ('scan', 21.5, .7), ('scan', 21.95, .5),
       ('pop', 23.5, .35), ('pop', 24.62, .35), ('whoosh', 26.75, .55), ('pop', 27.0, .3), ('pop', 29.0, .3),
       ('whoosh', 30.2, .45), ('pop', 30.9, .3), ('whoosh', 36.45, .5), ('impact', 36.62, .55), ('pop', 41.0, .35)]
files = sorted({f for f, _, _ in sfx}); idx = {}
for f in files: inp += ['-i', A + f + '.mp3']; idx[f] = k; k += 1
lab = []
for i, (f, t, g) in enumerate(sfx):
    fc.append(f"[{idx[f]}:a]atrim=0:{.7 if f == 'shutter' else 3},volume={g},adelay={int(t*1000)}:all=1[s{i}]"); lab.append(f'[s{i}]')
fc.append(f"{''.join(lab)}amix=inputs={len(lab)}:normalize=0,volume=0.7[fx]")
fc.append(f"[vo1][duck][nat][fx]amix=inputs=4:normalize=0,atrim=0:{DUR},loudnorm=I=-14:TP=-1.0:LRA=10[mix]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inp, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[mix]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', 'out/MalusLens_BrandFilm.mp4'], check=True)
print('mixed')
