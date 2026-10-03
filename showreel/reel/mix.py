# Mixes voiceover, the extended score and sound effects under out/reel-silent.mp4.
import subprocess, sys
A = 'audio/'
DUR = 41.2
VO_OFFSET = 1.0
BAR = 60 / 110 * 4               # the score runs at 110 BPM
CUT = 41.4545                    # splice point in the score, on a bar line
BACK = CUT - 4 * BAR             # jump back exactly 4 bars to extend the groove
sfx = [  # (file, reel time, gain)
    ('whoosh', 2.55, .9), ('impact', 6.1, .55), ('whoosh', 8.6, .9), ('impact', 12.0, 1.0), ('whoosh', 13.45, .7),
    ('pop', 13.95, .5), ('pop', 14.15, .5), ('pop', 14.35, .5), ('whoosh', 14.9, .6),
    ('shutter', 15.3, .8), ('shutter', 16.1, .7), ('whoosh', 16.9, .9), ('scan', 17.6, .8), ('scan', 18.9, .7),
    *[('pop', 19.3 + i * .14, .45) for i in range(6)], *[('pop', 21.15 + i * .1, .35) for i in range(6)],
    ('impact', 21.9, .45), ('impact', 22.5, .45), ('whoosh', 23.0, .9), ('whoosh', 24.7, .6), ('whoosh', 26.35, .8),
    ('pop', 27.5, .5), ('pop', 27.7, .5), ('whoosh', 28.3, .5), ('whoosh', 29.85, .7),
    ('pop', 31.6, .45), ('pop', 31.8, .45), ('pop', 32.0, .45), ('whoosh', 32.55, 1.0), ('impact', 33.05, 1.0),
]
inp = ['-i', 'out/reel-silent.mp4', '-i', A + 'vo.mp3', '-i', A + 'music.mp3']
files = sorted({f for f, _, _ in sfx})
for f in files: inp += ['-i', A + f + '.mp3']
idx = {f: 3 + i for i, f in enumerate(files)}
fc = []
fc.append(f"[1:a]highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,adelay={int(VO_OFFSET*1000)}:all=1,apad=whole_dur={DUR}[vo]")
fc.append(f"[2:a]atrim=12:{CUT},asetpts=PTS-STARTPTS[m1];[2:a]atrim={BACK}:50,asetpts=PTS-STARTPTS[m2];"
          f"[m1][m2]acrossfade=d=0.04:c1=tri:c2=tri,volume=0.55,afade=t=out:st={DUR-2.2}:d=2.2[mus]")
fc.append("[vo]asplit=2[vo1][vosc]")
fc.append("[mus][vosc]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=350:makeup=1[duck]")
labels = []
for i, (f, t, g) in enumerate(sfx):
    fc.append(f"[{idx[f]}:a]atrim=0:{0.7 if f == 'shutter' else 3},volume={g},adelay={int(t*1000)}:all=1[s{i}]")
    labels.append(f"[s{i}]")
fc.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,volume=0.7[fx]")
fc.append(f"[vo1][duck][fx]amix=inputs=3:normalize=0,atrim=0:{DUR},loudnorm=I=-14:TP=-1.0:LRA=9[mix]")
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inp, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[mix]',
       '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', sys.argv[1] if len(sys.argv) > 1 else 'out/MalusLens_Reel.mp4']
subprocess.run(cmd, check=True)
print('mixed')
