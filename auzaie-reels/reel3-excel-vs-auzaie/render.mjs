// Reel 3 frames: "me running my business on Excel + WhatsApp" -> "us with a custom AI CRM" -> CTA.
// Every frame is drawn deterministically from time t, so the animation is exactly repeatable.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'build', 'frames');
const FPS = 30, TOTAL = 288;
fs.mkdirSync(out, { recursive: true });
const b64 = (f) => fs.readFileSync(path.join(here, '../fonts', f)).toString('base64');
const fonts = { Anton: 'Anton-Regular.ttf', 'DMS7': 'DMSans-700.ttf', 'DMS8': 'DMSans-800.ttf' };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<html><head><style>${Object.entries(fonts).map(([n, f]) =>
  `@font-face{font-family:'${n}';src:url(data:font/ttf;base64,${b64(f)})}`).join('')}</style></head><body></body></html>`);
await page.evaluate(async (n) => { for (const f of n) await document.fonts.load(`40px '${f}'`); }, Object.keys(fonts));

await page.evaluate(() => {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H; window.__c = c;
  const ctx = c.getContext('2d');
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const back = (x) => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const text = (s, x, y, font, color, align = 'center', stroke = 0) => {
    ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = '#000'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  };
  const meme = (lines, y) => lines.forEach((s, i) => text(s, W / 2, y + i * 82, "800 68px 'DMS8'", '#fff', 'center', 14));
  const check = (x, y, r) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#2EE6A8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r * 0.42, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.34); ctx.lineTo(x + r * 0.46, y - r * 0.3);
    ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1522'; ctx.stroke();
  };
  const badge = (cx, cy, r) => {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#f4f4f4'); g.addColorStop(0.45, '#8d939b'); g.addColorStop(0.55, '#d9dde2'); g.addColorStop(1, '#4b5058');
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    const inner = ctx.createRadialGradient(cx, cy - r * 0.4, r * 0.1, cx, cy, r * 0.86);
    inner.addColorStop(0, '#2f4c6a'); inner.addColorStop(1, '#0b1522');
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.fillStyle = inner; ctx.fill();
    ctx.save(); ctx.font = `${r * 1.15}px Anton`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText('A');
    const tg = ctx.createLinearGradient(0, cy - r * 0.5, 0, cy + r * 0.5);
    tg.addColorStop(0, '#fff'); tg.addColorStop(0.5, '#b9c0c8'); tg.addColorStop(0.52, '#eef1f4'); tg.addColorStop(1, '#8b939c');
    const by = cy + m.actualBoundingBoxAscent / 2;
    ctx.fillStyle = tg; ctx.transform(1, 0, -0.14, 1, by * 0.14, 0);
    ctx.fillText('A', cx, by); ctx.restore();
  };

  // ---------- scene A: Excel + WhatsApp chaos ----------
  const LEADS = ['Ahmed — Bakery', 'Sara — Dental Clinic', 'Bilal — Logistics', 'Hina — Salon', 'Usman — Real Estate',
    'Ayesha — Boutique', 'Kamran — Gym', 'Zara — Catering', 'Faisal — Auto Parts', 'Nida — Academy', 'Omar — Pharmacy'];
  const NOTES = ['call back?', 'follow up!!', 'sent quote?', '??', 'call tmrw', 'pending', "who's on this?", '...', 'call back?', '?', 'pending'];
  const MSGS = [['Sara', 'Hi, is this still available?'], ['Bilal', "What's the price?"], ['Hina', 'Hello?? Still waiting'],
    ['Usman', 'Did anyone call me back?'], ['Ayesha', "Where's my invoice?"], ['Kamran', 'Payment sent, pls confirm'],
    ['Zara', "Ok... going with someone else"], ['Ahmed', '?']];
  const MSG_T = [0.3, 0.68, 1.02, 1.32, 1.58, 1.8, 2.0, 2.18];
  const COLLAPSE = 2.72;
  const fall = (t, seed) => {
    const u = t - COLLAPSE - (seed % 7) * 0.025; if (u <= 0) return [0, 0];
    return [0.5 * 9000 * u * u, ((seed * 37) % 11 - 5) * 0.05 * u * 4];
  };
  const item = (t, seed, x, y, w, h, draw) => {
    const [dy, rot] = fall(t, seed);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2 + dy); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2); draw(); ctx.restore();
  };
  function sceneA(t) {
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, W, H);
    const amp = 18 * clamp((t - 1.1) / 1.5) ** 2;
    ctx.save(); ctx.translate(amp * Math.sin(t * 61), amp * Math.cos(t * 47));
    const X = 50, Wd = 980, top = 480, rowH = 96;
    item(t, 3, X, top, Wd, 80, () => {
      ctx.fillStyle = '#1d6f42'; rr(0, 0, Wd, 80, [22, 22, 0, 0]); ctx.fill();
      text('Leads_FINAL_v7 (2).xlsx', 30, 40, "700 34px 'DMS7'", '#fff', 'left');
      const n = MSG_T.filter((m) => t >= m).length;
      if (n) { const lbl = n >= 7 ? '99+' : String(n * 9); ctx.beginPath(); ctx.arc(Wd - 60, 40, 30, 0, 7); ctx.fillStyle = '#e5322d'; ctx.fill();
        text(lbl, Wd - 60, 41, "800 26px 'DMS8'", '#fff'); }
    });
    item(t, 5, X, top + 80, Wd, 56, () => {
      ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, Wd, 56);
      [['', 0, 70], ['A  Customer', 70, 470], ['B  Notes', 470, 720], ['C  Status', 720, Wd]].forEach(([s, a]) =>
        text(s, a + 16, 28, "700 26px 'DMS7'", '#555', 'left'));
    });
    LEADS.forEach((name, i) => {
      const y = top + 136 + i * rowH; const missed = t > 0.55 + i * 0.16;
      item(t, i + 11, X, y, Wd, rowH, () => {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, Wd, rowH);
        ctx.strokeStyle = '#d4d4d4'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, Wd, rowH);
        [70, 470, 720].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rowH); ctx.stroke(); });
        text(String(i + 2), 35, rowH / 2, "500 28px 'DMS7'", '#888');
        text(name, 88, rowH / 2, "700 32px 'DMS7'", '#222', 'left');
        text(NOTES[i], 488, rowH / 2, "500 30px 'DMS7'", '#666', 'left');
        if (missed) { ctx.fillStyle = '#fbd3d0'; ctx.fillRect(722, 2, Wd - 724, rowH - 4); text('MISSED', 742, rowH / 2, "800 32px 'DMS8'", '#c62828', 'left'); }
        else text('—', 742, rowH / 2, "500 30px 'DMS7'", '#aaa', 'left');
      });
    });
    // WhatsApp-style notifications stacking from the top of the sheet
    const shown = MSG_T.map((m, k) => [m, k]).filter(([m]) => t >= m);
    shown.forEach(([m, k]) => {
      const age = t - m, newer = shown.length - 1 - k;
      const y = 470 + newer * 150 - (1 - ease(age / 0.22)) * 220;
      if (newer > 6) return;
      item(t, k * 3 + 1, 70, y, 940, 132, () => {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
        ctx.fillStyle = 'rgba(255,255,255,.98)'; rr(0, 0, 940, 132, 34); ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.arc(70, 66, 42, 0, 7); ctx.fillStyle = '#25D366'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(70, 64, 20, 17, 0, 0, 7); ctx.moveTo(56, 76); ctx.lineTo(50, 88); ctx.lineTo(64, 80);
        ctx.fillStyle = '#fff'; ctx.fill();
        text(`WhatsApp · ${MSGS[k][0]}`, 136, 42, "700 27px 'DMS7'", '#8a8a8a', 'left');
        text('now', 900, 42, "500 26px 'DMS7'", '#9a9a9a', 'right');
        text(MSGS[k][1], 136, 88, "800 36px 'DMS8'", k === 6 ? '#c62828' : '#111', 'left');
      });
    });
    ctx.restore();
    meme(['me running my business', 'on Excel + WhatsApp:'], 250);
  }

  // ---------- scene B: the custom AI CRM ----------
  const EVENTS = ['New lead captured from WhatsApp', 'Follow-up sent automatically', 'Payment reminder sent',
    'Meeting booked · 3:00 PM', 'Invoice paid ✓'.replace(' ✓', '')];
  function darkBg() {
    ctx.fillStyle = '#0b1522'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 300, 1100);
    g.addColorStop(0, 'rgba(46,230,168,.16)'); g.addColorStop(1, 'rgba(46,230,168,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function sceneB(u) {
    darkBg();
    const py = 470 + (1 - ease(u / 0.45)) * 120;
    ctx.save(); ctx.globalAlpha = ease(u / 0.3);
    ctx.fillStyle = '#13243a'; rr(50, py, 980, 1270, 44); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "44px Anton"; ctx.letterSpacing = '4px'; text('AUZAIE OS', 100, py + 80, '44px Anton', '#fff', 'left'); ctx.letterSpacing = '0px';
    ctx.beginPath(); ctx.arc(772, py + 80, 10, 0, 7); ctx.fillStyle = '#2EE6A8'; ctx.globalAlpha *= 0.6 + 0.4 * Math.sin(u * 6) ** 2; ctx.fill();
    ctx.globalAlpha = ease(u / 0.3); text('Live · Today', 980, py + 80, "700 30px 'DMS7'", '#8fa3bb', 'right');
    const k = ease((u - 0.3) / 1.0);
    [['Leads', Math.round(47 * k), '#fff'], ['Followed up', Math.round(47 * k), '#fff'], ['Missed', 0, '#2EE6A8']].forEach(([lbl, v, col], i) => {
      const x = 90 + i * 310, y = py + 150;
      ctx.fillStyle = '#1a3150'; rr(x, y, 280, 210, 30); ctx.fill();
      text(String(v), x + 140, y + 95, '104px Anton', col);
      text(lbl, x + 140, y + 172, "700 30px 'DMS7'", '#8fa3bb');
    });
    EVENTS.forEach((ev, i) => {
      const a = (u - 0.75 - i * 0.42) / 0.35; if (a <= 0) return;
      const y = py + 410 + i * 165, x = 90 + (1 - back(a)) * 260;
      ctx.save(); ctx.globalAlpha = clamp(a * 2) * ease(u / 0.3);
      ctx.fillStyle = '#1a3150'; rr(x, y, 900, 140, 30); ctx.fill();
      check(x + 72, y + 70, 36);
      text(ev, x + 136, y + 70, "700 37px 'DMS7'", '#fff', 'left');
      text('auto', x + 860, y + 70, "700 26px 'DMS7'", '#2EE6A8', 'right');
      ctx.restore();
    });
    ctx.restore();
    const s = back(u / 0.3);
    ctx.save(); ctx.translate(W / 2, 290); ctx.scale(s, s); ctx.translate(-W / 2, -290);
    meme(['us with a custom AI CRM:'], 290); ctx.restore();
  }

  // ---------- scene C: CTA ----------
  function sceneC(v) {
    darkBg();
    const s = back(v / 0.35);
    ctx.save(); ctx.translate(W / 2, 700); ctx.scale(s, s); badge(0, 0, 175); ctx.restore();
    ctx.save(); ctx.globalAlpha = ease((v - 0.1) / 0.3); ctx.letterSpacing = '12px';
    text('AUZAIE', W / 2 + 6, 1000, '150px Anton', '#fff'); ctx.letterSpacing = '0px'; ctx.restore();
    ctx.save(); ctx.globalAlpha = ease((v - 0.35) / 0.3); text('Stop juggling. Start growing.', W / 2, 1130, "800 60px 'DMS8'", '#c9d3df'); ctx.restore();
    if (v > 0.9) { const p = back((v - 0.9) / 0.3); ctx.save(); ctx.translate(W / 2, 1300); ctx.scale(p, p);
      text('DM "AUZAIE" for a free demo', 0, 0, '86px Anton', '#FFE27A'); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = ease((v - 1.15) / 0.3); text('@auzaie', W / 2, 1420, "700 46px 'DMS7'", '#8fa3bb'); ctx.restore();
  }

  window.__draw = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (t < 3.3) sceneA(t); else if (t < 6.6) sceneB(t - 3.3); else sceneC(t - 6.6);
    return c.toDataURL('image/png');
  };
});

for (let f = 0; f < TOTAL; f++) {
  const url = await page.evaluate((t) => window.__draw(t), f / FPS);
  fs.writeFileSync(path.join(out, `f_${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log(`rendered ${TOTAL} frames -> ${out}`);
