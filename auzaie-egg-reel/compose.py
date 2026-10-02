# Cuts the egg shot and the text cards together on the story.json timeline,
# lays the sound under it, and encodes an Instagram-ready MP4.
import os
import subprocess

from timeline import EGG_FRAMES, FPS, STORY

HERE = os.path.dirname(os.path.abspath(__file__))
B = lambda p: os.path.join(HERE, 'build', p)
OUT = os.path.join(HERE, 'AUZAIE_egg_drop_reel.mp4')

cards = STORY['cards']
bounds = [c['from'] for c in cards] + [STORY['end']]
assert cards[0]['from'] == EGG_FRAMES

args = ['ffmpeg', '-v', 'error', '-y', '-i', B('egg_retimed.mp4')]
for c, a, b in zip(cards, bounds, bounds[1:]):
    args += ['-loop', '1', '-framerate', str(FPS), '-t', f'{(b - a) / FPS:.6f}', '-i', B(f"card_{c['id']}.png")]
args += ['-i', B('sound.wav')]

to_yuv = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1'
graph = [
    # a little moving grain on the egg so the AI-clean footage reads as a phone clip
    f'[0:v]trim=end_frame={EGG_FRAMES},setpts=PTS-STARTPTS,noise=c0s=5:c0f=t+u,format=yuv420p,setsar=1[v0]',
]
for i, (c, a, b) in enumerate(zip(cards, bounds, bounds[1:]), start=1):
    graph.append(f'[{i}:v]trim=end_frame={b - a},setpts=PTS-STARTPTS,{to_yuv}[v{i}]')
n = len(cards) + 1
graph.append(''.join(f'[v{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v]')
# lift to Instagram loudness (~-14 LUFS); limiting at 4x oversampling keeps
# inter-sample peaks, and AAC's overshoot on them, under -1 dBTP
graph.append(f'[{n}:a]volume=4dB,aresample=192000,alimiter=limit=0.75:level=false:attack=1.5:release=80,'
             'aresample=48000[a]')

args += [
    '-filter_complex', ';'.join(graph), '-map', '[v]', '-map', '[a]',
    '-r', str(FPS), '-frames:v', str(STORY['end']),
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-preset', 'slow', '-crf', '16',
    '-maxrate', '25M', '-bufsize', '50M', '-g', str(FPS), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest',
    '-movflags', '+faststart', OUT,
]
subprocess.run(args, check=True)
print('wrote', OUT)
