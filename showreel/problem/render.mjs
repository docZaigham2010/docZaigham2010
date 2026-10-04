// node render.mjs stills t1 t2 ...   -> out/st_<t>.png + out/sheet.png
// node render.mjs                    -> out/film-silent.mp4 (30 fps, light film grain)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('out', { recursive: true });
const FPS = 30;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://localhost:8777/problem/overlay.html'); await p.evaluate(() => window.__ready);
const dur = await p.evaluate(() => window.__duration); const NF = Math.round(dur * FPS);
const seek = (t) => p.evaluate(([t, f]) => window.__seek(t, f), [t, Math.min(NF - 1, Math.round(t * FPS))]);
if (process.argv[2] === 'stills') {
  const ts = process.argv.slice(3);
  for (const t of ts) { await seek(Number(t)); await p.screenshot({ path: `out/st_${t}.png` }); }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...ts.flatMap(t => ['-i', `out/st_${t}.png`]), '-filter_complex',
    ts.map((_, i) => `[${i}]scale=216:-2[v${i}]`).join(';') + ';' + ts.map((_, i) => `[v${i}]`).join('') + `hstack=${ts.length}`, 'out/sheet.png']);
} else {
  const N = NF, t0 = Date.now();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'noise=c0s=7:c0f=t+u:c1s=3:c1f=t+u:c2s=3:c2f=t+u,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-r', String(FPS), 'out/film-silent.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) {
    await seek(i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('done');
}
await b.close();
