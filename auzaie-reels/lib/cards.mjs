// Renders still frames described by a JSON spec (node cards.mjs spec.json).
//
// spec = { width, height, outDir, frames: [{ name, bg, layers: [...] }] }
// bg     = { color } | { image: "path.png" } | { color, image, imageAlpha }
// layer  = text layer  { text, font, size, fit, color, skew, y, lineHeight,
//                        shadow:{color,blur,x,y}, stroke:{color,width},
//                        sizeFrom, reveal, align, x, alpha, tracking }
//        | image layer { image, x, y, w, alpha }
//        | badge layer { badge: "A", y, r }   (AUZAIE monogram)
// `sizeFrom` sizes and positions the text as if it read sizeFrom, so a
// typewriter reveal (`reveal` = characters shown) never shifts or rescales.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b64 = (p) => fs.readFileSync(p).toString('base64');
const FONTS = {
  Anton: 'Anton-Regular.ttf',
  'DM Sans 700': 'DMSans-700.ttf',
  'DM Sans 800': 'DMSans-800.ttf',
};
const css = Object.entries(FONTS)
  .map(([n, f]) => `@font-face{font-family:'${n}';src:url(data:font/ttf;base64,${b64(path.join(here, '../fonts', f))})}`)
  .join('\n');

const images = {};
for (const fr of spec.frames) {
  for (const p of [fr.bg?.image, ...fr.layers.map((l) => l.image)].filter(Boolean)) {
    images[p] ??= 'data:image/png;base64,' + b64(p);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<html><head><style>${css}</style></head><body>${Object.keys(FONTS)
  .map((n) => `<span style="font-family:'${n}'">.</span>`).join('')}</body></html>`);
await page.evaluate(async (names) => { for (const n of names) await document.fonts.load(`100px '${n}'`); }, Object.keys(FONTS));
await page.evaluate(async (images) => {
  window.__img = {};
  for (const [k, v] of Object.entries(images)) { const i = new Image(); i.src = v; await i.decode(); window.__img[k] = i; }
}, images);

fs.mkdirSync(spec.outDir, { recursive: true });
for (const fr of spec.frames) {
  const url = await page.evaluate(({ fr, W, H }) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (fr.bg.color) { ctx.fillStyle = fr.bg.color; ctx.fillRect(0, 0, W, H); }
    if (fr.bg.image) { ctx.globalAlpha = fr.bg.imageAlpha ?? 1; ctx.drawImage(window.__img[fr.bg.image], 0, 0, W, H); ctx.globalAlpha = 1; }

    for (const L of fr.layers) {
      ctx.save();
      ctx.globalAlpha = L.alpha ?? 1;
      if (L.image) {
        const im = window.__img[L.image]; const w = L.w; const h = w * im.height / im.width;
        ctx.drawImage(im, (L.x ?? W / 2) - w / 2, L.y - h / 2, w, h);
      } else if (L.badge) {
        const r = L.r, cx = W / 2, cy = L.y;
        const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        g.addColorStop(0, '#f4f4f4'); g.addColorStop(0.45, '#8d939b'); g.addColorStop(0.55, '#d9dde2'); g.addColorStop(1, '#4b5058');
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.shadowColor = 'transparent';
        const inner = ctx.createRadialGradient(cx, cy - r * 0.4, r * 0.1, cx, cy, r * 0.86);
        inner.addColorStop(0, '#2f4c6a'); inner.addColorStop(1, '#0b1522');
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.fillStyle = inner; ctx.fill();
        ctx.font = `${r * 1.15}px Anton`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const m = ctx.measureText(L.badge);
        const tg = ctx.createLinearGradient(0, cy - r * 0.5, 0, cy + r * 0.5);
        tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#b9c0c8'); tg.addColorStop(0.52, '#eef1f4'); tg.addColorStop(1, '#8b939c');
        ctx.fillStyle = tg; ctx.setTransform(1, 0, -0.14, 1, cx * 0.14, 0);
        ctx.fillText(L.badge, cx, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
      } else {
        const lines = (L.sizeFrom ?? L.text).split('\n');
        const font = (px) => `${px}px '${L.font}'`;
        const track = (px) => `${(L.tracking ?? 0) * px}px`;
        const widest = (px) => { ctx.font = font(px); ctx.letterSpacing = track(px);
          return Math.max(...lines.map((s) => { const m = ctx.measureText(s); return m.actualBoundingBoxLeft + m.actualBoundingBoxRight; })); };
        let px = L.size;
        if (L.fit) px = Math.min(px, px * (L.fit * W) / widest(px));
        ctx.font = font(px); ctx.letterSpacing = track(px); ctx.textBaseline = 'alphabetic';
        const lh = px * (L.lineHeight ?? 1.08);
        const capH = ctx.measureText('H').actualBoundingBoxAscent;
        const top = L.y - ((lines.length - 1) * lh) / 2;  // y = optical centre of the block
        let left = L.reveal ?? Infinity;
        const shown = (L.text).split('\n');
        lines.forEach((full, i) => {
          const m = ctx.measureText(full);
          const wFull = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
          const x0 = L.align === 'left' ? (L.x ?? 60) : W / 2 - wFull / 2 + m.actualBoundingBoxLeft;
          const s = (shown[i] ?? '').slice(0, Math.max(0, left)); left -= (shown[i] ?? '').length;
          if (!s) return;
          const by = top + i * lh + capH / 2;
          ctx.save();
          if (L.skew) ctx.setTransform(1, 0, -Math.tan(L.skew * Math.PI / 180), 1, by * Math.tan(L.skew * Math.PI / 180), 0);
          if (L.shadow) { ctx.shadowColor = L.shadow.color; ctx.shadowBlur = L.shadow.blur; ctx.shadowOffsetX = L.shadow.x ?? 0; ctx.shadowOffsetY = L.shadow.y ?? 0; }
          if (L.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = L.stroke.width; ctx.strokeStyle = L.stroke.color; ctx.strokeText(s, x0, by); ctx.shadowColor = 'transparent'; }
          ctx.fillStyle = L.color; ctx.fillText(s, x0, by);
          ctx.restore();
        });
      }
      ctx.restore();
    }
    return c.toDataURL('image/png');
  }, { fr, W: spec.width, H: spec.height });
  fs.writeFileSync(path.join(spec.outDir, fr.name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log(`rendered ${spec.frames.length} frames -> ${spec.outDir}`);
