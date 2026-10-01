import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2] || path.join(here, 'Markhor_Recovery_Impact_Report_2022-26_A4.pdf');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.join(here, 'report.html'), { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__laidOut === true);
// layout QA: overflow of fixed boxes, elements crossing page edges / footer zone
const issues = await page.evaluate(() => {
  const res = [];
  const mm = 96 / 25.4;
  document.querySelectorAll('.page').forEach((pg, i) => {
    const pr = pg.getBoundingClientRect();
    pg.querySelectorAll('.cols2, .bl-wrap').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
        res.push(`p${i+1} overflow ${el.className} sw=${el.scrollWidth} cw=${el.clientWidth} sh=${el.scrollHeight} ch=${el.clientHeight}`);
    });
    // text blocks must stay above footer rule (283mm) and inside side margins
    pg.querySelectorAll('.fr, .cap, .credit').forEach(el => {
      if (el.closest('.ft')) return;
      const r = el.getBoundingClientRect();
      const bottom = (r.bottom - pr.top) / mm;
      if (bottom > 283.2 && !el.closest('.green-page')) res.push(`p${i+1} text below 283mm: ${el.className} bottom=${bottom.toFixed(1)}mm`);
    });
    // text frames vs images: report intersections
    const obst = [...pg.querySelectorAll('.ph, .doc, .fr > svg')]; const imgs = obst.map(e => e.getBoundingClientRect());
    pg.querySelectorAll('.fr, .cap, p.credit').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height < 1) return;
      // use the real extent of text content
      const range = document.createRange(); range.selectNodeContents(el);
      const rects = [...range.getClientRects()];
      if (!rects.length) return;
      const top = Math.min(...rects.map(x => x.top)), bot = Math.max(...rects.map(x => x.bottom));
      for (const [k, ir] of imgs.entries()) { if (el.contains(obst[k])) continue;
        if (bot > ir.top + 0.5 && top < ir.bottom - 0.5 && r.right > ir.left && r.left < ir.right)
          res.push(`p${i+1} text/image overlap: ${el.className} text ${((top-pr.top)/mm).toFixed(1)}-${((bot-pr.top)/mm).toFixed(1)}mm vs img ${((ir.top-pr.top)/mm).toFixed(1)}-${((ir.bottom-pr.top)/mm).toFixed(1)}mm`);
      }
    });
  });
  return res;
});
console.log(issues.length ? issues.join('\n') : 'layout QA: no overflow/overlap issues');
await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
await browser.close();
console.log('wrote', out);
