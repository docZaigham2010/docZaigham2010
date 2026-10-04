# Mixes the problem reel: narration (pre-processed so it starts at sample 0), the approved score
# re-arranged so its drop lands on "Malus Lens changes that", and quiet location sound. No designed
# sound effects. The audio stream always starts at 0:00 (safe in players that ignore start offsets).
#   python3 mix.py [vo.wav]      (without a voice file: music-and-ambience preview)
import json, os, subprocess, sys
from edl import SHOTS, SRC, TL

A = '../film/audio/'
DUR = TL['dur']; VO_AT = TL['vo_at']; DROP = TL['lines']['drop']['s']
VO = sys.argv[1] if len(sys.argv) > 1 else None
M_DROP, BAR = 25.0, 60 / 96 * 4          # the score's drop, and one bar at 96 BPM
OUT = os.environ.get('OUT', 'out/MalusLens_IntakeProblem.mp4')

def run(args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)

# 1. arrange the score: [quiet intro, looped as needed] -> [score from 0 so its drop is at DROP] -> [groove extended]
lead = DROP - M_DROP                     # film time at which the score's own 0:00 must start
parts, t = [], 0.0
intro_len = 16.0
while lead - t > 0.05:                   # fill the gap before the score proper with its quiet intro
    seg = min(intro_len, lead - t + 2.0)
    parts.append(('intro', seg)); t += seg - 2.0
n_src = len(parts) + 2                   # every piece reads its own copy of the score (asplit starves acrossfade)
ins = ['-i', A + 'music.mp3'] * n_src
fc = []
labels = []
for k, (_, seg) in enumerate(parts):
    fc.append(f"[{k}:a]atrim=1:{1 + seg},asetpts=PTS-STARTPTS[i{k}]"); labels.append(f'[i{k}]')
first_cut = 42.0; back = first_cut - 4 * BAR
fc.append(f"[{len(parts)}:a]atrim=0:{first_cut},asetpts=PTS-STARTPTS[m1];[{len(parts) + 1}:a]atrim={back}:52,asetpts=PTS-STARTPTS[m2];[m1][m2]acrossfade=d=0.05[main]")
labels.append('[main]')
chain = labels[0]
for k, lab in enumerate(labels[1:]):
    fc.append(f"{chain}{lab}acrossfade=d=2:c1=qsin:c2=qsin[x{k}]"); chain = f'[x{k}]'
offset = max(0.0, lead - t) if parts else max(0.0, lead)
skip = max(0.0, -lead) if not parts else 0.0
fc.append(f"{chain}atrim={skip},asetpts=PTS-STARTPTS,adelay={int(offset * 1000)}:all=1,apad=whole_dur={DUR},atrim=0:{DUR},"
          f"afade=t=in:st=0:d=2,afade=t=out:st={DUR - 3}:d=3[score]")
run([*ins, '-filter_complex', ';'.join(fc), '-map', '[score]', '-ar', '48000', '-ac', '2', 'out/score.wav'])

# 2. voice: EQ, levelling, compression into a WAV (no timestamp games), then placed at VO_AT
if VO:
    run(['-i', VO, '-af', "highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=250:t=q:w=1:g=-2,dynaudnorm=f=200:g=11:p=0.9:m=8,"
         "acompressor=threshold=-20dB:ratio=3:attack=4:release=120:makeup=1.5,volume=1.6,aresample=48000:async=1:first_pts=0",
         '-ar', '48000', '-c:a', 'pcm_s16le', 'out/vo_processed.wav'])

# 3. the mix
inp = ['-i', 'out/film-silent.mp4', '-i', 'out/score.wav']
fc = [f"[1:a]volume=0.62,volume='if(between(t,{DROP},{DROP + 9}),0.8,0.72)':eval=frame,equalizer=f=2800:t=q:w=1.5:g=-3[mus]"]
if VO:
    inp += ['-i', 'out/vo_processed.wav']
    fc += [f"[2:a]asetpts=N/SR/TB,adelay={int(VO_AT * 1000)}:all=1,apad=whole_dur={DUR}[vo]", "[vo]asplit=2[vo1][vosc]",
           "[mus][vosc]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=600:makeup=1[duck]"]
else:
    fc += ["[mus]anull[duck]"]
nat, k = [], len(inp) // 2
for t0, t1, clip, sin, speed, *_ in SHOTS:
    if clip is None or speed != 1.0 or t1 - t0 < .3: continue
    d = t1 - t0
    inp += ['-ss', str(sin), '-t', str(d + .2), '-i', os.path.join(SRC, f'IMG_{clip}.MOV')]
    fc.append(f"[{k}:a]atrim=0:{d:.3f},asetpts=PTS-STARTPTS,highpass=f=90,volume=0.4,afade=t=in:d=0.08,afade=t=out:st={d - .12:.3f}:d=0.12,adelay={int(t0 * 1000)}:all=1[n{k}]")
    nat.append(f'[n{k}]'); k += 1
fc.append(f"{''.join(nat)}amix=inputs={len(nat)}:normalize=0,volume=0.3[nat]")
stem = os.environ.get('STEM')
srcs = (['[vo1]'] if VO else []) + ['[duck]', '[nat]']
w = {'vo': '1 0 0', 'music': '0 1 0', 'bed': '0 1 1'}.get(stem) if VO else None
mixw = f":weights={w}" if w else ''
norm = ('' if stem else ',loudnorm=I=-14:TP=-1.0:LRA=10') + ',aresample=48000:async=1:first_pts=0,asetpts=N/SR/TB'
fc.append(f"{''.join(srcs)}amix=inputs={len(srcs)}:normalize=0{mixw},atrim=0:{DUR}{norm}[mix]")
run([*inp, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
     '-movflags', '+faststart', '-shortest', OUT])
print('mixed', OUT, '| score drop at', DROP)
