// node shot.mjs <page.html?query> <out.png> [t]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [url, out, t = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await p.goto('http://localhost:8777/reel3d/' + url); await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await p.evaluate(t => window.__seek(Number(t)), t); await p.screenshot({ path: out });
await b.close();
