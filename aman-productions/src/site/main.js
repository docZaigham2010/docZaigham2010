import './site.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildValley } from './valley.js';
import { createSequence } from './sequence.js';
import { pushToInbox } from '../shared/inbox.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mobile = () => matchMedia('(max-width: 860px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
// Motion: the full experience plays by default. Visitors can switch to a calm, still
// version (remembered); devices that ask for reduced motion are offered it, not forced into it.
const MOTION_KEY = 'aman-motion';
const motionPref = (() => { try { return localStorage.getItem(MOTION_KEY); } catch { return null; } })();
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATIC = motionPref === 'calm';
const setMotion = (v) => { try { localStorage.setItem(MOTION_KEY, v); } catch { /* private mode */ } location.reload(); };
if (STATIC) document.documentElement.classList.add('is-static');
$('#year').textContent = new Date().getFullYear();
{
  if (STATIC) {
    // calm mode was chosen earlier — keep one quiet way back to the moving story
    const note = document.createElement('div');
    note.className = 'motion-note';
    note.innerHTML = '<p>You’re watching the still version.</p><button type="button">Play the full experience</button>';
    note.querySelector('button').addEventListener('click', () => setMotion('full'));
    document.body.appendChild(note);
  } else if (prefersReduced && !motionPref) {
    const note = document.createElement('div');
    note.className = 'motion-note';
    note.setAttribute('role', 'status');
    note.innerHTML = '<p>Your device asks for reduced motion. This site is a moving story — prefer it still?</p><button type="button" data-v="calm">Switch to calm mode</button><button type="button" data-v="full" aria-label="Keep the animations">Keep animations</button>';
    note.addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.v; if (!v) return; if (v === 'calm') setMotion('calm'); else { try { localStorage.setItem(MOTION_KEY, 'full'); } catch {} note.remove(); } });
    document.body.appendChild(note);
  }
}

