# Speed-ramps the egg shot onto the reel's 30 fps timeline.
#
# The slow roll comes from build/egg120.mp4 (the clip motion-interpolated to
# 120 fps) so slowing it down stays smooth. Once the egg tips and falls it is
# moving too fast for interpolation (it ghosts), and it plays at real speed
# anyway, so those frames come straight from the generated clip with ordinary
# 24->30 pulldown.
import glob
import os
import shutil
import subprocess

from timeline import EGG_FRAMES, FPS, SRC_RAW_FROM, source_time

HERE = os.path.dirname(os.path.abspath(__file__))
SEQ = os.path.join(HERE, 'build', 'eggseq')
INTERP_FPS, RAW_FPS = 120, 24

plan = []
for n in range(EGG_FRAMES):
    s = source_time(n / FPS)
    plan.append(('raw', round(s * RAW_FPS)) if s >= SRC_RAW_FROM else ('interp', round(s * INTERP_FPS)))


def extract(src, kind):
    frames = sorted({i for k, i in plan if k == kind})
    pick = '+'.join(f'eq(n\\,{i})' for i in frames)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'build', src),
                    '-vf', f"select='{pick}'", '-fps_mode', 'passthrough',
                    os.path.join(SEQ, f'{kind}_%03d.png')], check=True)
    return {i: os.path.join(SEQ, f'{kind}_{k + 1:03d}.png') for k, i in enumerate(frames)}


if not os.path.exists(os.path.join(HERE, 'build', 'egg120.mp4')):  # ~3 min
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'build', 'egg_veo.mp4'),
                    '-t', '1.75', '-an', '-vf',
                    f'minterpolate=fps={INTERP_FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1',
                    '-c:v', 'libx264', '-crf', '8', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                    os.path.join(HERE, 'build', 'egg120.mp4')], check=True)

shutil.rmtree(SEQ, ignore_errors=True)
os.makedirs(SEQ)
files = {'interp': extract('egg120.mp4', 'interp'), 'raw': extract('egg_veo.mp4', 'raw')}
for n, (kind, i) in enumerate(plan):
    os.link(files[kind][i], os.path.join(SEQ, f'out_{n:03d}.png'))

subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(SEQ, 'out_%03d.png'),
    '-frames:v', str(EGG_FRAMES), '-c:v', 'libx264', '-crf', '8', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    os.path.join(HERE, 'build', 'egg_retimed.mp4'),
], check=True)
for f in glob.glob(os.path.join(SEQ, '*.png')):
    os.remove(f)
raw_from = next(n for n, (k, _) in enumerate(plan) if k == 'raw')
print(f'egg_retimed.mp4: {EGG_FRAMES} frames; interpolated roll 0-{raw_from - 1}, '
      f'camera frames {raw_from}-{EGG_FRAMES - 1} (source {[i for k, i in plan if k == "raw"]})')
