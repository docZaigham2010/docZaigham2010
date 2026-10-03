// Parallel frame renderer: node render3d.mjs [workers] [fps] -> out/frames/%05d.jpg
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const workers = Number(process.argv[2] || 3), fps = Number(process.argv[3] || 30);
fs.mkdirSync('out/frames', { recursive: true });
const DUR = 41.2, N = Math.round(DUR * fps), t0 = Date.now();
let next = 0, done = 0;
async function worker(id) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log(`[w${id}] pageerror`, e.message));
  await p.goto('http://localhost:8777/reel3d/reel.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 600000 });
  // frames are interleaved in blocks so each worker keeps its shaders warm
  while (true) {
    const i = next++; if (i >= N) break;
    const f = `out/frames/${String(i).padStart(5, '0')}.jpg`;
    if (fs.existsSync(f)) { done++; continue; }
    await p.evaluate(([t, fr]) => window.__seek(t, fr), [i / fps, i]);
    await p.screenshot({ path: f, type: 'jpeg', quality: 94, timeout: 0 });
    if (++done % 60 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await b.close();
}
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
console.log('all frames done', ((Date.now() - t0) / 1000).toFixed(0), 's');
