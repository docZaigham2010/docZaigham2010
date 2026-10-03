// Films the app as a story: a prologue card, the sign-in, one chapter per
// screen found in the app's navigation, and an epilogue card.
// Writes raw clips plus out/manifest.json for build.mjs to stitch.
//
//   APP_URL=https://ahmad.readyforyourreview.com/#/authentication/sign-in \
//   APP_EMAIL=... APP_PASSWORD=... node record.mjs
//
// Optional: APP_NAME, MAX_SCENES (default 7), ROUTES (JSON [{"route":"#/x","label":"X"}]),
// HEADED=1 to watch it run.
// Uses the project's Playwright when installed (npm install), else the cloud container's copy.
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out');
const clipsDir = path.join(out, 'clips');
fs.rmSync(clipsDir, { recursive: true, force: true });
fs.mkdirSync(clipsDir, { recursive: true });

const signInUrl = process.env.APP_URL;
const email = process.env.APP_EMAIL;
const password = process.env.APP_PASSWORD;
if (!signInUrl || !email || !password) {
  console.error('Set APP_URL, APP_EMAIL and APP_PASSWORD.');
  process.exit(1);
}
const base = signInUrl.split('#')[0];
const appName = process.env.APP_NAME || 'Ready for Your Review';
const maxScenes = Number(process.env.MAX_SCENES || 7);
const W = 1920, H = 1080;

const browser = await chromium.launch({ headless: !process.env.HEADED });
const manifest = [];
let storageState;

// A visible cursor, since recorded video does not show the OS pointer.
const cursorScript = () => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = '__reel_cursor';
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', width: '22px', height: '22px', margin: '-11px 0 0 -11px',
      borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: '2px solid rgba(20,20,30,.75)',
      boxShadow: '0 2px 10px rgba(0,0,0,.35)', zIndex: 2147483647, pointerEvents: 'none',
      transition: 'transform .15s ease', transform: 'translate(-100px,-100px)',
    });
    document.body.appendChild(c);
    let x = -100, y = -100;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; c.style.transform = `translate(${x}px,${y}px)`; }, true);
    addEventListener('mousedown', () => { c.style.transform = `translate(${x}px,${y}px) scale(.7)`; }, true);
    addEventListener('mouseup', () => { c.style.transform = `translate(${x}px,${y}px)`; }, true);
  });
};

async function scene(name, fn, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: clipsDir, size: { width: W, height: H } },
    storageState: opts.auth ? storageState : undefined,
  });
  await context.addInitScript(cursorScript);
  const page = await context.newPage();
  const born = Date.now();
  let start = 0;
  const markStart = () => { start = (Date.now() - born) / 1000; };
  const result = await fn(page, markStart, context);
  const end = (Date.now() - born) / 1000;
  const video = page.video();
  await context.close();
  const file = path.join(clipsDir, `${String(manifest.length).padStart(2, '0')}-${name}.webm`);
  fs.renameSync(await video.path(), file);
  manifest.push({ name, file, start, duration: Math.max(1, end - start), kind: opts.kind || 'app' });
  console.log(`  filmed ${name} (${(end - start).toFixed(1)}s)`);
  return result;
}

async function glide(page, x, y, steps = 28) {
  await page.mouse.move(x, y, { steps });
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

function card(name, kicker, title, line, foot = '', hold = 4200) {
  const q = new URLSearchParams({ kicker, title, line, foot });
  return scene(name, async (page, markStart) => {
    await page.goto('file://' + path.join(here, 'card.html') + '?' + q);
    await page.evaluate(() => document.fonts.ready);
    markStart();
    await page.evaluate(() => window.play());
    await page.waitForTimeout(hold);
  }, { kind: 'card' });
}

// The scrolling element is often an inner panel rather than the window.
async function scrollTour(page) {
  const handle = await page.evaluateHandle(() => {
    const els = [document.scrollingElement, ...document.querySelectorAll('*')];
    let best = null, bestRoom = 0;
    for (const el of els) {
      if (!el) continue;
      const s = getComputedStyle(el);
      const scrollable = el === document.scrollingElement || /(auto|scroll)/.test(s.overflowY);
      const room = el.scrollHeight - el.clientHeight;
      if (scrollable && room > bestRoom && el.clientHeight > 300) { best = el; bestRoom = room; }
    }
    return best;
  });
  const room = await handle.evaluate(el => (el ? el.scrollHeight - el.clientHeight : 0));
  if (room < 40) return;
  const target = Math.min(room, 1400);
  await handle.evaluate(async (el, target) => {
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const go = (to, ms) => new Promise(done => {
      const from = el.scrollTop, t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / ms);
        el.scrollTop = from + (to - from) * ease(t);
        t < 1 ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
    await go(target, 3200);
    await new Promise(r => setTimeout(r, 700));
    await go(0, 1800);
  }, target);
}

// Hover over a few things a viewer would notice: stat cards, rows, buttons.
async function hoverTour(page) {
  const points = await page.evaluate(({ W, H }) => {
    const sel = 'main [class*=card], [class*=stat], [class*=widget], table tbody tr, mat-card, .card, button:not([disabled])';
    const seen = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 24 || r.top < 80 || r.bottom > H - 20 || r.left < 0 || r.right > W) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (seen.some(p => Math.hypot(p.x - x, p.y - y) < 260)) continue;
      seen.push({ x, y });
    }
    return seen.slice(0, 4);
  }, { W, H });
  for (const p of points) {
    await glide(page, p.x, p.y, 30);
    await page.waitForTimeout(650);
  }
}