// ───────────────────────── Smooth scroll ─────────────────────────
let lenis = null;
if (!STATIC) {
  lenis = new Lenis({ lerp: .09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else (typeof target === 'number' ? window.scrollTo(0, target) : target?.scrollIntoView());
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  e.preventDefault();
  closeMenu();
  if (id === '#' || id === '#top') return scrollTo(0);
  const el = $(id);
  if (el) scrollTo(el);
});

// ───────────────────────── Opening: the frame is drawn ─────────────────────────
{
  const loader = $('#loader');
  const count = $('#loader-count');
  const images = [...document.images].filter((i) => i.loading !== 'lazy');
  let loaded = 0;
  images.forEach((img) => {
    if (img.complete) loaded++;
    else { const done = () => { loaded++; }; img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });
  const state = { p: 0 };
  const tl = gsap.timeline({ paused: STATIC });
  tl.to('.loader__frame rect', { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0)
    .from('.loader__logo', { scale: .6, opacity: 0, duration: 1, ease: 'expo.out' }, .2)
    .from('.loader__line > *', { y: 14, opacity: 0, stagger: .1, duration: .8 }, .3);
  const tick = () => {
    const frac = (loaded / Math.max(1, images.length)) * .5 + Math.min(1, (window.__seq?.progress() || 0) * 4) * .5;
    const target = Math.min(100, Math.max(state.p + .35, frac * 100));
    state.p += (target - state.p) * .08;
    count.textContent = Math.round(state.p);
    if (state.p > 99.4) { count.textContent = '100'; gsap.ticker.remove(tick); finish(); }
  };
  if (STATIC) { loader.remove(); document.body.classList.remove('is-loading'); }
  else gsap.ticker.add(tick);

  function finish() {
    gsap.timeline({ delay: .25 })
      .to('.loader__count, .loader__line, .loader__logo', { opacity: 0, y: -20, duration: .5, stagger: .05 })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .add(() => { loader.remove(); document.body.classList.remove('is-loading'); lenis?.start(); ScrollTrigger.refresh(); }, '-=.4')
      .from('.hero__line > span', { yPercent: 110, opacity: 0, duration: 1.4, stagger: .07, ease: 'expo.out' }, '-=.75')
      .from('.hero__oval', { scale: .82, opacity: 0, rotate: -6, duration: 1.6, ease: 'expo.out' }, '<.1')
      .from('.hero__float--a', { x: -120, y: -60, rotate: -18, opacity: 0, duration: 1.5, ease: 'expo.out' }, '<.15')
      .from('.hero__float--b', { x: 120, y: 80, rotate: 18, opacity: 0, duration: 1.5, ease: 'expo.out' }, '<')
      .from('.bar, .hero__side, .hero__scroll', { opacity: 0, y: -10, duration: .9, stagger: .06 }, '<.3')
      .from('.hero__now', { xPercent: -100, duration: 1.1, ease: 'expo.out' }, '<');
  }
}

// ───────────────────────── I + II · One continuous shot ─────────────────────────
// Wall → push into the painting → the painting comes alive and the camera swings
// behind the shikara (a scrubbed film) → dawn on the lake, the story arrives.
const SEQ_COUNT = 120;
const seq = window.__seq = STATIC ? null : createSequence($('#seq'), {
  count: SEQ_COUNT,
  src: (i) => `media/v3/seq/${mobile() ? 'm' : 'd'}/${String(i + 1).padStart(3, '0')}.webp`,
});
if (!STATIC) {
  // The push-in lands exactly on the film's first frame: the oval's window already holds
  // that frame (a 16:9 box, 79.14% × 67% of the oval, centred at 50.2% / 50.4%), so we
  // scale it until it covers the viewport — then the canvas takes over with identical pixels.
  const oval = $('.hero__oval');
  gsap.set(oval, { xPercent: -50, yPercent: -57 }); // centring lives in GSAP so x/y below are pure offsets
  const canvasEl = $('.hero__canvas');
  const zoom = () => {
    const w = oval.offsetWidth, h = oval.offsetHeight;
    return Math.max(innerWidth / (w * .7914), innerHeight / (h * .67));
  };
  const topFrac = () => parseFloat(getComputedStyle(oval).top) / canvasEl.offsetHeight;
  const toX = () => -oval.offsetWidth * .002;
  const toY = () => innerHeight / 2 - (topFrac() * innerHeight - .066 * oval.offsetHeight);

  // The oval plays the real footage: the first second of the shot drifts back and forth
  // while the visitor looks. On scroll it eases back to frame 1, where the push-in begins.
  {
    const LOOP = 22; // frames 1–22 of the film
    const live = createSequence($('#oval-live'), { count: LOOP, src: (i) => `media/v3/seq/${mobile() ? 'm' : 'd'}/${String(i + 1).padStart(3, '0')}.webp` });
    const st = { f: 0, dir: 1 };
    const liveEl = $('#oval-live');
    gsap.ticker.add((t, dt) => {
      const atRest = scrollY < innerHeight * .03;
      if (atRest) {
        st.f += st.dir * dt * .012;                       // ≈ 12 fps, half speed: a slow glide
        if (st.f >= LOOP - 1) { st.f = LOOP - 1; st.dir = -1; }
        if (st.f <= 0) { st.f = 0; st.dir = 1; }
      } else st.f += (0 - st.f) * Math.min(1, dt * .012); // settle on frame 1 as the camera moves in
      live.draw(st.f);
      liveEl.style.opacity = atRest || st.f > .05 ? 1 : 0; // the sharp full-size still takes over for the push-in
    });
  }

  const lines = $$('[data-line]');
  const clock = $('#clock'), tc = $('#lens-tc');
  const film = { f: 0 };
  const S = .21, E = .55; // the film plays between these points of the scroll
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.cinema', start: 'top top', end: 'bottom bottom', scrub: .9, invalidateOnRefresh: true,
      onUpdate: (st) => {
        const p = st.progress;
        const fp = Math.min(1, Math.max(0, (p - S) / (E - S)));
        const secs = fp * 6;
        tc.textContent = `00:00:${String(Math.floor(secs)).padStart(2, '0')}:${String(Math.floor((secs % 1) * 24)).padStart(2, '0')}`;
        const pp = Math.min(1, Math.max(0, (p - .56) / .32));
        const mins = 5 * 60 + 42 + Math.round(pp * 38); // 05:42 → 06:20, the sun comes up
        clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      },
    },
  });
  // 1 · the wall clears: type parts like curtains, framed pieces fly off
  tl.to('.hero__line--1', { xPercent: -45, opacity: 0, duration: .07 }, 0)
    .to('.hero__line--3', { xPercent: 45, opacity: 0, duration: .07 }, 0)
    .to('.hero__line--2 > span:first-child', { x: '-35vw', opacity: 0, duration: .07 }, 0)
    .to('.hero__line--2 > span:last-child', { x: '35vw', opacity: 0, duration: .07 }, 0)
    .to('.hero__float--a', { x: '-50vw', y: '-40vh', rotate: -40, duration: .09 }, 0)
    .to('.hero__float--b', { x: '50vw', y: '40vh', rotate: 40, duration: .09 }, 0)
    .to('.bar, .hero__side, .hero__now, .hero__scroll', { opacity: 0, duration: .03 }, 0)
    .to('.hero__wall', { padding: 0, duration: .08 }, .01)
    .to('.hero__canvas', { borderRadius: 0, duration: .08 }, .01)
  // 2 · the camera pushes into the painting, onto the shikara
    .to(oval, { scale: zoom, x: toX, y: toY, duration: .19, ease: 'power2.inOut' }, .02)
    .to('.oval__wood', { opacity: 0, duration: .05, ease: 'power1.in' }, .15)
    .to('.oval__shot', { clipPath: 'ellipse(100% 100% at 50% 50%)', duration: .05 }, .15)
  // 3 · the painting comes alive — cross-dissolve into the film's first frame
    .to('.cinema__seq', { opacity: 1, duration: .005 }, .205)
    .to('.hero__wall', { opacity: 0, duration: .005 }, .21)
    .to('.lens', { opacity: 1, duration: .03 }, .21)
  // 4 · the film: the camera swings round behind the shikara
    .to(film, { f: SEQ_COUNT - 1, duration: E - S, onUpdate: () => seq.draw(film.f) }, S)
  // 5 · the camera settles; the lens becomes a frame and the story arrives
    .to('.lens', { opacity: 0, duration: .03 }, E)
    .to('.cinema__shade', { opacity: 1, duration: .05 }, E)
    .to('.prologue__frame rect', { strokeDashoffset: 0, duration: .08 }, E + .01)
    .to('.prologue__clock', { opacity: 1, duration: .04 }, E + .03)
    .to('.cinema__seq', { scale: 1.14, duration: .45 }, E);
  lines.forEach((l, i) => {
    const at = .6 + i * .055;
    tl.to(l, { opacity: 1, y: 0, duration: .025, ease: 'power2.out' }, at);
    if (i < lines.length - 1) tl.to(l, mobile() ? { opacity: 0, y: -20, duration: .02 } : { opacity: .45, duration: .02 }, at + .05);
  });
  tl.to({}, { duration: .01 }, .99);

  // The next chapter slides over the lake: the shot recedes like a card being set down
  gsap.timeline({ scrollTrigger: { trigger: '.crafts', start: 'top bottom', end: 'top top', scrub: true } })
    .fromTo('.cinema__pin', { scale: 1, borderRadius: 0, filter: 'brightness(1)' }, { scale: .92, borderRadius: 40, filter: 'brightness(.8)', ease: 'none' });
}

