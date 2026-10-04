# Mixes the documentary reel: narration first, the documentary score (shifted so its lift lands on
# "Malus Lens fixes that moment") ducked underneath, and quiet location sound. No designed sound
# effects. The audio stream always starts at 0:00.
#   python3 mix.py            (STEM=vo|music|bed for level checks)
import os, subprocess
from edl import SHOTS, SRC, TL

DUR = TL['dur']; VO_AT = TL['vo_at']; FIX = TL['lines']['fix']['s']
M_LIFT = 45.0                       # the score returns with a hit here, after its drop-out from ~41 s
M_IN = max(0.0, M_LIFT - (FIX - .15))  # skip this much so the hit lands just before the brand line
OUT = os.environ.get('OUT', 'out/MalusLens_BeforeTheDoorShuts.mp4')
def run(args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)

run(['-i', 'vo.wav', '-af', "highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=250:t=q:w=1:g=-2,dynaudnorm=f=200:g=11:p=0.9:m=8,"
     "acompressor=threshold=-20dB:ratio=3:attack=4:release=120:makeup=1.5,volume=1.6,aresample=48000:async=1:first_pts=0",
     '-ar', '48000', '-c:a', 'pcm_s16le', 'out/vo_processed.wav'])

inp = ['-i', 'out/film-silent.mp4', '-i', 'music.mp3', '-i', 'out/vo_processed.wav']
fc = [f"[1:a]atrim={M_IN},asetpts=PTS-STARTPTS,apad=whole_dur={DUR},atrim=0:{DUR},volume=0.5,"
      f"volume='if(between(t,{FIX - .4},{FIX + 1.4}),0.9,if(gt(t,{TL['lines']['cta']['s']}),1.3,1))':eval=frame,"
      f"equalizer=f=2800:t=q:w=1.5:g=-3,afade=t=in:st=0:d=0.6,afade=t=out:st={DUR - 2.5}:d=2.5[mus]",
      f"[2:a]asetpts=N/SR/TB,adelay={int(VO_AT * 1000)}:all=1,apad=whole_dur={DUR}[vo]", "[vo]asplit=2[vo1][vosc]",
      "[mus][vosc]sidechaincompress=threshold=0.03:ratio=4:attack=25:release=500:makeup=1[duck]"]
nat, k = [], 3
for t0, t1, clip, sin, speed, *_ in SHOTS:
    if clip is None or speed != 1.0 or t1 - t0 < .3: continue
    d = t1 - t0
    inp += ['-ss', str(sin), '-t', str(d + .2), '-i', os.path.join(SRC, f'IMG_{clip}.MOV')]
    fc.append(f"[{k}:a]atrim=0:{d:.3f},asetpts=PTS-STARTPTS,highpass=f=90,volume=0.4,afade=t=in:d=0.08,afade=t=out:st={d - .12:.3f}:d=0.12,adelay={int(t0 * 1000)}:all=1[n{k}]")
    nat.append(f'[n{k}]'); k += 1
fc.append(f"{''.join(nat)}amix=inputs={len(nat)}:normalize=0,volume=0.3[nat]")
stem = os.environ.get('STEM')
w = {'vo': '1 0 0', 'music': '0 1 0', 'bed': '0 1 1'}.get(stem)
norm = ('' if stem else ',loudnorm=I=-14:TP=-1.0:LRA=10') + ',aresample=48000:async=1:first_pts=0,asetpts=N/SR/TB'
fc.append(f"[vo1][duck][nat]amix=inputs=3:normalize=0{':weights=' + w if w else ''},atrim=0:{DUR}{norm}[mix]")
run([*inp, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
     '-movflags', '+faststart', '-shortest', OUT])
print('mixed', OUT, '| score starts at', round(M_IN, 2), 's')
