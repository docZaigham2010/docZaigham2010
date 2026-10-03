// Reel 5 — "we don't just code": kinetic type on a drifting gradient, one word per beat.
// Light gradient carries black words, dark gradient carries white ones, flipping on every cut.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'build', 'frames');
fs.mkdirSync(out, { recursive: true });
export const BEATS = JSON.parse(fs.readFileSync(path.join(here, 'beats.json'), 'utf8'));
const FPS = 30, TOTAL = Math.round(BEATS.end * FPS);
const b64 = (f) => fs.readFileSync(path.join(here, '../fonts', f)).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<html><head><style>
@font-face{font-family:'IT8';src:url(data:font/ttf;base64,${b64('InterTight-800.ttf')})}
@font-face{font-family:'IT7';src:url(data:font/ttf;base64,${b64('InterTight-700.ttf')})}
</style></head><body></body></html>`);
await page.evaluate(async () => { await document.fonts.load("40px 'IT8'"); await document.fonts.load("40px 'IT7'"); });

await page.evaluate((B) => {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const off = document.createElement('canvas'); off.width = W; off.height = 700;
  const octx = off.getContext('2d');
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const LIGHT = [['#8fb3ea', 0.15, 0.1], ['#e9b394', 0.05, 0.75], ['#b98be0', 0.95, 0.8], ['#c7a6d9', 0.8, 0.2]];
  const DARK = [['#5f4f3a', 0.1, 0.2], ['#8c6b86', 0.9, 0.15], ['#6e4e66', 0.85, 0.9], ['#3f3b2c', 0.15, 0.85]];
  function bg(dark, t) {
    ctx.fillStyle = dark ? '#5a4a45' : '#c2a9cf'; ctx.fillRect(0, 0, W, H);
    (dark ? DARK : LIGHT).forEach(([col, x, y], i) => {
      const cx = W * (x + 0.08 * Math.sin(t * 0.7 + i * 1.7)), cy = H * (y + 0.05 * Math.cos(t * 0.6 + i));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1150);
      g.addColorStop(0, col); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  }
  // draw one word (or a stacked pair) centred; `fx` animates its entrance over `age` seconds
  function word(b, age, dark) {
    const ink = dark ? '#ffffff' : '#0d0d0d';
    const fx = b.fx || 'cut';
    let alpha = 1, scale = 1, blur = 0;
    if (fx === 'blur') { blur = 22 * (1 - ease(age / 0.14)); alpha = 0.55 + 0.45 * ease(age / 0.1); }
    if (fx === 'pop') { scale = 0.55 + 0.45 * ease(age / 0.12); }
    if (fx === 'grow') { scale = 1 + 0.06 * ease(age / 0.5); }
    const lines = b.lines || [[b.text, b.size || 150]];
    octx.clearRect(0, 0, W, 700);
    let y = 350 - (lines.length - 1) * (b.gap || 0) / 2;
    lines.forEach(([s, size, dy = 0]) => {
      octx.font = `${size}px 'IT8'`; octx.letterSpacing = `${-0.055 * size}px`;
      octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillStyle = ink;
      octx.fillText(s, W / 2 + (b.dx || 0), y + dy); y += b.gap || 0;
    });
    ctx.save(); ctx.globalAlpha = alpha; if (blur > 0.3) ctx.filter = `blur(${blur}px)`;
    ctx.translate(W / 2, b.y || 960); ctx.scale(scale, scale); ctx.translate(-W / 2, -(b.y || 960));
    if (fx === 'warp' && age < 0.3) {
      const k = 1 - ease(age / 0.3);
      for (let sy = 0; sy < 700; sy += 6) {
        const dx = k * 140 * Math.sin(sy * 0.045 + age * 30) , dy = k * 40 * Math.sin(sy * 0.02);
        ctx.drawImage(off, 0, sy, W, 6, dx, (b.y || 960) - 350 + sy + dy, W, 6);
      }
    } else ctx.drawImage(off, 0, (b.y || 960) - 350);
    ctx.restore();
  }
  window.__draw = (t) => {
    const i = B.beats.findLastIndex((b) => t >= b.at);
    const b = B.beats[i];
    const dark = b.dark;
    ctx.filter = 'none'; bg(dark, t);
    if (b.text || b.lines) word(b, t - b.at, dark);
    if (b.cta) {
      ctx.fillStyle = dark ? '#fff' : '#0d0d0d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const a = ease((t - b.at) / 0.25);
      ctx.globalAlpha = a; ctx.font = "150px 'IT8'"; ctx.letterSpacing = '-8px'; ctx.fillText('DM "AUZAIE"', W / 2, 900);
      ctx.font = "54px 'IT7'"; ctx.letterSpacing = '-1px'; ctx.globalAlpha = ease((t - b.at - 0.25) / 0.25) * 0.85;
      ctx.fillText('custom CRM & Business OS', W / 2, 1040);
      ctx.globalAlpha = ease((t - b.at - 0.45) / 0.25) * 0.7; ctx.fillText('@auzaie', W / 2, 1120); ctx.globalAlpha = 1;
    }
    return c.toDataURL('image/png');
  };
}, BEATS);

for (let f = 0; f < TOTAL; f++) {
  const url = await page.evaluate((t) => window.__draw(t), f / FPS);
  fs.writeFileSync(path.join(out, `f_${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log(`rendered ${TOTAL} frames -> ${out}`);
