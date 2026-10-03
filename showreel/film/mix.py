# Mixes the brand film: narration, score (from 8 s in, ducked under the voice), location sound
# from every shot, and sound design on the key beats -> out/MalusLens_BrandFilm.mp4
import subprocess, os
from edl import SHOTS, SRC

A = 'audio/'
DUR = 43.4
VO_AT = 1.76
inp = ['-i', 'out/film-silent.mp4', '-i', A + 'vo_final.wav', '-i', A + 'music.mp3']
fc = [
    f"[1:a]highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=250:t=q:w=1:g=-2,dynaudnorm=f=200:g=11:p=0.9:m=8,acompressor=threshold=-20dB:ratio=3:attack=4:release=120:makeup=1.5,volume=1.6,adelay={int(VO_AT*1000)}:all=1,apad=whole_dur={DUR}[vo]",
    f"[2:a]atrim=8,asetpts=PTS-STARTPTS,volume=0.62,volume='if(between(t,17.3,26.6),0.78,if(between(t,26.6,36.4),0.7,1))':eval=frame,equalizer=f=2800:t=q:w=1.5:g=-3,afade=t=in:st=0:d=1.5,afade=t=out:st={DUR-2.4}:d=2.4[mus]",
    "[vo]asplit=2[vo1][vosc]",
    "[mus][vosc]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=600:makeup=1[duck]",
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
fc.append(f"{''.join(nat)}amix=inputs={len(nat)}:normalize=0,volume=0.3[nat]")
# no designed sound effects in the final mix
stem = os.environ.get('STEM')
w = {'vo': '1 0 0', 'bed': '0 1 1', 'music': '0 1 0'}.get(stem, '1 1 1')
norm = '' if stem else ',loudnorm=I=-14:TP=-1.0:LRA=10'
fc.append(f"[vo1][duck][nat]amix=inputs=3:normalize=0:weights={w},atrim=0:{DUR}{norm}[mix]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inp, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[mix]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', os.environ.get('OUT', 'out/MalusLens_BrandFilm.mp4')], check=True)
print('mixed')
