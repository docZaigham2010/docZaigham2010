// Renders reel.html frame by frame into out/reel-silent.mp4 (or stills for QA).
//   node render.mjs                 -> full video at FPS (default 30)
//   node render.mjs stills 1 6.3 12 -> PNG stills at those seconds
import { launch } from '../net.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out'); fs.mkdirSync(out, { recursive: true });
const fps = Number(process.env.FPS || 30);
const browser = await launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('file://' + path.join(here, 'reel.html'));
await page.evaluate(() => window.__ready);
const dur = await page.evaluate(() => window.__duration);

if (process.argv[2] === 'stills') {
  for (const t of process.argv.slice(3).map(Number)) {
    await page.evaluate(([t, f]) => window.__seek(t, f), [t, Math.round(t * fps)]);
    await page.screenshot({ path: path.join(out, `still-${t.toFixed(2)}.png`) });
  }
  console.log('stills done');
} else {
  const from = Number(process.env.FROM || 0), to = Number(process.env.TO || dur);
  const file = process.env.OUT || path.join(out, 'reel-silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    await page.evaluate(([t, f]) => window.__seek(t, f), [i / fps, i]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`frame ${i}/${n1} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', file);
}
await browser.close();
