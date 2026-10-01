import './site.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createParticles } from './particles.js';
import { buildValley } from './valley.js';
import { setSound, soundOn, clap, tick } from './sound.js';
import { pushToInbox } from '../shared/inbox.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mobile = matchMedia('(max-width: 900px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATIC = reduced;
if (STATIC) document.documentElement.classList.add('is-static');
$('#year').textContent = new Date().getFullYear();

// ───────────────────────── Text splitting ─────────────────────────
function splitWords(root) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span'); mask.className = 'split-mask';
          const w = document.createElement('span'); w.className = 'split-word'; w.textContent = p;
          mask.appendChild(w); frag.appendChild(mask);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('split-mask')) walk(child);
    });
  };
  walk(root);
  return $$('.split-word', root);
}
$$('[data-split]').filter((n) => !n.parentElement.closest('[data-split]')).forEach((n) => splitWords(n));
$$('[data-words], [data-scrub]').forEach((n) => splitWords(n));
// Scrubbed words don't need masks; let them sit inline
$$('[data-scrub] .split-mask, [data-words] .split-mask').forEach((m) => { m.style.overflow = 'visible'; });

// ───────────────────────── Smooth scroll ─────────────────────────
let lenis = null;
if (!STATIC) {
  lenis = new Lenis({ lerp: .085, wheelMultiplier: .95, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target, opts = {}) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
  else {
    const y = typeof target === 'number' ? target : (typeof target === 'string' ? $(target) : target)?.getBoundingClientRect().top + scrollY;
    scrollTo.native(y);
  }
};
scrollTo.native = (y) => window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });

// In-page anchors go through the director
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2 && id !== '#') return;
  e.preventDefault();
  closeMenu();
  const target = id === '#' || id === '#top' ? 0 : $(id);
  if (target === null) return;
  scrollTo(target);
});

// ───────────────────────── Particles ─────────────────────────
let field = null;
const particlesReady = createParticles($('#particles'), { mobile })
  .then((f) => { field = f; if (STATIC) f.setStatic(true); return f; })
  .catch((err) => { console.warn('WebGL unavailable — continuing without the particle field.', err); $('#particles').remove(); });

// ───────────────────────── Film leader ─────────────────────────
const leader = $('#leader');
const leaderCount = $('#leader-count');
const leaderLoad = $('#leader-load');
let entered = false;

async function runLeader() {
  const sweep = $('.leader__sweep');
  const steps = STATIC ? [1] : [5, 4, 3, 2, 1];
  let loaded = 0;
  const loadTick = setInterval(() => { loaded = Math.min(99, loaded + 7 + Math.random() * 9); leaderLoad.textContent = `LOADING REEL ${String(Math.round(loaded)).padStart(3, '0')}%`; }, 120);
  for (const n of steps) {
    leaderCount.textContent = n;
    await gsap.fromTo(sweep, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: STATIC ? .01 : .5, ease: 'none' });
  }
  await particlesReady;
  clearInterval(loadTick);
  leaderLoad.textContent = 'REEL LOADED · 100%';
  leader.classList.add('is-ready');
  $('[data-enter="sound"]', leader).focus({ preventScroll: true });
}
runLeader();

