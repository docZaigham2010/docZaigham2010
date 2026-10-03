# Shared assembly: render card stills, then cut hook footage + stills + sound into an MP4.
import json
import os
import subprocess

LIB = os.path.dirname(os.path.abspath(__file__))
FPS, W, H = 30, 1080, 1920


def render_cards(frames, out_dir, spec_path):
    """frames: list of {name, bg, layers} for lib/cards.mjs."""
    json.dump({'width': W, 'height': H, 'outDir': out_dir, 'frames': frames}, open(spec_path, 'w'))
    subprocess.run(['node', os.path.join(LIB, 'cards.mjs'), spec_path], check=True)


def compose(out, timeline, audio, workdir, hook=None):
    """timeline: list of (png_path, n_frames) shown after the hook.
    hook: (video_path, start_s, end_s) or None. Encodes 1080x1920 H.264/AAC for Instagram."""
    lst = os.path.join(workdir, 'cards.ffconcat')
    with open(lst, 'w') as f:
        f.write('ffconcat version 1.0\n')
        for png, n in timeline:
            f.write(f"file '{os.path.abspath(png)}'\nduration {n / FPS:.6f}\n")
        f.write(f"file '{os.path.abspath(timeline[-1][0])}'\n")
    n_cards = sum(n for _, n in timeline)
    to_yuv = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1'
    args = ['ffmpeg', '-v', 'error', '-y']
    graph = []
    if hook:
        src, a, b = hook
        n_hook = round((b - a) * FPS)
        args += ['-ss', f'{a}', '-t', f'{b - a + 0.5}', '-i', src]
        graph.append(f'[0:v]fps={FPS},trim=end_frame={n_hook},setpts=PTS-STARTPTS,'
                     f'scale={W}:{H}:flags=lanczos,unsharp=5:5:0.6,noise=c0s=4:c0f=t+u,format=yuv420p,setsar=1[h]')
    args += ['-f', 'concat', '-safe', '0', '-i', lst, '-i', audio]
    ci, ai = (1, 2) if hook else (0, 1)
    graph.append(f'[{ci}:v]fps={FPS},trim=end_frame={n_cards},setpts=PTS-STARTPTS,{to_yuv}[c]')
    graph.append('[h][c]concat=n=2:v=1:a=0[v]' if hook else '[c]null[v]')
    graph.append(f'[{ai}:a]volume=4dB,aresample=192000,alimiter=limit=0.75:level=false:attack=1.5:release=80,'
                 'aresample=48000[a]')
    total = (round((hook[2] - hook[1]) * FPS) if hook else 0) + n_cards
    args += ['-filter_complex', ';'.join(graph), '-map', '[v]', '-map', '[a]', '-r', str(FPS),
             '-frames:v', str(total), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2',
             '-preset', 'slow', '-crf', '16', '-maxrate', '25M', '-bufsize', '50M', '-g', str(FPS),
             '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
             '-color_range', 'tv', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest',
             '-movflags', '+faststart', out]
    subprocess.run(args, check=True)
    print('wrote', out, f'({total} frames, {total / FPS:.2f}s)')
