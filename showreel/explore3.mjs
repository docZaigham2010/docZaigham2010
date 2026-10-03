import { launch, wire } from './net.mjs';
import fs from 'node:fs';
const dir = new URL('./explore/m/', import.meta.url).pathname;
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  storageState: JSON.parse(fs.readFileSync('explore/state.json')) });
await wire(ctx);
const page = await ctx.newPage();
const txt = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 900);
const shot = async n => { await page.screenshot({ path: dir + n + '.png' }); await page.screenshot({ path: dir + n + '-full.png', fullPage: true }); console.log(`--- ${n} ${page.url()}\n${await txt()}`); };
await page.goto('https://ahmad.readyforyourreview.com/#/analysis/lot'); await page.waitForTimeout(4000);
const inp = page.locator('input');
await inp.nth(0).fill('Demo Grower'); await inp.nth(1).fill('Orchard Block 7'); await inp.nth(2).fill('LOT-2410');
await inp.nth(3).fill('2'); await inp.nth(4).fill('20');
await shot('a1-lot');
await page.locator('text=Next: Photos').click(); await page.waitForTimeout(3000);
await shot('a2-photos-empty');
console.log(await page.evaluate(() => [...document.querySelectorAll('input,button')].map(e => `${e.tagName} ${e.type} accept=${e.accept||''} multiple=${e.multiple} txt=${(e.innerText||'').trim().slice(0,30)}`).join('\n')));
const files = page.locator('input[type=file]');
const n = await files.count();
if (n === 1) await files.first().setInputFiles(['assets/tray1.jpg', 'assets/tray2.jpg']).catch(async () => { await files.first().setInputFiles('assets/tray1.jpg'); await page.waitForTimeout(1500); await files.first().setInputFiles('assets/tray2.jpg'); });
else { await files.nth(0).setInputFiles('assets/tray1.jpg'); await page.waitForTimeout(1500); await files.nth(n > 2 ? 2 : 1).setInputFiles('assets/tray2.jpg'); }
await page.waitForTimeout(3000);
await shot('a3-photos-filled');
console.log(await page.evaluate(() => [...document.querySelectorAll('button')].map(e => (e.innerText||'').trim()).join(' / ')));
await page.locator('text=Next: Review').click(); await page.waitForTimeout(3000);
await shot('a4-review');
console.log(await page.evaluate(() => [...document.querySelectorAll('button')].map(e => (e.innerText||'').trim()).join(' / ')));
const go = page.locator('button').filter({ hasText: /analy|submit|run|grade|result/i }).last();
console.log('clicking', await go.innerText());
await go.click();
for (let i = 0; i < 24; i++) { await page.waitForTimeout(2500); if (/results/.test(page.url())) break; if (i === 1) await shot('a5-processing'); }
await page.waitForTimeout(3000);
await shot('a6-results');
fs.writeFileSync('explore/results.html', await page.content());
fs.writeFileSync('explore/state.json', JSON.stringify(await ctx.storageState()));
await b.close();