function enter(withSound) {
  if (entered) return;
  entered = true;
  if (withSound) toggleSound(true);
  document.body.classList.remove('is-loading');
  const tl = gsap.timeline();
  tl.to(leader, { opacity: 0, duration: STATIC ? .2 : .9, ease: 'power2.inOut', onComplete: () => { leader.remove(); } });
  if (!STATIC) {
    tl.fromTo('.letterbox__bar', { scaleY: 3.9 }, { scaleY: 1, duration: 1.6, ease: 'expo.inOut' }, 0.2);
    tl.from('.cold__title .split-word', { yPercent: 115, duration: 1.4, stagger: .06, ease: 'expo.out' }, .75);
    tl.from('.cold__slug span, .cold__lede, .cold__scroll', { opacity: 0, y: 16, duration: 1, stagger: .08, ease: 'power3.out' }, 1.2);
    tl.from('.hud, .hud-foot', { opacity: 0, duration: 1.2 }, 1.1);
    tl.fromTo('.cold__ghost', { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 2.4, ease: 'expo.out' }, .8);
  }
  tl.call(() => { lenis?.start(); ScrollTrigger.refresh(); }, null, STATIC ? 0 : 1.1);
  gsap.to({ v: 0 }, { v: 1, duration: STATIC ? .1 : 3, delay: .4, ease: 'power2.inOut', onUpdate() { field?.intro(this.targets()[0].v); } });
  startedAt = performance.now();
}
$$('[data-enter]').forEach((b) => b.addEventListener('click', () => enter(b.dataset.enter === 'sound')));
// Impatient viewers: any key or wheel once the reel is loaded enters silently
addEventListener('keydown', (e) => { if (leader.classList.contains('is-ready') && e.key === 'Escape') enter(false); });
addEventListener('wheel', () => { if (leader.classList.contains('is-ready')) enter(false); }, { passive: true });

// ───────────────────────── HUD: timecode, reel, progress ─────────────────────────
let startedAt = performance.now();
const tc = $('#timecode');
const pad = (n) => String(n).padStart(2, '0');
function timecode(sec) {
  const f = Math.floor((sec % 1) * 24), s = Math.floor(sec) % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}
let rewinding = false, rewindTC = 0;
gsap.ticker.add(() => {
  if (!entered) return;
  if (rewinding) { rewindTC = Math.max(0, rewindTC - .9); tc.textContent = timecode(rewindTC); return; }
  tc.textContent = timecode((performance.now() - startedAt) / 1000);
});

const reelNum = $('#reel-num'), reelName = $('#reel-name'), reelProgress = $('#reel-progress');
const chapters = $$('[data-shape]').map((el) => ({ el, shape: el.dataset.shape, dim: parseFloat(el.dataset.dim || '1') }));
let lastReel = '';
function direct() {
  const vh = innerHeight;
  // Which chapter morph is in progress?
  let a = chapters[0].shape, b = a, t = 1;
  for (let i = 1; i < chapters.length; i++) {
    const top = chapters[i].el.getBoundingClientRect().top;
    if (top < vh * .9) { a = chapters[i - 1].shape; b = chapters[i].shape; t = clamp((vh * .9 - top) / (vh * .7)); }
  }
  field?.setChapter(a, b, t);
  // Which chapter owns the centre of the screen?
  const mid = vh * .5;
  const current = chapters.find((c) => { const r = c.el.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }) || chapters[0];
  field?.setOpacity(current.dim);
  const reel = `REEL ${current.el.dataset.reel}`;
  if (reel + current.el.dataset.reelName !== lastReel) {
    lastReel = reel + current.el.dataset.reelName;
    reelNum.textContent = reel; reelName.textContent = current.el.dataset.reelName;
    gsap.fromTo([reelNum, reelName], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .5, stagger: .05 });
  }
  const max = document.documentElement.scrollHeight - vh;
  reelProgress.style.transform = `scaleX(${clamp(scrollY / max)})`;
}
gsap.ticker.add(direct);

