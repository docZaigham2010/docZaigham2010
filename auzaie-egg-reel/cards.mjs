// Renders each text beat in story.json to a 1080x1920 PNG in build/.
// Typeset on a canvas so ink bounds (not line boxes) drive size and centring.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const story = JSON.parse(fs.readFileSync(path.join(here, 'story.json'), 'utf8'));

const THEMES = {
  cream: { bg: '#FCEBCD', ink: '#02170C', grain: 0.85 },
  dark: { bg: '#002016', ink: '#F6D8B8', grain: 0.2 },
};
// Measured from the reference: single words ~320px capped at 86% width,
// phrases ~152px capped at 90% width; ascender box centred just above mid-frame.
const KINDS = {
  word: { max: 320, fit: 0.86, track: -0.035 },
  phrase: { max: 152, fit: 0.90, track: -0.025 },
};
const CENTER_Y = 945;

const browser = await chromium.launch();
const page = await browser.newPage();
const font = fs.readFileSync(path.join(here, 'fonts/DMSans-700.ttf')).toString('base64');
await page.setContent(`<html><head><style>
@font-face{font-family:'DM Sans';font-weight:700;src:url(data:font/ttf;base64,${font})}
</style></head><body><span style="font:700 10px 'DM Sans'">.</span></body></html>`);
await page.evaluate(() => document.fonts.load("700 100px 'DM Sans'"));
const paper = 'data:image/png;base64,' + fs.readFileSync(path.join(here, 'build/paper.png')).toString('base64');

for (const card of story.cards) {
  const png = await page.evaluate(async ({ card, theme, kind, W, H, CENTER_Y, paper }) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    const grain = new Image();
    grain.src = paper;
    await grain.decode();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = theme.grain;
    ctx.drawImage(grain, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    const setFont = (px, track) => {
      ctx.font = `700 ${px}px 'DM Sans'`;
      ctx.letterSpacing = `${track * px}px`;
    };
    const inkWidth = (text) => {
      const m = ctx.measureText(text);
      return m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    };

    setFont(kind.max, kind.track);
    const size = Math.min(kind.max, kind.max * (kind.fit * W) / inkWidth(card.text));
    setFont(size, kind.track);
    const m = ctx.measureText(card.text);
    const x = W / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const baseline = CENTER_Y + m.actualBoundingBoxAscent / 2;
    ctx.fillStyle = theme.ink;
    ctx.fillText(card.text, x, baseline);

    if (card.handle) {
      setFont(46, 0.01);
      const h = ctx.measureText(card.handle);
      ctx.globalAlpha = 0.62;
      ctx.fillText(card.handle, W / 2 - (h.actualBoundingBoxRight - h.actualBoundingBoxLeft) / 2, baseline + 112);
      ctx.globalAlpha = 1;
    }
    return { url: c.toDataURL('image/png'), size: Math.round(size), baseline: Math.round(baseline) };
  }, { card, theme: THEMES[card.theme], kind: KINDS[card.kind], W: story.width, H: story.height, CENTER_Y, paper });

  fs.writeFileSync(path.join(here, `build/card_${card.id}.png`), Buffer.from(png.url.split(',')[1], 'base64'));
  console.log(`card_${card.id}.png  "${card.text}"  ${png.size}px  baseline ${png.baseline}`);
}
await browser.close();
