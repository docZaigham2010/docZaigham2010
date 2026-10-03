import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('err', e.message));
await p.goto('http://localhost:8777/reel3d/bench.html'); await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
console.log(await p.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(d.UNMASKED_RENDERER_WEBGL); }));
for (let i = 0; i < 4; i++) { const t0 = Date.now(); await p.evaluate(t => window.frame(t), i * .1); const t1 = Date.now(); await p.screenshot({ path: `reel3d/bench${i}.png`, type: 'jpeg', quality: 90 }); console.log('render', t1 - t0, 'ms  shot', Date.now() - t1, 'ms'); }
await b.close();