// ───────────────────────── Letterbox & cold open choreography ─────────────────────────
if (!STATIC) {
  gsap.to('.letterbox__bar', { scaleY: 0, ease: 'none', scrollTrigger: { trigger: '.cold', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.cold__inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.cold', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.cold__ghost', { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.cold', start: 'top top', end: 'bottom top', scrub: true } });

  // "Then someone turns on the light."
  const lightWords = $$('.light-on .split-word');
  gsap.fromTo(lightWords, { opacity: .06, filter: 'blur(8px)' }, {
    opacity: 1, filter: 'blur(0px)', stagger: .12, ease: 'none',
    scrollTrigger: { trigger: '.light-on', start: 'top 70%', end: 'center 45%', scrub: true },
  });
  ScrollTrigger.create({ trigger: '.light-on', start: 'top 60%', end: 'bottom top', onToggle: (s) => document.body.classList.toggle('lights-on', s.isActive) });

  // Prologue: the script lights up line by line as you read
  $$('[data-scrub]').forEach((p) => {
    gsap.to($$('.split-word', p), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 55%', scrub: true } });
  });
  gsap.from('.script__slug, .script__char, .script__paren, .script__trans, .script__fade', {
    opacity: 0, x: -20, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.script', start: 'top 70%' },
  });
}

// ───────────────────────── 02 · Two crafts ─────────────────────────
if (!STATIC) {
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.crafts', start: 'top top', end: 'bottom bottom', scrub: true } });
  tl.fromTo('.crafts__q', { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .08 })
    .to('.crafts__intro', { scale: 1.6, opacity: 0, filter: 'blur(10px)', duration: .1 }, .1)
    .fromTo('.craft--live', { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .2 }, .1)
    .fromTo('.craft--live .craft__media', { scale: 1.35 }, { scale: 1, duration: .3 }, .1)
    .from('.craft--live .craft__word', { yPercent: 60, opacity: 0, duration: .12 }, .2)
    .from('.craft--live .craft__line, .craft--live .craft__copy, .craft--live .craft__tag', { y: 30, opacity: 0, stagger: .02, duration: .08 }, .25)
    .fromTo('.craft--film', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .2 }, .45)
    .to('.craft--live .craft__media', { yPercent: -12, duration: .2 }, .45)
    .fromTo('.craft--film .craft__media', { scale: 1.3, yPercent: 10 }, { scale: 1, yPercent: 0, duration: .3 }, .45)
    .from('.craft--film .craft__word', { yPercent: 60, opacity: 0, duration: .12 }, .55)
    .from('.craft--film .craft__line, .craft--film .craft__copy, .craft--film .craft__tag', { y: 30, opacity: 0, stagger: .02, duration: .08 }, .6)
    .to('.craft__body', { opacity: 0, duration: .06 }, .78)
    .to('.craft--live', { clipPath: mobile ? 'inset(14% 6% 52% 6%)' : 'inset(16% 52% 30% 5%)', duration: .14 }, .8)
    .to('.craft--film', { clipPath: mobile ? 'inset(52% 6% 14% 6%)' : 'inset(16% 5% 30% 52%)', duration: .14 }, .8)
    .to('.crafts__outro', { opacity: 1, duration: .08 }, .88)
    .from('.crafts__outro > *', { yPercent: 80, stagger: .02, duration: .08 }, .88);
}

// ───────────────────────── 03 · The reel ─────────────────────────
if (!STATIC) {
  const strip = $('#reel-strip');
  const frames = $$('.frame', strip);
  const frameLabel = $('#reel-frame'), reelTC = $('#reel-tc');
  const distance = () => strip.scrollWidth - innerWidth;
  const tween = gsap.to(strip, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: {
      trigger: '.reel', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onUpdate: (s) => {
        reelTC.textContent = timecode(s.progress * 48);
      },
    },
  });
  // The projector gate: frames tilt as they pass through, and the counter follows the frame in the gate
  const inView = { on: false };
  ScrollTrigger.create({ trigger: '.reel', start: 'top bottom', end: 'bottom top', onToggle: (s) => { inView.on = s.isActive; } });
  gsap.ticker.add(() => {
    if (!inView.on) return;
    const centre = innerWidth / 2;
    let best = 0, bestD = Infinity;
    frames.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const off = (r.left + r.width / 2 - centre) / innerWidth;
      if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
      f.style.transform = `rotateY(${clamp(off * -18, -14, 14)}deg) scale(${1 - Math.min(.08, Math.abs(off) * .08)})`;
    });
    frameLabel.textContent = best < 8 ? `FR ${pad(best + 1)}` : 'FR —';
  });
  frames.forEach((f) => {
    const img = $('img', f);
    if (img) gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: f, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    const info = $$('.frame__info > *', f);
    if (info.length) gsap.from(info, { y: 30, opacity: 0, stagger: .05, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: f, containerAnimation: tween, start: 'left 75%' } });
  });
  gsap.from('.reel__title .split-word, .reel__title', { yPercent: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.reel', start: 'top 60%' } });
}

// ───────────────────────── 04 · The method (clapperboard) ─────────────────────────
{
  const steps = $$('.step');
  const stick = $('.clapper__stick'), flash = $('.clapper__flash');
  const sceneEl = $('#clap-scene'), stepEl = $('#clap-step');
  let current = -1;
  const activate = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    sceneEl.textContent = pad(i + 1);
    stepEl.textContent = $('h3', steps[i]).textContent.toUpperCase();
    if (STATIC) return;
    gsap.timeline()
      .to(stick, { rotate: -22, duration: .18, ease: 'power2.out' })
      .to(stick, { rotate: 0, duration: .11, ease: 'power4.in', onComplete: clap })
      .fromTo(flash, { opacity: .9 }, { opacity: 0, duration: .5 })
      .fromTo('.clapper', { x: -3 }, { x: 0, duration: .25, ease: 'elastic.out(1, .3)' }, '<')
      .to(stick, { rotate: -12, duration: .9, ease: 'power3.inOut' }, '+=.35');
  };
  if (STATIC) steps.forEach((s) => s.classList.add('is-active'));
  else {
    activate(0);
    ScrollTrigger.create({ trigger: '.method', start: 'top top', end: 'bottom bottom', onUpdate: (s) => activate(Math.min(steps.length - 1, Math.floor(s.progress * steps.length * .999))) });
    gsap.from('.method__title .split-word, .method__title', { yPercent: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.method', start: 'top 60%' } });
  }
}

// ───────────────────────── 05 · The valley ─────────────────────────
{
  const v = buildValley($('#valley-svg'), $('#valley-card'), $('#valley-list'), () => tick());
  // On phones the map is swipeable; open it centred on Srinagar
  const mapScroll = $('.valley__scroll');
  requestAnimationFrame(() => { if (mapScroll.scrollWidth > mapScroll.clientWidth) mapScroll.scrollLeft = (mapScroll.scrollWidth - mapScroll.clientWidth) * .5; });
  if (!STATIC) {
    v.routes.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`; });
    gsap.to(v.routes, { strokeDashoffset: 0, stagger: .15, ease: 'none', scrollTrigger: { trigger: '.valley__map', start: 'top 75%', end: 'center 45%', scrub: true } });
    gsap.from(v.pins, { opacity: 0, scale: 0, transformOrigin: 'center', stagger: .08, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.valley__map', start: 'top 70%' } });
    gsap.from('.valley .ridges path', { opacity: 0, y: 20, stagger: .02, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: '.valley__map', start: 'top 80%' } });
  }
}

// ───────────────────────── Reveal-on-enter titles ─────────────────────────
if (!STATIC) {
  $$('.valley__title, .sheet__title, .ys__title').forEach((t) => {
    gsap.from($$('.split-word', t).length ? $$('.split-word', t) : t, { yPercent: 110, duration: 1.2, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 82%' } });
  });
  // Contact sheet: shots drift at different speeds
  $$('.shot').forEach((s, i) => {
    gsap.fromTo(s, { y: 60 + i * 30 }, { y: -40 - i * 20, ease: 'none', scrollTrigger: { trigger: '.contact-sheet', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(s, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: s, start: 'top 90%' } });
  });
  // End credits roll up a little slower than the page
  gsap.fromTo('.credits__roll', { y: '18vh' }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.credits', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.credits__begin', { opacity: 0, y: 20, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.credits__end', start: 'top 70%' } });
}

// ───────────────────────── Lightbox & dialogs ─────────────────────────
const lightbox = $('#lightbox');
$$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => {
  const img = $('img', b);
  $('#lightbox-img').src = img.src; $('#lightbox-img').alt = img.alt;
  $('#lightbox-cap').textContent = $('.shot__cap', b).textContent;
  lightbox.showModal(); lenis?.stop();
}));
$('#credits-open').addEventListener('click', () => { $('#credits-dialog').showModal(); lenis?.stop(); });
$$('dialog').forEach((d) => {
  $('.lightbox__close', d)?.addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => lenis?.start());
});

// ───────────────────────── Scene selection menu ─────────────────────────
const menu = $('#scenes'), menuBtn = $('#menu-open');
function openMenu() { menu.classList.add('is-open'); menu.inert = false; menuBtn.setAttribute('aria-expanded', 'true'); lenis?.stop(); $('#menu-close').focus(); }
function closeMenu() { if (!menu.classList.contains('is-open')) return; menu.classList.remove('is-open'); menu.inert = true; menuBtn.setAttribute('aria-expanded', 'false'); lenis?.start(); menuBtn.focus({ preventScroll: true }); }
menuBtn.addEventListener('click', openMenu);
$('#menu-close').addEventListener('click', closeMenu);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ───────────────────────── Sound ─────────────────────────
const soundBtn = $('#sound-toggle');
function toggleSound(force) {
  const on = typeof force === 'boolean' ? force : !soundOn();
  setSound(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  $('b', soundBtn).textContent = on ? 'ON' : 'OFF';
}
soundBtn.addEventListener('click', () => toggleSound());

// ───────────────────────── Cursor & magnetism ─────────────────────────
if (finePointer && !STATIC) {
  document.documentElement.classList.add('has-cursor');
  const cursor = $('.cursor'), ring = $('.cursor__ring'), dot = $('.cursor__dot'), label = $('.cursor__label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, ringPos = { ...pos };
  addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * .18; ringPos.y += (pos.y - ringPos.y) * .18;
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px)`;
  });
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, select, input, textarea, [role="button"]');
    cursor.classList.toggle('is-hover', !!t);
    const text = t?.dataset?.cursor;
    cursor.classList.toggle('is-label', !!text);
    if (text) label.textContent = text;
    if (t && t !== cursor.lastTarget) tick();
    cursor.lastTarget = t;
  });
  $$('[data-magnetic]').forEach((m) => {
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .5, ease: 'power3.out' });
    });
    m.addEventListener('pointerleave', () => gsap.to(m, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }));
  });
}

