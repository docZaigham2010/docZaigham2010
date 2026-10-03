import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://localhost:8777/reel3d/reel.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 600000 });
const out = [];
for (const base of [1, 5, 10, 12.5, 15, 19.5, 22.6, 24, 25.8, 28, 30.3, 32, 35]) {
  await p.evaluate(t => window.__seek(t, 0), base); await p.screenshot({ type: 'jpeg', timeout: 0 });
  const t1 = Date.now(); for (let i = 1; i <= 2; i++) { await p.evaluate(t => window.__seek(t, 0), base + i / 30); await p.screenshot({ type: 'jpeg', quality: 94, timeout: 0 }); }
  out.push(`${base}s:${((Date.now() - t1) / 2000).toFixed(1)}`);
}
console.log(out.join('  '));
await b.close();