// ---- The story ------------------------------------------------------------

const lines = [
  [/dash|home|overview/i, 'Where the whole picture comes into view.'],
  [/review/i, 'Every piece of work, waiting its turn to be seen.'],
  [/user|member|people|team|staff|account/i, 'The people who make every review happen.'],
  [/client|customer|compan|organi/i, 'The names behind the work.'],
  [/report|analytic|insight|stat/i, 'The numbers start telling their own story.'],
  [/task|project|job|work/i, 'Where plans turn into progress.'],
  [/doc|file|upload|asset/i, 'Everything in its place, ready when it is needed.'],
  [/message|chat|inbox|notif|mail/i, 'Conversations that keep everyone on the same page.'],
  [/calendar|schedule|event/i, 'Time, laid out plainly.'],
  [/setting|config|profile|prefer/i, 'Made to fit the way you work.'],
  [/role|permission|access|admin/i, 'The right keys in the right hands.'],
];
const fallback = [
  'Another door opens.',
  'The story keeps unfolding.',
  'One more piece of the picture.',
  'Quietly doing its part.',
];
const lineFor = (label, i) => (lines.find(([re]) => re.test(label)) || [, fallback[i % fallback.length]])[1];

console.log('Prologue');
await card('prologue', 'Prologue', appName, 'Every review begins with a single sign-in.', new URL(base).host);

console.log('Sign-in');
const routes = await scene('sign-in', async (page, markStart, context) => {
  await page.goto(signInUrl);
  await settle(page);
  markStart();
  await page.mouse.move(W / 2, H - 150);
  await page.waitForTimeout(600);

  const emailBox = page.locator('input[type=email], input[name*=mail i], input[formcontrolname*=mail i], input[placeholder*=mail i], input[id*=mail i]').first();
  const passBox = page.locator('input[type=password]').first();
  for (const [box, value] of [[emailBox, email], [passBox, password]]) {
    const b = await box.boundingBox();
    await glide(page, b.x + 40, b.y + b.height / 2);
    await box.click();
    await box.fill('');
    await box.pressSequentially(value, { delay: 70 });
    await page.waitForTimeout(350);
  }
  const submit = page.locator('button[type=submit], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
  const sb = await submit.boundingBox();
  await glide(page, sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.waitForTimeout(300);
  await submit.click();
  await page.waitForURL(u => !/authentication|sign-?in|login/i.test(u.toString()), { timeout: 30000 });
  await settle(page);
  await page.waitForTimeout(1500);
  storageState = await context.storageState();

  if (process.env.ROUTES) return JSON.parse(process.env.ROUTES);
  // Read the app's own navigation to decide which chapters to film.
  const found = await page.evaluate(() => {
    const items = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      const r = a.getBoundingClientRect();
      const label = (a.innerText || a.getAttribute('title') || a.getAttribute('aria-label') || '').trim().split('\n')[0];
      if (!label || r.width === 0 || r.height === 0) continue;
      if (!/^(#\/|\/)/.test(href) || /sign-?out|log-?out|authentication|^\/?#?\/?$/i.test(href)) continue;
      items.push({ route: href, label });
    }
    return items;
  });
  const seen = new Set();
  return found.filter(r => !seen.has(r.route) && seen.add(r.route));
});

const chapters = routes.slice(0, maxScenes);
console.log(`Found ${routes.length} screens, filming ${chapters.length}: ${chapters.map(c => c.label).join(', ')}`);

for (const [i, { route, label }] of chapters.entries()) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `screen-${i + 1}`;
  console.log(`Chapter ${i + 1}: ${label}`);
  await card(`ch${i + 1}-card`, `Chapter ${i + 1}`, label, lineFor(label, i), '', 3400);
  await scene(`ch${i + 1}-${slug}`, async (page, markStart) => {
    const url = route.startsWith('#') ? base + route : new URL(route, base).toString();
    await page.goto(url);
    await settle(page);
    markStart();
    await page.mouse.move(W * 0.62, H * 0.35);
    await page.waitForTimeout(900);
    await hoverTour(page);
    await scrollTour(page);
    await page.waitForTimeout(800);
  }, { auth: true });
}

console.log('Epilogue');
await card('epilogue', 'Epilogue', 'Ready for your review.', `${appName} — the whole story, in one place.`, new URL(base).host, 5200);

await browser.close();
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} clips written. Next: node build.mjs`);