// ───────────────────────── Film grain ─────────────────────────
{
  const c = document.createElement('canvas');
  const S = 256;
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const grain = $('#grain');
  grain.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  if (STATIC) grain.style.animation = 'none';
}

// ───────────────────────── 06 · Your scene (enquiry) ─────────────────────────
{
  const form = $('#scene-form');
  const page = $('#script-page');
  const wrap = $('#wrap-card');
  const err = $('#scene-error');
  const guests = $('.ys__guests');
  const filmTypes = ['Brand film', 'Documentary', 'Music video'];
  const typeLabel = () => form.type.selectedOptions[0].textContent;
  const bind = (key, value) => {
    const n = $(`[data-bind="${key}"]`, page);
    if (!n || n.textContent === value) return;
    n.textContent = value;
    n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
    clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('flash'), 700);
  };
  const fmtDate = (v) => v ? new Date(v + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : 'A DAY TO REMEMBER';
  function render() {
    const f = form;
    const isFilm = filmTypes.includes(f.type.value);
    guests.hidden = isFilm;
    const name = f.name.value.trim();
    bind('name', name || 'you');
    bind('name-caps', (name || 'you').toUpperCase());
    bind('intext', f.intext.value);
    bind('location', f.location.value.toUpperCase());
    bind('date', fmtDate(f.date.value));
    const t = typeLabel();
    bind('type-line', t.charAt(0).toUpperCase() + t.slice(1));
    bind('guests-line', !isFilm && f.guests.value ? ` for ${f.guests.value} people` : '');
    bind('feeling', f.feeling.value);
    bind('story', f.story.value.trim() || 'The air is full of something about to begin.');
  }
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const action = e.submitter?.dataset.action || 'studio';
    const name = form.name.value.trim();
    const phone = form.phone.value.trim(), email = form.email.value.trim();
    err.hidden = true;
    if (!name) { err.textContent = 'Every script needs a writer — please add your name.'; err.hidden = false; form.name.focus(); return; }
    if (!phone && !email) { err.textContent = 'How do we reach you? Add a phone number or an email.'; err.hidden = false; form.phone.focus(); return; }
    if (email && !form.email.checkValidity()) { err.textContent = 'That email doesn’t look quite right.'; err.hidden = false; form.email.focus(); return; }

    const enquiry = {
      name, phone, email,
      type: form.type.value,
      location: form.location.value,
      date: form.date.value,
      guests: Number(form.guests.value) || null,
      feeling: form.feeling.value,
      budget: Number(form.budget.value) || 0,
      story: form.story.value.trim(),
      source: action === 'whatsapp' ? 'Website · WhatsApp' : 'Website',
    };
    try { pushToInbox(enquiry); } catch (x) { console.warn('Could not save the demo enquiry', x); }

    if (action === 'whatsapp') {
      const lines = [
        `Hello Aman Productions — here's my scene:`,
        ``,
        `${form.intext.value} ${form.location.value.toUpperCase()} — ${fmtDate(form.date.value)}`,
        `${name} is planning ${typeLabel()}${!filmTypes.includes(form.type.value) && form.guests.value ? ` for about ${form.guests.value} people` : ''}.`,
        `Everyone should feel ${form.feeling.value}.`,
        `Budget: ${form.budget.selectedOptions[0].textContent}.`,
        enquiry.story ? `The story: ${enquiry.story}` : '',
        ``,
        `Reach me at ${[phone, email].filter(Boolean).join(' / ')}`,
      ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
      window.open(`https://wa.me/917780996694?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    }
    $('#wrap-copy').textContent = action === 'whatsapp'
      ? 'WhatsApp is open with your script ready to send. A copy has also been saved to this browser’s Studio OS for the client preview.'
      : 'Saved to Studio OS in this browser (client preview). Open the studio to see it arrive in the pipeline.';
    gsap.to(page, {
      rotate: -8, y: -40, opacity: 0, duration: STATIC ? .01 : .7, ease: 'power3.in', onComplete: () => {
        page.hidden = true; wrap.hidden = false;
        gsap.from(wrap, { opacity: 0, y: 30, duration: .8, ease: 'expo.out' });
      },
    });
    clap();
  });
  $('#wrap-again').addEventListener('click', () => {
    form.reset(); render();
    wrap.hidden = true; page.hidden = false;
    gsap.fromTo(page, { opacity: 0, y: 30, rotate: 1.2 }, { opacity: 1, y: 0, rotate: 1.2, duration: .8, ease: 'expo.out' });
    form.name.focus();
  });
}

// ───────────────────────── Rewind ─────────────────────────
$('#rewind').addEventListener('click', () => {
  const fx = $('.rewind-fx');
  rewinding = true; rewindTC = (performance.now() - startedAt) / 1000;
  fx.classList.add('is-on');
  const done = () => { fx.classList.remove('is-on'); rewinding = false; startedAt = performance.now(); };
  if (lenis) lenis.scrollTo(0, { duration: 2.6, easing: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, onComplete: done });
  else { window.scrollTo(0, 0); done(); }
});

// ───────────────────────── Shutter transition to the studio ─────────────────────────
$$('a[data-transition]').forEach((a) => a.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  if (STATIC) { location.href = a.href; return; }
  gsap.to('.shutter i', { scaleY: 1, duration: .6, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
}));
addEventListener('pageshow', () => gsap.set('.shutter i', { scaleY: 0 }));

// Keep geometry honest after fonts settle
document.fonts?.ready.then(() => ScrollTrigger.refresh());
