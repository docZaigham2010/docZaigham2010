# Mixes the documentary reel: narration first, then the documentary score ducked underneath, and
# quiet location sound. No designed sound effects. The audio stream always starts at 0:00.
# Score arrangement: its tension build runs to the doors opening; under "every single year... too
# late to check" only a quiet echo of its opening drone remains; its hit returns on the CTA line.
#   python3 mix.py            (STEM=vo|music|bed for level checks)
import os, subprocess
from edl import SHOTS, SRC, TL

DUR = TL['dur']; VO_AT = TL['vo_at']; LN = TL['lines']
CUT = 41.2                            # the score's own drop-out begins here (after the build)
M_HIT = 45.0                          # where the score comes back in with a hit
HIT_AT = LN['late']['e'] + .12        # film time for that hit: in the breath after "too late to check"
ECHO = (2.0, 9.0)                     # the opening drone, replayed quietly under the hardest lines
OUT = os.environ.get('OUT', 'out/MalusLens_BeforeTheDoorShuts.mp4')
def run(args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)

run(['-i', 'vo.wav', '-af', "highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=250:t=q:w=1:g=-2,dynaudnorm=f=200:g=11:p=0.9:m=8,"
     "acompressor=threshold=-20dB:ratio=3:attack=4:release=120:makeup=1.5,volume=1.6,aresample=48000:async=1:first_pts=0",
     '-ar', '48000', '-c:a', 'pcm_s16le', 'out/vo_processed.wav'])

inp = ['-i', 'out/film-silent.mp4', '-i', 'music.mp3', '-i', 'out/vo_processed.wav']
inp += ['-i', 'music.mp3', '-i', 'music.mp3']
fc = [f"[1:a]atrim=0:{CUT},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st={CUT - .5}:d=0.5[m1]",
      f"[3:a]atrim={ECHO[0]}:{ECHO[1]},asetpts=PTS-STARTPTS,volume=0.45,afade=t=in:d=1.2,afade=t=out:st={ECHO[1] - ECHO[0] - 1.5}:d=1.5,adelay={int((CUT - .3) * 1000)}:all=1[m2]",
      f"[4:a]atrim={M_HIT},asetpts=PTS-STARTPTS,adelay={int(HIT_AT * 1000)}:all=1[m3]",
      f"[m1][m2][m3]amix=inputs=3:normalize=0,apad=whole_dur={DUR},atrim=0:{DUR},volume=0.5,"
      f"volume='if(between(t,{LN['rain']['s'] - .2},{LN['rushed']['s']}),0.62,1)':eval=frame,"   # the build peaks under the rain line

      f"equalizer=f=2800:t=q:w=1.5:g=-3,afade=t=out:st={DUR - 2.5}:d=2.5[mus]",
      f"[2:a]asetpts=N/SR/TB,adelay={int(VO_AT * 1000)}:all=1,apad=whole_dur={DUR}[vo]", "[vo]asplit=2[vo1][vosc]",
      "[mus][vosc]sidechaincompress=threshold=0.03:ratio=4:attack=25:release=500:makeup=1[duck]"]
nat, k = [], 5
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
print('mixed', OUT, '| score hit at', round(HIT_AT, 2), 's')
