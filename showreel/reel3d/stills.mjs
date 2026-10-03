// node stills.mjs t1 t2 ...  -> out/s_<t>.png and out/sheet.png
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('out', { recursive: true });
const ts = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 200)); });
await p.goto('http://localhost:8777/reel3d/reel.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
for (const t of ts) { await p.evaluate(t => window.__seek(Number(t), Math.round(t * 30)), t); await p.screenshot({ path: `out/s_${t}.png`, timeout: 0 }); }
await b.close();
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...ts.flatMap(t => ['-i', `out/s_${t}.png`]), '-filter_complex', ts.map((_, i) => `[${i}]scale=216:-1[v${i}]`).join(';') + ';' + ts.map((_, i) => `[v${i}]`).join('') + `hstack=${ts.length}`, 'out/sheet.png']);
console.log('ok');