// ───────────────────────── Rising section titles ─────────────────────────
if (!STATIC) {
  $$('[data-rise]').forEach((el) => {
    gsap.from(el, { yPercent: 60, opacity: 0, rotate: 2, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  // Crafts: each card's window opens from a sliver while its image settles
  $$('.craft').forEach((c, i) => {
    gsap.fromTo(c, { clipPath: 'inset(30% 12% 30% 12% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: '.crafts__row', start: 'top 95%', end: 'top 35%', scrub: .8 } });
    gsap.fromTo($('img', c), { scale: 1.35, yPercent: 8 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.crafts__row', start: 'top 95%', end: 'bottom top', scrub: .8 } });
  });
  // Repertoire: the dark stage grows out of the cream page and the lights dim around it
  gsap.fromTo('.rep__panel', { scale: .8, borderRadius: 120, y: 80 }, { scale: 1, borderRadius: 34, y: 0, ease: 'none', scrollTrigger: { trigger: '.rep', start: 'top bottom', end: 'top 15%', scrub: .8 } });
  // Valley: the paper sheet rises and unfolds
  gsap.fromTo('.valley', { y: 120, scale: .94, rotate: -1.2 }, { y: 0, scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: '.valley', start: 'top bottom', end: 'top 25%', scrub: .8 } });
  // Your scene: the script page drifts in at an angle
  gsap.fromTo('.page', { y: 160, rotate: 8 }, { y: 0, rotate: 1.4, ease: 'none', scrollTrigger: { trigger: '.ys__grid', start: 'top bottom', end: 'top 30%', scrub: .8 } });
  // Credits rise over the page
  gsap.fromTo('.credits', { y: 120 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.credits', start: 'top bottom', end: 'top 40%', scrub: .8 } });
  gsap.from('.step', { y: 40, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 85%' } });
  gsap.from('.credits__word', { yPercent: 40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.credits', start: 'top 80%' } });
}

// ───────────────────────── Dock: appears after the hero ─────────────────────────
{
  const dock = $('#dock');
  const links = $$('.dock__links a');
  ScrollTrigger.create({ trigger: '.cinema', start: '58% top', endTrigger: 'body', end: 'bottom bottom', onToggle: (s) => dock.classList.toggle('is-shown', s.isActive) });
  links.forEach((a) => {
    const sec = $(a.getAttribute('href'));
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-on', s.isActive) });
  });
}

// ───────────────────────── III · Crafts accordion ─────────────────────────
$$('.craft').forEach((c) => {
  const open = () => $$('.craft').forEach((x) => x.classList.toggle('is-open', x === c));
  c.addEventListener('mouseenter', () => finePointer && open());
  c.addEventListener('click', open);
  c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});

// ───────────────────────── IV · The repertoire ─────────────────────────
{
  const items = [
    { img: 'obj-samovar', name: 'Weddings & celebrations', word: 'celebrate', text: 'From the mehendi to the last dance — décor, flow, hospitality and every family ritual, held with care. The kahwa is always hot.', tags: ['Concept & décor', 'Venues', 'Hospitality'], type: 'Wedding' },
    { img: 'obj-camera', name: 'Brand films & documentaries', word: 'cinematic', text: 'A sixty-second story that stops the scroll, or a long, patient film about people and place. Treatment to final grade.', tags: ['Treatment', 'Shoot', 'Edit & colour'], type: 'Brand film' },
    { img: 'obj-spot', name: 'Concerts & live shows', word: 'electric', text: 'Sound, light and crowd choreography for nights that are louder than words — production design to artist logistics.', tags: ['Production design', 'Sound & light', 'Artists'], type: 'Concert / festival' },
    { img: 'obj-clapper', name: 'Music videos & event films', word: 'rhythm', text: 'Visual worlds built around a sound, and aftermovies that let your event live on — bold, rhythmic, made for repeat.', tags: ['Concept', 'Multi-camera', 'Same-day edits'], type: 'Music video' },
    { img: 'obj-mic', name: 'Corporate events & conferences', word: 'remarkable', text: 'Launches, summits, offsites and award nights — staged with the polish your brand deserves and a run of show to the second.', tags: ['Stage & AV', 'Registration', 'Run of show'], type: 'Corporate event' },
    { img: 'obj-shikara', name: 'Destination experiences', word: 'enchanting', text: 'Shikara arrivals, garden ceremonies, snow-lit evenings. We bring your guests into the valley — travel, stays and permits included.', tags: ['Travel & stays', 'Permits', 'Local craft'], type: 'Destination experience' },
  ];
  const stage = $('#rep-stage'), info = $('#rep-info'), ghost = $('#rep-ghost');
  const els = items.map((it, i) => {
    const d = document.createElement('div');
    d.className = 'rep__item';
    d.innerHTML = `<img src="media/v3/${it.img}.webp" alt="${it.name}" draggable="false" loading="lazy" />`;
    d.addEventListener('click', () => { if (!dragged) go(i); });
    stage.appendChild(d);
    return d;
  });
  $('#rep-total').textContent = String(items.length).padStart(2, '0');
  let index = 0, pos = 0, dragged = false;
  const layout = (p, instant) => {
    els.forEach((el, i) => {
      let o = i - p;
      const n = items.length;
      if (o > n / 2) o -= n; if (o < -n / 2) o += n;
      const a = Math.abs(o);
      const spread = mobile() ? 70 : 38;
      gsap.to(el, {
        xPercent: -50 + o * spread * (mobile() ? 1.2 : 1.5), yPercent: -50 + a * 6, scale: 1 - Math.min(.55, a * .42), opacity: a > 1.6 ? 0 : o > .5 && !mobile() ? .35 : 1 - a * .45,
        zIndex: 10 - Math.round(a), filter: `brightness(${1 - Math.min(.6, a * .45)})`, rotate: o * -3, duration: instant ? 0 : 1, ease: 'expo.out', overwrite: true,
      });
    });
  };
  const render = () => {
    const it = items[index];
    info.innerHTML = `<h3>${it.name}</h3><p>${it.text}</p><ul>${it.tags.map((t) => `<li>${t}</li>`).join('')}</ul><a href="#your-scene" data-type="${it.type}">Plan this with us →</a>`;
    $('a', info).addEventListener('click', () => { $('#scene-form').type.value = it.type; $('#scene-form').dispatchEvent(new Event('change')); });
    $('#rep-now').textContent = String(index + 1).padStart(2, '0');
    $('#rep-bar').style.width = `${(index + 1) / items.length * 100}%`;
    gsap.fromTo(ghost, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1, ease: 'expo.out', onStart: () => { ghost.textContent = it.word; } });
  };
  const go = (i) => { index = (i + items.length) % items.length; pos = index; layout(pos); render(); };
  $('#rep-prev').addEventListener('click', () => go(index - 1));
  $('#rep-next').addEventListener('click', () => go(index + 1));
  $('.rep__panel').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); });
  // Drag (mouse & touch)
  const panel = $('.rep__panel');
  let startX = 0, startPos = 0, down = false;
  panel.addEventListener('pointerdown', (e) => { if (e.target.closest('a, button')) return; down = true; dragged = false; startX = e.clientX; startPos = pos; });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) dragged = true;
    pos = startPos - dx / (panel.clientWidth * .35);
    layout(pos, false);
  });
  addEventListener('pointerup', () => { if (!down) return; down = false; if (dragged) go(Math.round(pos)); setTimeout(() => { dragged = false; }, 0); });
  layout(0, true); render();
  addEventListener('resize', () => layout(pos, true));
}

// ───────────────────────── VI · The valley ─────────────────────────
{
  const v = buildValley($('#valley-svg'), $('#valley-card'), $('#valley-list'));
  const scroller = $('.valley__scroll');
  requestAnimationFrame(() => { if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * .5; });
  if (!STATIC) {
    v.routes.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`; });
    gsap.to(v.routes, { strokeDashoffset: 0, stagger: .15, ease: 'none', scrollTrigger: { trigger: '.valley__map', start: 'top 75%', end: 'center 45%', scrub: true } });
    gsap.from(v.pins, { opacity: 0, scale: 0, transformOrigin: 'center', stagger: .08, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.valley__map', start: 'top 70%' } });
  }
}

// ───────────────────────── Menu ─────────────────────────
const menu = $('#menu');
function openMenu() { menu.classList.add('is-open'); menu.inert = false; lenis?.stop(); $('#menu-close').focus(); }
function closeMenu() { if (!menu.classList.contains('is-open')) return; menu.classList.remove('is-open'); menu.inert = true; lenis?.start(); }
$('#menu-open').addEventListener('click', openMenu);
$('#menu-open-2').addEventListener('click', openMenu);
$('#menu-close').addEventListener('click', closeMenu);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ───────────────────────── VII · Your scene ─────────────────────────
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
    const isFilm = filmTypes.includes(form.type.value);
    guests.hidden = isFilm;
    const name = form.name.value.trim();
    bind('name', name || 'you');
    bind('name-caps', (name || 'you').toUpperCase());
    bind('intext', form.intext.value);
    bind('location', form.location.value.toUpperCase());
    bind('date', fmtDate(form.date.value));
    const t = typeLabel();
    bind('type-line', t.charAt(0).toUpperCase() + t.slice(1));
    bind('guests-line', !isFilm && form.guests.value ? ` for ${form.guests.value} people` : '');
    bind('feeling', form.feeling.value);
    bind('story', form.story.value.trim() || 'The air is full of something about to begin.');
  }
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const action = e.submitter?.dataset.action || 'studio';
    const name = form.name.value.trim(), phone = form.phone.value.trim(), email = form.email.value.trim();
    err.hidden = true;
    if (!name) { err.textContent = 'Every script needs a writer — please add your name.'; err.hidden = false; form.name.focus(); return; }
    if (!phone && !email) { err.textContent = 'How do we reach you? Add a phone number or an email.'; err.hidden = false; form.phone.focus(); return; }
    if (email && !form.email.checkValidity()) { err.textContent = 'That email doesn’t look quite right.'; err.hidden = false; form.email.focus(); return; }
    const enquiry = {
      name, phone, email, type: form.type.value, location: form.location.value, date: form.date.value,
      guests: Number(form.guests.value) || null, feeling: form.feeling.value, budget: Number(form.budget.value) || 0,
      story: form.story.value.trim(), source: action === 'whatsapp' ? 'Website · WhatsApp' : 'Website',
    };
    try { pushToInbox(enquiry); } catch (x) { console.warn('Could not save the demo enquiry', x); }
    if (action === 'whatsapp') {
      const lines = [
        `Hello Aman Productions — here's my scene:`, ``,
        `${form.intext.value} ${form.location.value.toUpperCase()} — ${fmtDate(form.date.value)}`,
        `${name} is planning ${typeLabel()}${!filmTypes.includes(form.type.value) && form.guests.value ? ` for about ${form.guests.value} people` : ''}.`,
        `Everyone should feel ${form.feeling.value}.`,
        `Budget: ${form.budget.selectedOptions[0].textContent}.`,
        enquiry.story ? `The story: ${enquiry.story}` : '', ``,
        `Reach me at ${[phone, email].filter(Boolean).join(' / ')}`,
      ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
      window.open(`https://wa.me/917780996694?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    }
    $('#wrap-copy').textContent = action === 'whatsapp'
      ? 'WhatsApp is open with your script ready to send. A copy has also been saved to this browser’s Studio OS for the client preview.'
      : 'Saved to Studio OS in this browser (client preview). Open the studio to see it arrive in the pipeline.';
    gsap.to(page, { rotate: -8, y: -40, opacity: 0, duration: STATIC ? .01 : .7, ease: 'power3.in', onComplete: () => { page.hidden = true; wrap.hidden = false; gsap.from(wrap, { opacity: 0, y: 30, duration: .8, ease: 'expo.out' }); } });
  });
  $('#wrap-again').addEventListener('click', () => {
    form.reset(); render();
    wrap.hidden = true; page.hidden = false;
    gsap.fromTo(page, { opacity: 0, y: 30 }, { opacity: 1, y: 0, rotate: 1.4, duration: .8, ease: 'expo.out' });
    form.name.focus();
  });
}

// ───────────────────────── Dialogs ─────────────────────────
$$('dialog').forEach((d) => {
  $('.dialog-x', d)?.addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => lenis?.start());
});

document.fonts?.ready.then(() => ScrollTrigger.refresh());
