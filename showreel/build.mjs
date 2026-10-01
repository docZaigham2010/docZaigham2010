// Stitches out/manifest.json into out/showreel.mp4 with crossfades and a score.
// MUSIC=path/to/track.mp3 to use your own soundtrack, MUSIC=none for silence.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out');
const segDir = path.join(out, 'segments');
fs.rmSync(segDir, { recursive: true, force: true });
fs.mkdirSync(segDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const FADE = 0.7, FPS = 30;
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// 1. Trim the blank loading frames and normalise every clip.
const segs = manifest.map((clip, i) => {
  const file = path.join(segDir, `${String(i).padStart(2, '0')}.mp4`);
  ff(['-ss', clip.start.toFixed(2), '-i', clip.file, '-t', clip.duration.toFixed(2),
    '-vf', `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=${FPS},format=yuv420p`,
    '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', file]);
  const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  return { file, d };
});

// 2. Chain crossfades: each clip dissolves into the next, like turning a page.
const inputs = segs.flatMap(s => ['-i', s.file]);
let filter = '', last = '[0:v]', length = segs[0].d;
for (let i = 1; i < segs.length; i++) {
  const label = i === segs.length - 1 ? '[vx]' : `[v${i}]`;
  filter += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${(length - FADE).toFixed(3)}${label};`;
  last = label;
  length += segs[i].d - FADE;
}
if (segs.length === 1) filter = '[0:v]null[vx];';
filter += `[vx]fade=t=in:st=0:d=0.8,fade=t=out:st=${(length - 1.2).toFixed(3)}:d=1.2[v]`;

const silent = path.join(out, 'showreel-silent.mp4');
ff([...inputs, '-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', silent]);

// 3. Score: a slow, warm pad (A minor add9) unless a track is supplied.
const final = path.join(out, 'showreel.mp4');
const music = process.env.MUSIC;
if (music === 'none') {
  fs.renameSync(silent, final);
} else {
  const fadeOut = `afade=t=in:st=0:d=2,afade=t=out:st=${(length - 3).toFixed(2)}:d=3`;
  const audioIn = music
    ? ['-stream_loop', '-1', '-i', music]
    : ['-f', 'lavfi', '-i',
       `aevalsrc='0.06*(sin(2*PI*110*t)+0.8*sin(2*PI*164.81*t)+0.7*sin(2*PI*220*t)+0.5*sin(2*PI*261.63*t)+0.35*sin(2*PI*493.88*t))*(0.75+0.25*sin(2*PI*0.08*t))':s=48000:d=${length.toFixed(2)}`];
  const af = music ? fadeOut : `lowpass=f=1800,aecho=0.8:0.7:420|780:0.35|0.25,${fadeOut}`;
  ff(['-i', silent, ...audioIn, '-filter:a', af, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final]);
  fs.rmSync(silent);
}
console.log(`Showreel ready: ${final} (${length.toFixed(1)}s, ${segs.length} scenes)`);
