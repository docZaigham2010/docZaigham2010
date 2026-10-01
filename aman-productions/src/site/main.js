import './site.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildValley } from './valley.js';
import { pushToInbox } from '../shared/inbox.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mobile = () => matchMedia('(max-width: 860px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (STATIC) document.documentElement.classList.add('is-static');
$('#year').textContent = new Date().getFullYear();

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
  if (el) scrollTo(id === '#prologue' ? el.offsetTop + innerHeight * .3 : el);
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
    const target = Math.min(100, Math.max(state.p + .9, (loaded / Math.max(1, images.length)) * 100));
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

// ───────────────────────── I · Hero: step into the frame ─────────────────────────
if (!STATIC) {
  // Pointer parallax on the exhibition pieces
  const floats = [['.hero__oval', 12], ['.hero__float--a', -28], ['.hero__float--b', 34]].map(([s, d]) => ({ el: $(s), d, x: gsap.quickTo($(s), 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo($(s), 'y', { duration: 1.2, ease: 'power3' }) }));
  addEventListener('pointermove', (e) => {
    if (scrollY > innerHeight * .3) return;
    const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
    floats.forEach((f) => { f.x(nx * f.d); f.y(ny * f.d); });
  }, { passive: true });

  // The oval grows until its painting becomes the lake itself
  const oval = $('.hero__oval');
  const zoom = () => {
    const r = oval.getBoundingClientRect();
    const paintW = r.width * .62, paintH = r.height * .6;
    return Math.max(innerWidth / paintW, innerHeight / paintH) * 1.15;
  };
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: .8, invalidateOnRefresh: true } });
  tl.to('.hero__line--1', { xPercent: -40, opacity: 0, duration: .3 }, 0)
    .to('.hero__line--3', { xPercent: 40, opacity: 0, duration: .3 }, 0)
    .to('.hero__line--2 > span:first-child', { x: '-30vw', opacity: 0, duration: .3 }, 0)
    .to('.hero__line--2 > span:last-child', { x: '30vw', opacity: 0, duration: .3 }, 0)
    .to('.hero__float--a', { x: '-40vw', y: '-30vh', rotate: -30, duration: .35 }, 0)
    .to('.hero__float--b', { x: '40vw', y: '30vh', rotate: 30, duration: .35 }, 0)
    .to('.bar, .hero__side, .hero__now, .hero__scroll', { opacity: 0, duration: .12 }, 0)
    .to('.hero__wall', { padding: 0, duration: .3 }, .05)
    .to('.hero__canvas', { borderRadius: 0, duration: .3 }, .05)
    .to(oval, { scale: zoom, rotate: 0, duration: .62, ease: 'power2.in' }, .08)
    .to('.hero__scene', { opacity: 1, duration: .14 }, .56)
    .to('.hero__canvas', { opacity: 0, duration: .14 }, .58)
    .fromTo('.hero__scene img', { scale: 1.25 }, { scale: 1, duration: .3, ease: 'power2.out' }, .62)
    .to('.hero__into', { opacity: 1, duration: .1 }, .74)
    .to('.hero__into', { opacity: 0, duration: .1 }, .9);
}

// ───────────────────────── II · Prologue: dawn on the lake ─────────────────────────
if (!STATIC) {
  const lines = $$('[data-line]');
  const clock = $('#clock');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.prologue', start: 'top top', end: 'bottom bottom', scrub: .6,
      onUpdate: (s) => {
        const mins = 5 * 60 + 42 + Math.round(s.progress * 38); // 05:42 → 06:20, the sun comes up
        clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      },
    },
  });
  tl.to('.prologue__frame rect', { strokeDashoffset: 0, duration: .25 }, 0)
    .fromTo('.prologue__bg', { scale: 1.08, filter: 'brightness(.85) saturate(.85)' }, { scale: 1.22, filter: 'brightness(1.08) saturate(1.1)', duration: 1 }, 0);
  lines.forEach((l, i) => {
    const at = .08 + i * .17;
    tl.to(l, { opacity: 1, y: 0, duration: .07, ease: 'power2.out' }, at);
    if (i < lines.length - 1 && mobile()) tl.to(l, { opacity: 0, y: -20, duration: .06 }, at + .15);
    else if (i < lines.length - 1) tl.to(l, { opacity: .45, duration: .06 }, at + .15);
  });
}

// ───────────────────────── Rising section titles ─────────────────────────
if (!STATIC) {
  $$('[data-rise]').forEach((el) => {
    gsap.from(el, { yPercent: 60, opacity: 0, rotate: 2, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.craft', { y: 120, opacity: 0, stagger: .12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.crafts__row', start: 'top 85%' } });
  gsap.from('.rep__panel', { scale: .92, borderRadius: 80, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.rep', start: 'top 85%' } });
  gsap.from('.step', { y: 40, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 85%' } });
  gsap.from('.credits__word', { yPercent: 40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.credits', start: 'top 80%' } });
}

// ───────────────────────── Dock: appears after the hero ─────────────────────────
{
  const dock = $('#dock');
  const links = $$('.dock__links a');
  ScrollTrigger.create({ trigger: '.prologue', start: 'top 60%', endTrigger: 'body', end: 'bottom bottom', onToggle: (s) => dock.classList.toggle('is-shown', s.isActive) });
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

// ───────────────────────── V · Method: a peek follows the cursor ─────────────────────────
{
  const peek = $('#peek'), img = $('img', peek);
  const px = gsap.quickTo(peek, 'x', { duration: .6, ease: 'power3' });
  const py = gsap.quickTo(peek, 'y', { duration: .6, ease: 'power3' });
  $$('.step').forEach((s) => {
    s.addEventListener('mouseenter', () => { img.src = s.dataset.img; peek.classList.add('is-on'); s.classList.add('is-on'); });
    s.addEventListener('mouseleave', () => { peek.classList.remove('is-on'); s.classList.remove('is-on'); });
    s.addEventListener('mousemove', (e) => { px(e.clientX + 30); py(e.clientY - 120); });
  });
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

// ───────────────────────── Cursor ─────────────────────────
if (finePointer && !STATIC) {
  document.documentElement.classList.add('has-cursor');
  const cursor = $('.cursor'), label = $('.cursor__label');
  const cx = gsap.quickTo(cursor, 'x', { duration: .25, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: .25, ease: 'power3' });
  addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-live'); }, { passive: true });
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-cursor]');
    const text = t && !e.target.closest('a, button, input, select, textarea') ? t.dataset.cursor : '';
    cursor.classList.toggle('is-label', !!text);
    cursor.classList.toggle('is-dark', !!t?.closest('.rep'));
    if (text) label.textContent = text;
  });
}

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

// ───────────────────────── Credits ─────────────────────────
$('#credits-open').addEventListener('click', () => { $('#credits-dialog').showModal(); lenis?.stop(); });
$$('dialog').forEach((d) => {
  $('.dialog-x', d)?.addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => lenis?.start());
});
$('#rewind').addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 2.4, easing: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) }) : window.scrollTo(0, 0)));

document.fonts?.ready.then(() => ScrollTrigger.refresh());
