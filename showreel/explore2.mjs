import { launch, wire } from './net.mjs';
import fs from 'node:fs';
const dir = new URL('./explore/m/', import.meta.url).pathname;
fs.mkdirSync(dir, { recursive: true });
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  storageState: JSON.parse(fs.readFileSync('explore/state.json')) });
await wire(ctx);
const page = await ctx.newPage();
const imgs = new Set();
page.on('response', r => { if (/\.(png|jpe?g|webp|svg)(\?|$)/i.test(r.url())) imgs.add(r.url()); });
for (const r of ['#/', '#/dashboard', '#/new-analysis', '#/analysis', '#/results', '#/admin']) {
  await page.goto('https://ahmad.readyforyourreview.com/' + r); await page.waitForTimeout(4500);
  const n = r.replace(/[#/]/g, '') || 'home';
  await page.screenshot({ path: `${dir}${n}.png` });
  console.log(r, '->', page.url(), '|', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300));
}
// follow the sidebar links by clicking
await page.goto('https://ahmad.readyforyourreview.com/#/dashboard'); await page.waitForTimeout(3000);
const btn = page.locator('text=Start New Analysis').first();
if (await btn.count()) { await btn.click(); await page.waitForTimeout(3000); console.log('start ->', page.url()); await page.screenshot({ path: dir + 'start.png', fullPage: true });
  console.log((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 800));
  console.log(await page.evaluate(() => [...document.querySelectorAll('input,select,textarea,button')].map(e => `${e.tagName} ${e.type||''} name=${e.name} ph=${e.placeholder||''} txt=${(e.innerText||'').trim().slice(0,30)}`).join('\n')));
}
console.log([...imgs].join('\n'));
await b.close();
