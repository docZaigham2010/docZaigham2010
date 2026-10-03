// The Malus Lens film: nine 3D shots cut to the voiceover (line start = VO time + 1.0s).
import {
  THREE, RoundedBoxGeometry, W, H, RED, clamp, lerp, E, P, rng, draw, studioEnv, backdrop, canvasTex, tex,
  makeApple, makeLogo, appleGeo, appleMat, appleRadiusAt, loadFonts, text3d, letterIn, mats, glassCard, roundRect, makePhone,
  hudScene, hudCam,
} from './engine.js';

await loadFonts();
const env = studioEnv();
hudScene.environment = env;
const hudKey = new THREE.DirectionalLight(0xffffff, 2.4); hudKey.position.set(-2, 3, 4); hudScene.add(hudKey);
const T = {
  scan: await tex('../reel/img/scan.jpg'), hero: await tex('../reel/img/landing-hero.jpg'), tray1: await tex('../reel/img/tray1.jpg'), tray2: await tex('../reel/img/tray2.jpg'),
  lot: await tex('../reel/img/a1-lot.png'), photos: await tex('../reel/img/a3-photos-filled.png'),
};
const logoImg = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = '../reel/img/app-logo.png'; });

const TOTAL = 41.2;
const RED_HEX = '#d3202a';
const cam = () => { const c = new THREE.PerspectiveCamera(30, W / H, .05, 300); return c; };
const scene = (opts) => { const s = new THREE.Scene(); s.environment = env; const b = backdrop(s, opts); s.userData.bd = b; return s; };
const look = (c, p, tgt) => { c.position.set(...p); c.lookAt(...tgt); };

// ---- HUD type: 3D letters on a layer in front of the camera (always sharp) -------------
const HUD_Z = -6, HUD_W = 1.62;           // visible width at the HUD plane is ~1.81
const huds = [];
function hud(parts, { size = .2, y = 0, weight = 'ExtraBold', maxW = HUD_W, z = HUD_Z } = {}) {
  const g = text3d(parts, { size, weight, depth: size * .28, bevel: size * .03 });
  if (g.userData.width > maxW) g.scale.setScalar(maxW / g.userData.width);
  g.position.set(0, y > .4 ? y - .2 : y, z); g.visible = false; hudScene.add(g); huds.push(g);
  return g;
}
const W_ = (s) => [[s, mats.white()]], R_ = (s) => [[s, mats.red()]];
function hudShow(g, t, t0, t1, opts = {}) { // letters in at t0, out at t1
  const on = t > t0 - .01 && t < t1 + .9;
  g.visible = on; if (on) letterIn(g, t, t0, { ...opts, out: t1 });
}
function label(w, h, paint, scale = 600) { // flat label on the HUD layer (small print)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(w * scale, h * scale, paint), transparent: true, toneMapped: false, depthWrite: false }));
  m.position.z = HUD_Z; m.visible = false; hudScene.add(m); huds.push(m); return m;
}
const ink = (g, font, color = '#fff', align = 'left') => { g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = align; };

// ---- common lights ------------------------------------------------------------------------
function rig(s, { key = [-4, 5, 5], keyI = 110, rim = [4, 2.5, -4], rimI = 140, rimC = 0xff5040, fill = .15 } = {}) {
  const k = new THREE.SpotLight(0xffffff, keyI, 0, .5, .7); k.position.set(...key); s.add(k); s.add(k.target);
  const r = new THREE.SpotLight(rimC, rimI, 0, .5, .6); r.position.set(...rim); s.add(r); s.add(r.target);
  s.add(new THREE.AmbientLight(0xffffff, fill));
  return { k, r };
}

// ==========================================================================================
// S1  0.00–2.95  "Every apple tells a story."  A single apple revealed by a sweeping light.
// ==========================================================================================
const s1 = scene({ glow: 0x2a0508, glowPos: [.1, .3] }), c1 = cam();
const a1 = makeApple(); a1.position.set(0, .5, 0); s1.add(a1);
const l1 = rig(s1, { keyI: 140 });
const h1a = hud(W_('Every apple'), { size: .26, y: -1.05 });
const h1b = hud([['tells a ', mats.white()], ['story.', mats.red()]], { size: .26, y: -1.42 });
function S1(t) {
  const push = P(t, 0, 2.6, E.out), dive = P(t, 2.45, 2.95, E.expoIn);
  look(c1, [Math.sin(lerp(.5, -.12, push)) * lerp(17, 10.5, push) * (1 - dive * .9), lerp(1.6, .9, push), Math.cos(lerp(.5, -.12, push)) * lerp(17, 10.5, push) * (1 - dive * .9)], [0, .5 - dive * .2, 0]);
  a1.rotation.y = t * .35 + .4; a1.rotation.z = Math.sin(t * .8) * .03;
  l1.k.position.set(lerp(-7, 4, P(t, 0, 2.6)), 5, 5);       // light sweeps across the skin
  l1.k.intensity = lerp(0, 160, P(t, 0, 1.2));
  hudShow(h1a, t, 1.0, 2.5); hudShow(h1b, t, 1.45, 2.5);
  s1.userData.bd.tick(t);
  return { scene: s1, cam: c1, dof: { focus: c1.position.distanceTo(a1.position), aperture: .0006, maxblur: .01 },
    black: 1 - P(t, 0, .9, E.out), zoom: dive * .45, bloom: .5 };
}

// ==========================================================================================
// S2  2.95–9.05  The cold-store floor. Rows of crates under flickering cold light.
// ==========================================================================================
const s2 = scene({ top: 0x020306, glow: 0x0c1a2e, glowPos: [0, .2], dust: 220, seed: 4 }), c2 = cam();
s2.fog = new THREE.FogExp2(0x04070c, .075);
const wood = canvasTex(512, 128, (g, w, h) => {
  const r = rng(9); g.fillStyle = '#5a3b22'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${r() < .5 ? '30,18,8' : '140,100,60'},${.15 + r() * .25})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (r() - .5) * 10, w * .7, y + (r() - .5) * 10, w, y + (r() - .5) * 6); g.stroke(); }
});
const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .8 });
function crate(x, y, z, seed) {
  const g = new THREE.Group(), W2 = 1.5, D2 = 1.05, H2 = .6;
  const slab = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat); m.position.set(px, py, pz); g.add(m); };
  for (let i = 0; i < 2; i++) { const yy = .12 + i * .3; slab(W2, .2, .05, 0, yy, D2 / 2); slab(W2, .2, .05, 0, yy, -D2 / 2); slab(.05, .2, D2, W2 / 2, yy, 0); slab(.05, .2, D2, -W2 / 2, yy, 0); }
  slab(W2, .04, D2, 0, .02, 0);
  g.position.set(x, y, z); return g;
}
const crates = [], appleSpots = [];
{
  const r = rng(11);
  for (let row = 0; row < 4; row++) for (let i = -4; i <= 4; i++) for (let lvl = 0; lvl < 2; lvl++) {
    const x = i * 1.62 + (row % 2) * .8, z = -row * 2.6, y = lvl * .66 - 1.2;
    const c = crate(x, y, z, i); s2.add(c); crates.push(c);
    for (let a = 0; a < 15; a++) appleSpots.push([x + ((a % 5) - 2) * .28 + (r() - .5) * .04, y + .5 + (r() * .04), z + (Math.floor(a / 5) - 1) * .3 + (r() - .5) * .04, r() * 6, r() * .5]);
  }
}
const inst = new THREE.InstancedMesh(appleGeo(), appleMat(), appleSpots.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  appleSpots.forEach(([x, y, z, ry, rx], i) => { q.setFromEuler(new THREE.Euler(rx, ry, 0)); sc.setScalar(.135 + (i % 7) * .004); m.compose(new THREE.Vector3(x, y, z), q, sc); inst.setMatrixAt(i, m); }); }
s2.add(inst);
const tubes = [];
for (let i = 0; i < 4; i++) { // fluorescent tubes overhead
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3.2, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xcfe6ff).multiplyScalar(3) }));
  m.rotation.z = Math.PI / 2; m.position.set(-3 + i * 3.4, 2.4, -i * 2.4 + 1); s2.add(m); tubes.push(m);
}
const cold = new THREE.SpotLight(0xbfdcff, 160, 0, .9, .8); cold.position.set(0, 5, 3); s2.add(cold); s2.add(cold.target); cold.target.position.set(0, -1, -1);
s2.add(new THREE.AmbientLight(0x6080a0, .25));
const h2a = hud(W_('But on a busy'), { size: .2, y: 1.28 });
const h2b = hud(W_('cold-store floor,'), { size: .2, y: 1.0 });
const h2c = hud(W_('grading comes down to'), { size: .11, y: .55, weight: 'Bold' });
const h2d = hud(W_('TIRED EYES'), { size: .34, y: .2 });
const h2e = hud(R_('GUESSWORK'), { size: .3, y: -.3 });
const chipPaint = (txt) => (g, w, h) => { ink(g, '600 64px Inter'); g.fillStyle = '#ff4d4d'; g.beginPath(); g.moveTo(60, h / 2 + 26); g.lineTo(90, h / 2 - 28); g.lineTo(120, h / 2 + 26); g.closePath(); g.fill(); ink(g, '600 64px Inter'); g.fillText(txt, 150, h / 2); };
const chips2 = ['Varies shift to shift', 'Paper trails get lost', 'Hours, not seconds'].map((t, i) => {
  const c = glassCard(1.25, .25, chipPaint(t), { rough: .3, scale: 840 }); c.userData.slab.material = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: .25, clearcoat: 1, transparent: true, opacity: .85 });
  hudScene.add(c); huds.push(c); c.visible = false; return c;
});
function S2(t) {
  const u = t - 2.95, arrive = P(t, 2.95, 3.6, E.expoOut), leave = P(t, 8.6, 9.05, E.expoIn);
  look(c2, [lerp(-2.6, 1.4, P(t, 2.95, 9.05, E.sine)), lerp(.9, .45, P(t, 2.95, 9.05)), lerp(2.0, 4.6, arrive) - leave * 2.5], [lerp(-1.4, 1.0, P(t, 2.95, 9.05, E.sine)), -.75, -1.2]);
  c2.rotation.z += Math.sin(u * 1.3) * .006;
  const flick = (t > 6.0 && t < 7.0) ? (Math.sin(t * 90) > .2 ? 1 : .35) : 1;
  tubes.forEach((m, i) => m.material.color.setScalar(3 * (i === 1 ? flick : 1)));
  cold.intensity = 160 * (t > 6.0 && t < 7.0 ? lerp(.6, 1, flick) : 1);
  chips2.forEach((c, i) => {
    const k = P(t, 5.0 + i * .35, 5.8 + i * .35, E.expoOut), o = P(t, 8.4, 8.8, E.expoIn);
    c.position.set((i % 2 ? .18 : -.12) + (1 - k) * (i % 2 ? 1.5 : -1.5), -.92 - i * .32, HUD_Z);
    c.rotation.set(0, (1 - k) * (i % 2 ? -1 : 1) * 1.1 + (i % 2 ? -.12 : .12), 0); c.scale.setScalar(Math.max(.001, k * (1 - o))); c.visible = k > 0 && o < 1;
  });
  hudShow(h2a, t, 2.95, 5.85); hudShow(h2b, t, 3.25, 5.85); hudShow(h2c, t, 4.85, 7.7);
  // TIRED EYES slams in
  h2d.visible = t > 6.08 && t < 9.1;
  if (h2d.visible) { const k = P(t, 6.1, 6.45, E.expoOut); h2d.position.z = lerp(-2.2, HUD_Z, k); h2d.children.forEach(m => { m.position.copy(m.userData.base); m.rotation.set(0, 0, 0); m.scale.setScalar(1); m.visible = true; });
    const fade = P(t, 7.7, 8.1); h2d.children.forEach(m => m.material.opacity = 1); h2d.position.y = .2 + fade * .12; h2d.scale.setScalar(h2d.scale.x); }
  // GUESSWORK lands, then shatters
  h2e.visible = t > 7.74 && t < 9.1;
  if (h2e.visible) { const k = P(t, 7.75, 8.1, E.backOut), sh = P(t, 8.45, 9.05, E.expoIn), r = rng(5);
    h2e.children.forEach(m => { const b = m.userData.base, a = r() * Math.PI * 2, v = 1.5 + r() * 2;
      m.position.set(b.x + Math.cos(a) * v * sh, b.y + Math.sin(a) * v * sh, b.z + (1 - k) * -3 + sh * (r() * 4));
      m.rotation.set((1 - k) * -1.5 + sh * (r() - .5) * 8, sh * (r() - .5) * 8, (1 - k) * .3); m.scale.setScalar(Math.max(.001, k)); m.visible = true; }); }
  s2.userData.bd.tick(t);
  const shake = (t > 6.1 && t < 6.4) ? Math.sin(t * 120) * .02 * (1 - P(t, 6.1, 6.4)) : 0;
  c2.position.x += shake;
  return { scene: s2, cam: c2, dof: { focus: 4.6, aperture: .0009, maxblur: .012 }, exposure: .95, zoom: (1 - P(t, 2.95, 3.4, E.out)) * .4 + leave * .5, bloom: .7, threshold: .75,
    white: (t > 6.1 && t < 6.35) ? .25 * (1 - P(t, 6.1, 6.35)) : 0 };
}

// ==========================================================================================
// S3  9.05–12.0  "What if every tray could be judged in seconds?"  Apple in a glass timer.
// ==========================================================================================
const s3 = scene({ glow: 0x330608, glowPos: [-.2, -.1], seed: 7 }), c3 = cam();
const a3 = makeApple(); s3.add(a3);
const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.75, .09, 32, 200), mats.glass(0xffffff, .04)); s3.add(ring3);
const arcMat = new THREE.MeshPhysicalMaterial({ color: RED, emissive: RED, emissiveIntensity: 2.2, roughness: .2, clearcoat: 1 });
let arc3 = new THREE.Mesh(new THREE.TorusGeometry(1.75, .05, 16, 200, .01), arcMat); s3.add(arc3);
const ticks = new THREE.Group(); s3.add(ticks);
for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.012, i % 5 ? .07 : .16, .02), mats.chrome()); const a = i / 60 * Math.PI * 2; m.position.set(Math.sin(a) * 2.05, Math.cos(a) * 2.05, 0); m.rotation.z = -a; ticks.add(m); }
const l3 = rig(s3, { keyI: 120 });
const h3a = hud(W_('What if'), { size: .11, y: 1.5, weight: 'Bold' });
const h3b = hud(W_('every tray'), { size: .24, y: 1.2 });
const h3c = hud(W_('could be judged'), { size: .2, y: .88 });
const h3d = hud(R_('in seconds?'), { size: .24, y: .52 });
let lastArc = -1;
function S3(t) {
  const k = P(t, 9.05, 11.4, E.out), col = P(t, 11.4, 11.95, E.expoIn);
  look(c3, [Math.sin(lerp(-.6, .25, k)) * 11.5, lerp(-.6, .4, k), Math.cos(lerp(-.6, .25, k)) * 11.5], [0, .55, 0]);
  const grp = [a3, ring3, arc3, ticks];
  grp.forEach(o => { o.position.y = -1.3; o.scale.setScalar(Math.max(.001, 1 - col)); });
  a3.position.y = lerp(-3.0, -1.3, P(t, 9.1, 10.2, E.expoOut)); a3.rotation.y = t * .6;
  ring3.rotation.set(Math.sin(t) * .1, lerp(-1.2, 0, P(t, 9.3, 10.4, E.expoOut)), 0); ticks.rotation.copy(ring3.rotation); arc3.rotation.copy(ring3.rotation);
  const sweep = P(t, 10.1, 11.2, E.inOut), a = Math.max(.01, sweep * Math.PI * 2);
  if (Math.abs(a - lastArc) > .002) { arc3.geometry.dispose(); arc3.geometry = new THREE.TorusGeometry(1.75, .05, 16, 200, a); lastArc = a; }
  arc3.rotation.z = Math.PI / 2;
  hudShow(h3a, t, 9.12, 11.35); hudShow(h3b, t, 9.5, 11.35); hudShow(h3c, t, 9.95, 11.35); hudShow(h3d, t, 10.55, 11.35);
  l3.k.intensity = 120 * (1 - col); l3.r.intensity = 140 * (1 - col);
  s3.userData.bd.tick(t);
  return { scene: s3, cam: c3, dof: { focus: 10, aperture: .0005, maxblur: .008 }, bloom: .8, threshold: .7, black: col * .9, zoom: (1 - P(t, 9.05, 9.5, E.out)) * .35 };
}

// ==========================================================================================
// S4  12.0–13.65  "Meet Malus Lens."  The mark assembles on the drop.
// ==========================================================================================
const s4 = scene({ glow: 0x5a0a0e, glowPos: [0, .1], seed: 8 }), c4 = cam();
const logo4 = makeLogo(); s4.add(logo4);
const shock = new THREE.Mesh(new THREE.TorusGeometry(1, .03, 16, 160), mats.glass()); s4.add(shock);
rig(s4, { keyI: 150, rimI: 220 });
const h4a = hud([['Malus ', mats.white()], ['Lens', mats.red()]], { size: .3, y: -1.02 });
const h4b = hud(W_('Apple Quality. Assessed in Seconds.'), { size: .085, y: -1.32, weight: 'SemiBold' });
function S4(t) {
  const k = P(t, 12.0, 13.3, E.expoOut), dive = P(t, 13.3, 13.65, E.expoIn);
  const ang = lerp(1.3, .18, k), d = lerp(9, 8.2, k) * (1 - dive * .92);
  look(c4, [Math.sin(ang) * d, lerp(1.4, .5, k) * (1 - dive), Math.cos(ang) * d], [0, lerp(.35, .1, k) * (1 - dive), 0]);
  logo4.position.y = .35 * (1 - dive);
  logo4.rotation.y = lerp(-.8, 0, k) + Math.sin(t * .9) * .05 * (1 - dive);
  const u = logo4.userData;
  u.lens.position.z = lerp(appleRadiusAt(.02) - .7, appleRadiusAt(.02) - .12, P(t, 12.15, 12.7, E.backOut));
  u.band.scale.set(1, Math.max(.001, P(t, 12.05, 12.5, E.expoOut)), 1);
  u.hl.visible = t > 12.55;
  shock.position.y = .35; shock.scale.setScalar(lerp(.3, 9, P(t, 12.0, 13.0, E.expoOut))); shock.material.opacity = 1; shock.visible = t < 13.0;
  hudShow(h4a, t, 12.35, 13.3, { stagger: .04 }); hudShow(h4b, t, 12.7, 13.3, { stagger: .012 });
  s4.userData.bd.tick(t);
  return { scene: s4, cam: c4, dof: { focus: d, aperture: .0004, maxblur: .006 }, bloom: lerp(2.0, .45, P(t, 12.0, 12.5, E.out)), threshold: .9,
    white: 1 - P(t, 12.0, 12.45, E.out), zoom: dive * .5, black: P(t, 13.5, 13.65) * .8 };
}

// ==========================================================================================
// S5  13.65–17.4  The phone: "Enter your lot." then "Snap one photo per crate."
// ==========================================================================================
const s5 = scene({ glow: 0x40070b, glowPos: [.3, .2], seed: 10 }), c5 = cam();
const phone = makePhone([T.lot, T.photos]); s5.add(phone);
const l5 = rig(s5, { keyI: 130, key: [-3, 4, 5] });
const flash5 = new THREE.PointLight(0xffffff, 0, 0, 2); flash5.position.set(0, 0, 3); s5.add(flash5);
const card = (top, big) => glassCard(1.25, .5, (g, w, h) => { ink(g, '600 46px "JetBrains Mono"', 'rgba(255,255,255,.65)'); g.fillText(top, 46, h * .3); ink(g, '700 92px Inter'); g.fillText(big, 46, h * .66); }, { rough: .22 });
const cards5 = [card('LOT NUMBER', 'LOT-2410'), card('CRATES SAMPLED', '2 crates'), card('AVG WEIGHT', '20 kg / crate')];
cards5.forEach(c => s5.add(c));
const photoSlab = (t) => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(1.1, .86, .02, 4, .03), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .4, clearcoat: .5 })); g.add(b);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .7), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); p.position.set(0, .03, .012); g.add(p); return g; };
const ph1 = photoSlab(T.tray1), ph2 = photoSlab(T.tray2); s5.add(ph1, ph2);
const h5a = hud(W_('Enter'), { size: .26, y: 1.32 }), h5b = hud(W_('your lot.'), { size: .26, y: 1.0 });
const h5c = hud(W_('Snap one photo'), { size: .22, y: 1.32 }), h5d = hud(R_('per crate.'), { size: .22, y: 1.02 });
const step5a = label(1.2, .12, (g, w, h) => { ink(g, '700 44px "JetBrains Mono"', '#ff4d4d'); g.fillText('01 — LOT', 4, h / 2); });
const step5b = label(1.2, .12, (g, w, h) => { ink(g, '700 44px "JetBrains Mono"', '#ff4d4d'); g.fillText('02 — CAPTURE', 4, h / 2); });
[step5a, step5b].forEach(s => s.position.set(-.18, 1.4, HUD_Z));
function S5(t) {
  const arrive = P(t, 13.65, 14.6, E.expoOut), mid = P(t, 14.9, 15.6, E.expoInOut), dive = P(t, 16.95, 17.4, E.expoIn);
  phone.position.set(0, lerp(-3.5, -.42, arrive) + dive * .1, 0);
  phone.rotation.set(lerp(-.9, -.12, arrive) * (1 - dive), lerp(.9, -.38, arrive) + mid * .78 - dive * .4 + Math.sin(t * .7) * .04, lerp(.2, .04, arrive) * (1 - dive));
  const d = lerp(6.6, 6.0, P(t, 13.65, 17)) * (1 - dive * .72);
  look(c5, [lerp(.6, -.4, P(t, 13.65, 17.4, E.sine)) * (1 - dive), .1 - dive * .45, d], [0, -.05 - dive * .4, 0]);
  cards5.forEach((c, i) => {
    const k = P(t, 13.95 + i * .2, 14.55 + i * .2, E.backOut), o = P(t, 14.85 + i * .05, 15.25 + i * .05, E.expoIn);
    c.position.set(lerp(0, (i % 2 ? .14 : -.14), k) - o * 3, -.45 - i * .32, lerp(-.5, 1.5 + i * .2, k)); c.rotation.set(0, lerp(1, (i % 2 ? -.25 : .25), k), 0); c.scale.setScalar(Math.max(.001, k) * .62);
    c.visible = k > 0 && o < 1;
  });
  const sc = phone.userData.screens; sc[1].material.opacity = P(t, 15.33, 15.45);
  // photos fly from the camera into the phone
  [[ph1, 15.35], [ph2, 16.1]].forEach(([p, t0], i) => {
    const k = P(t, t0, t0 + .75, E.expoOut), o = P(t, 16.6, 16.95, E.expoIn);
    p.position.set(lerp(-1.6 + i * .3, -.78, k) + o * .9, lerp(-2.2 + i * 1.5, -.2 - i * .95, k), lerp(5, 1.0 + i * .15, k) - o * 1.2);
    p.rotation.set(lerp(-.8, -.05, k), lerp(-1.2, .35, k), lerp(.6 - i, (i ? .08 : -.1), k)); p.scale.setScalar(Math.max(.001, 1 - o)); p.visible = t > t0;
  });
  const fl = Math.max(1 - P(t, 15.38, 15.75), (t > 16.1 ? 1 - P(t, 16.1, 16.45) : 0) * .7) * (t > 15.38 ? 1 : 0);
  flash5.intensity = fl * 90;
  hudShow(h5a, t, 13.7, 14.85); hudShow(h5b, t, 13.82, 14.85); hudShow(h5c, t, 15.25, 16.9); hudShow(h5d, t, 15.4, 16.9);
  step5a.visible = t > 13.7 && t < 14.95; step5b.visible = t > 15.25 && t < 16.95;
  s5.userData.bd.tick(t);
  return { scene: s5, cam: c5, dof: { focus: d, aperture: .0005, maxblur: .009 }, bloom: .5, white: fl * .18, zoom: dive * .55 + (1 - P(t, 13.65, 14.0, E.out)) * .3 };
}

// ==========================================================================================
// S6  17.4–23.45  AI grading: a floating display, laser sweep, 3D detection volumes, A / B.
// ==========================================================================================
const s6 = scene({ glow: 0x2a0508, glowPos: [0, 0], seed: 12, dust: 200 }), c6 = cam();
const IMG_W = 3.4, IMG_H = IMG_W * 1813 / 1080;
const display = new THREE.Group(); s6.add(display);
const shot6 = new THREE.Mesh(new THREE.PlaneGeometry(IMG_W, IMG_H), new THREE.MeshBasicMaterial({ map: T.scan, toneMapped: false, color: 0xbbbbbb }));
display.add(shot6);
const frame6 = new THREE.Mesh(new RoundedBoxGeometry(IMG_W + .12, IMG_H + .12, .08, 6, .08), mats.glass(0xffffff, .15)); frame6.position.z = -.06; display.add(frame6);
const laser = new THREE.Mesh(new THREE.BoxGeometry(IMG_W + .5, .018, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .35, .35).multiplyScalar(6) })); display.add(laser);
const trail = new THREE.Mesh(new THREE.PlaneGeometry(IMG_W, .9), new THREE.MeshBasicMaterial({ map: canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,60,60,0)'); gr.addColorStop(1, 'rgba(255,60,60,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
display.add(trail);
const applesPct = [[41.6, 66.0, 86.6, 77.8, 'A', .97], [10.0, 61.8, 49.5, 76.4, 'B', .91], [39.0, 55.6, 72.0, 67.4, 'A', .95], [68.8, 61.4, 98.6, 73.8, 'A', .94], [0.0, 68.0, 13.0, 76.5, 'A', .92], [86.5, 67.6, 100, 76.0, 'B', .87]];
const boxes6 = applesPct.map(([x1, y1, x2, y2, g, c], i) => {
  const w = (x2 - x1) / 100 * IMG_W, h = (y2 - y1) / 100 * IMG_H, d = .35;
  const grp = new THREE.Group(); grp.position.set(((x1 + x2) / 200 - .5) * IMG_W, (.5 - (y1 + y2) / 200) * IMG_H, d / 2 + .01);
  const col = g === 'A' ? new THREE.Color(0x22c55e) : new THREE.Color(0xef4444);
  const em = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(2.5), toneMapped: false });
  const T_ = .014, edges = [];
  for (const [sx, sy, sz, px, py, pz] of [[w, T_, T_, 0, h / 2, d / 2], [w, T_, T_, 0, -h / 2, d / 2], [T_, h, T_, w / 2, 0, d / 2], [T_, h, T_, -w / 2, 0, d / 2],
    [w, T_, T_, 0, h / 2, -d / 2], [w, T_, T_, 0, -h / 2, -d / 2], [T_, h, T_, w / 2, 0, -d / 2], [T_, h, T_, -w / 2, 0, -d / 2],
    [T_, T_, d, w / 2, h / 2, 0], [T_, T_, d, -w / 2, h / 2, 0], [T_, T_, d, w / 2, -h / 2, 0], [T_, T_, d, -w / 2, -h / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), em); m.position.set(px, py, pz); grp.add(m); edges.push(m);
  }
  const fill = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); grp.add(fill);
  const tag = glassCard(.62, .17, (g2, W2, H2) => { g2.fillStyle = g === 'A' ? '#16a34a' : '#dc2626'; roundRect(g2, 0, 0, W2, H2, 30); g2.fill(); ink(g2, '700 64px "JetBrains Mono"', '#fff', 'center'); g2.fillText(`${g} · ${c.toFixed(2)}`, W2 / 2, H2 / 2 + 3); }, { depth: .03, r: .04, scale: 420 });
  tag.position.set(-w / 2 + .31, h / 2 + .14, d / 2); grp.add(tag);
  display.add(grp);
  return { grp, em, fill, tag, col, i };
});
const bigA = text3d([['A', new THREE.MeshPhysicalMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: .8, roughness: .12, clearcoat: 1, transmission: .35, thickness: .8 })]], { size: 1.25, depth: .4, bevel: .04 });
const bigB = text3d([['B', new THREE.MeshPhysicalMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: .8, roughness: .12, clearcoat: 1, transmission: .35, thickness: .8 })]], { size: 1.25, depth: .4, bevel: .04 });
s6.add(bigA, bigB);
rig(s6, { keyI: 140, key: [-3, 4, 6] });
const h6a = hud(W_('The AI gets'), { size: .24, y: 1.32 }), h6b = hud(W_('to work.'), { size: .24, y: 1.02 });
const step6 = label(1.2, .12, (g, w, h) => { ink(g, '700 44px "JetBrains Mono"', '#ff4d4d'); g.fillText('03 — AI GRADING', 4, h / 2); }); step6.position.set(-.18, 1.4, HUD_Z);
let lastDet = -1;
const det6 = label(1.5, .22, (g) => {});
function detPaint(n) { const c = det6.material.map.image, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  ink(g, '500 40px "JetBrains Mono"', 'rgba(255,255,255,.75)'); g.fillText('ANALYZING TRAY 01', 6, 34); g.fillText(`APPLES DETECTED  ${n}`, 6, 96); det6.material.map.needsUpdate = true; }
det6.position.set(-.06, -1.32, HUD_Z);
function S6(t) {
  const arrive = P(t, 17.4, 18.6, E.expoOut), out = P(t, 23.0, 23.45, E.expoIn);
  display.position.set(0, .55, 0);
  display.rotation.set(lerp(.35, .06, arrive) + Math.sin(t * .5) * .02, lerp(-.5, -.16, arrive) + P(t, 18.6, 23, E.sine) * .3, 0);
  const d = lerp(5.0, 9.2, arrive) - out * 3;
  look(c6, [lerp(.4, -.2, P(t, 17.4, 23)), lerp(-.5, -.3, arrive), d], [0, -.3, 0]);
  const ly = t < 19.0 ? lerp(IMG_H * .1, -IMG_H * .4, P(t, 17.6, 19.0, E.inOut)) : lerp(-IMG_H * .4, -IMG_H * .05, P(t, 19.0, 19.9, E.inOut));
  laser.position.set(0, ly, .06); trail.position.set(0, ly + (t < 19 ? .45 : -.45), .05); trail.rotation.z = t < 19 ? 0 : Math.PI;
  laser.visible = trail.visible = t > 17.6 && t < 20.0;
  boxes6.forEach(b => {
    const k = P(t, 19.3 + b.i * .14, 19.65 + b.i * .14, E.backOut), g = P(t, 21.15 + b.i * .1, 21.45 + b.i * .1);
    b.grp.scale.setScalar(Math.max(.001, lerp(1.6, 1, k))); b.grp.visible = k > 0;
    b.em.color.copy(new THREE.Color(1, 1, 1).lerp(b.col, g)).multiplyScalar(2.6);
    b.fill.material.opacity = g * .12;
    b.tag.scale.setScalar(Math.max(.001, g)); b.tag.position.z = .175 + g * .15;
  });
  const n = Math.round(P(t, 19.3, 20.2, E.lin) * applesPct.length);
  if (n !== lastDet) { detPaint(n); lastDet = n; }
  det6.visible = t > 17.8 && t < 23.0;
  [[bigA, 21.9, -1], [bigB, 22.5, 1]].forEach(([g, t0, s]) => {
    const k = P(t, t0, t0 + .55, E.expoOut), o = P(t, 23.0, 23.4, E.expoIn);
    g.position.set(s * lerp(3.5, .5, k) + s * o * 2, -.55, lerp(1.2, 2.6, k) + o * 3); g.rotation.set(0, s * lerp(-1.6, -.25, k), 0); g.visible = t > t0;
  });
  hudShow(h6a, t, 17.45, 20.85); hudShow(h6b, t, 17.6, 20.85); step6.visible = t > 17.45 && t < 20.9;
  s6.userData.bd.tick(t);
  return { scene: s6, cam: c6, dof: { focus: d, aperture: .0004, maxblur: .007 }, bloom: .8, threshold: .7, zoom: (1 - P(t, 17.4, 17.8, E.out)) * .5 + out * .5 };
}

// ==========================================================================================
// S7  23.45–29.15  Results: glass donut + counters, glass bar columns, the PDF report.
// ==========================================================================================
const s7 = scene({ glow: 0x330609, glowPos: [.2, .3], seed: 14 }), c7 = cam();
const donut = new THREE.Group(); s7.add(donut);
const base7 = new THREE.Mesh(new THREE.TorusGeometry(1.25, .2, 48, 220), mats.glass(0xffffff, .08)); donut.add(base7);
const gMat = new THREE.MeshPhysicalMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: .9, roughness: .15, clearcoat: 1, transmission: .4, thickness: .5 });
const rMat = new THREE.MeshPhysicalMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: .9, roughness: .15, clearcoat: 1, transmission: .4, thickness: .5 });
let arcA = new THREE.Mesh(new THREE.TorusGeometry(1.25, .21, 32, 220, .01), gMat), arcB = new THREE.Mesh(new THREE.TorusGeometry(1.25, .21, 32, 220, .01), rMat);
donut.add(arcA, arcB);
const numCache = {};
const numMesh = n => numCache[n] ??= (() => { const g = text3d(W_(String(n)), { size: .62, depth: .18, bevel: .015 }); g.visible = false; donut.add(g); return g; })();
for (let n = 0; n <= 128; n++) numMesh(n);
const sub7 = glassCard(1.1, .2, (g, w, h) => { ink(g, '600 50px "JetBrains Mono"', 'rgba(255,255,255,.7)', 'center'); g.fillText('APPLES GRADED', w / 2, h / 2); }, { depth: .01, rough: .5, scale: 500 });
sub7.userData.slab.visible = false; sub7.position.set(0, -.52, .1); donut.add(sub7);
const stat = (lbl, col) => glassCard(1.15, .62, null, { rough: .25 });
const statA = glassCard(1.2, .62, null, { rough: .25 }), statB = glassCard(1.2, .62, null, { rough: .25 });
const statTex = [statA, statB].map((c, i) => { const t = canvasTex(620, 320, () => {}); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .62), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false })); f.position.z = .035; c.add(f); s7.add(c); return t; });
let lastStat = '';
function paintStats(a, pa, b, pb) {
  const key = `${a}|${b}`; if (key === lastStat) return; lastStat = key;
  [[statTex[0], '● A GRADE', '#22c55e', a, pa], [statTex[1], '● B GRADE', '#ef4444', b, pb]].forEach(([t, l, c, n, p]) => {
    const g = t.image.getContext('2d'); g.clearRect(0, 0, 620, 320); ink(g, '700 34px "JetBrains Mono"', c); g.fillText(l, 40, 64);
    ink(g, '800 130px Montserrat'); g.fillText(String(n), 36, 190); const w = g.measureText(String(n)).width; ink(g, '700 50px Montserrat', 'rgba(255,255,255,.6)'); g.fillText(p, 50 + w, 205); t.needsUpdate = true; });
}
// weights: glass columns on a glossy floor
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: .18, metalness: .4, clearcoat: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.2; s7.add(floor);
const bars = [[40, 0xffffff, 'TOTAL', '40.0 kg'], [34.8, 0x22c55e, 'EST. A', '34.8 kg'], [5.2, 0xef4444, 'EST. B', '5.2 kg']].map(([v, c, l, txt], i) => {
  const g = new THREE.Group(); g.position.set((i - 1) * .78, -2.2, 0); s7.add(g);
  const m = mats.glass(c, c === 0xffffff ? .35 : .1); m.attenuationColor = new THREE.Color(c); m.attenuationDistance = 1.2; m.emissive = new THREE.Color(c); m.emissiveIntensity = c === 0xffffff ? .18 : .25;
  const col = new THREE.Mesh(new RoundedBoxGeometry(.62, 1, .62, 6, .08), m); col.position.y = .5; g.add(col);
  const cap = glassCard(.9, .42, (g2, w, h) => { ink(g2, '700 40px "JetBrains Mono"', 'rgba(255,255,255,.7)', 'center'); g2.fillText(l, w / 2, h * .3); ink(g2, '800 92px Montserrat', '#fff', 'center'); g2.fillText(txt, w / 2, h * .7); }, { depth: .02, rough: .4, scale: 500 });
  cap.userData.slab.visible = false; g.add(cap);
  return { g, col, cap, v };
});
// the report: a sheet of paper with the branded layout
const reportTex = canvasTex(1240, 1754, (g, w, h) => {
  g.fillStyle = '#f7f4ef'; g.fillRect(0, 0, w, h);
  g.drawImage(logoImg, 80, 70, 420, 140); ink(g, '700 34px "JetBrains Mono"', '#999', 'right'); g.fillText('QUALITY CHECK REPORT', w - 80, 140);
  g.fillStyle = RED_HEX; g.fillRect(80, 240, w - 160, 8);
  ink(g, '800 84px Montserrat', '#111'); g.fillText('Lot LOT-2410', 80, 350); ink(g, '500 40px Inter', '#777'); g.fillText('Demo Grower · Orchard Block 7 · 2 crates · 20 kg / crate', 80, 420);
  const rows = [['Total apples', '128'], ['A Grade', '111 · 86.7%'], ['B Grade', '17 · 13.3%'], ['Est. A weight', '34.8 kg'], ['Est. B weight', '5.2 kg']];
  rows.forEach(([a, b], i) => { const y = 540 + i * 110; ink(g, '600 48px Inter', i === 1 ? '#15803d' : i === 2 ? '#b91c1c' : '#222'); g.fillText(a, 80, y); ink(g, '700 48px Inter', '#111', 'right'); g.fillText(b, w - 80, y); g.fillStyle = '#e4dfd7'; g.fillRect(80, y + 50, w - 160, 3); });
  [[.92, '#22c55e'], [.14, '#ef4444'], [.8, '#22c55e'], [.22, '#ef4444'], [1, RED_HEX]].forEach(([v, c], i) => { g.fillStyle = c; roundRect(g, 80 + i * 220, 1640 - v * 420, 180, v * 420, 18); g.fill(); });
});
const sheet = (o = 1) => { const m = new THREE.Mesh(new RoundedBoxGeometry(1.65, 2.33, .015, 3, .03), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: .6 })).concat([new THREE.MeshBasicMaterial({ map: reportTex, toneMapped: false }), new THREE.MeshStandardMaterial({ color: 0xf2efe9 })]));
  return m; };
const report = sheet(), copy1 = sheet(), copy2 = sheet(); s7.add(report, copy1, copy2);
const pill = (txt, red) => glassCard(1.0, .3, (g, w, h) => { ink(g, '700 70px Inter', '#fff', 'center'); g.fillText(txt, w / 2, h / 2 + 4); }, { tint: red ? 0xff4040 : 0xffffff, rough: .2, r: .15, depth: .08, scale: 480 });
const pills = [pill('Download PDF'), pill('Share', true)]; pills.forEach(p => s7.add(p));
rig(s7, { keyI: 130, key: [-3, 5, 6] });
const h7a = hud(W_('Clear counts.'), { size: .24, y: 1.32 });
const h7b = hud(W_('Estimated'), { size: .24, y: 1.32 }), h7c = hud(W_('weights.'), { size: .24, y: 1.02 });
const h7d = hud(W_('Branded report,'), { size: .2, y: 1.32 }), h7e = hud(R_('ready to share.'), { size: .2, y: 1.04 });
const step7 = ['04 — RESULTS', '04 — RESULTS', '05 — REPORT'].map(s => { const l = label(1.2, .12, (g, w, h) => { ink(g, '700 44px "JetBrains Mono"', '#ff4d4d'); g.fillText(s, 4, h / 2); }); l.position.set(-.18, 1.4, HUD_Z); return l; });
const note7 = label(1.2, .08, (g, w, h) => { ink(g, '500 34px "JetBrains Mono"', 'rgba(255,255,255,.45)', 'center'); g.fillText('SAMPLE RESULTS SHOWN', w / 2, h / 2); }); note7.position.set(0, -1.52, HUD_Z);
let lastA = -1, lastB = -1;
function S7(t) {
  const u = t - 23.45;
  look(c7, [Math.sin(.25 - u * .03) * 8.5, lerp(.6, .9, P(t, 23.45, 29)), Math.cos(.25 - u * .03) * 8.5], [0, -.55, 0]);
  // donut
  const dk = P(t, 23.5, 24.3, E.expoOut), dOut = P(t, 24.7, 25.1, E.expoIn);
  donut.visible = t < 25.15; donut.position.set(0, -.3 + dOut * 4, 0); donut.rotation.set(lerp(-1.2, -.18, dk), lerp(-2, .35, dk) + u * .05, 0); donut.scale.setScalar(Math.max(.001, dk) * .6);
  const fa = P(t, 23.7, 24.9, E.out) * .867 * Math.PI * 2, fb = P(t, 24.1, 25.0, E.out) * .133 * Math.PI * 2;
  if (Math.abs(fa - lastA) > .002) { arcA.geometry.dispose(); arcA.geometry = new THREE.TorusGeometry(1.25, .21, 32, 220, Math.max(.01, fa)); lastA = fa; }
  if (Math.abs(fb - lastB) > .002) { arcB.geometry.dispose(); arcB.geometry = new THREE.TorusGeometry(1.25, .21, 32, 220, Math.max(.01, fb)); lastB = fb; }
  arcA.rotation.z = Math.PI / 2; arcB.rotation.z = Math.PI / 2 - .867 * Math.PI * 2;
  const n = Math.round(P(t, 23.7, 24.9, E.out) * 128);
  for (const k in numCache) numCache[k].visible = Number(k) === n && donut.visible;
  numCache[n].position.set(0, .1, .1);
  [statA, statB].forEach((c, i) => { const k = P(t, 23.9 + i * .1, 24.5 + i * .1, E.expoOut); c.position.set((i ? .5 : -.5), lerp(-3.2, -1.62, k) + dOut * 4, 1.0); c.rotation.set(-.15, (i ? -.25 : .25), 0); c.scale.setScalar(Math.max(.001, k) * .78); c.visible = t < 25.15; });
  const pk = P(t, 24.0, 25.1, E.out); paintStats(Math.round(pk * 111), (pk * 86.7).toFixed(1) + '%', Math.round(pk * 17), (pk * 13.3).toFixed(1) + '%');
  // bars
  bars.forEach((b, i) => { const k = P(t, 25.0 + i * .14, 25.9 + i * .14, E.expoOut), o = P(t, 26.35, 26.7, E.expoIn);
    const hgt = Math.max(.01, k * b.v / 40 * 2.3 * (1 - o)); b.col.scale.y = hgt; b.col.position.y = hgt / 2; b.g.visible = t > 24.95 && t < 26.75;
    b.cap.position.set(0, hgt + .3, .35); b.cap.scale.setScalar(Math.max(.001, P(t, 25.4 + i * .14, 25.8 + i * .14, E.backOut) * (1 - o)) * .82); b.g.rotation.y = .25; });
  floor.visible = t > 24.95 && t < 26.75;
  // report
  const rk = P(t, 26.6, 27.6, E.expoOut);
  report.visible = t > 26.55; report.position.set(.05, lerp(-4, -.7, rk), lerp(-2, 1.0, rk)); report.rotation.set(lerp(-1.2, -.08, rk), lerp(2.6, -.22, rk) + P(t, 27.6, 29.1, E.sine) * .3, lerp(.4, .02, rk));
  pills.forEach((p, i) => { const k = P(t, 27.5 + i * .2, 27.95 + i * .2, E.backOut); p.position.set(i ? .55 : -.45, -1.78, 1.6); p.rotation.set(-.1, .1 - i * .2, 0); p.scale.setScalar(Math.max(.001, k) * (i && t > 28.15 && t < 28.45 ? 1.1 : 1)); p.visible = t > 27.5; });
  [[copy1, 1], [copy2, -1]].forEach(([c, s]) => { const k = P(t, 28.25, 28.9, E.expoOut); c.visible = t > 28.25 && t < 29.1; c.position.set(report.position.x + s * k * 1.7, report.position.y + k * 1.4, report.position.z - k * 1.5); c.rotation.set(report.rotation.x, report.rotation.y + s * k * .8, s * k * .5); c.scale.setScalar(Math.max(.001, 1 - k * .45)); });
  hudShow(h7a, t, 23.5, 24.7); hudShow(h7b, t, 24.95, 26.35); hudShow(h7c, t, 25.08, 26.35); hudShow(h7d, t, 26.65, 28.8); hudShow(h7e, t, 26.8, 28.8);
  step7[0].visible = t > 23.5 && t < 24.75; step7[1].visible = t > 24.95 && t < 26.4; step7[2].visible = t > 26.6 && t < 28.85;
  note7.visible = t > 23.8 && t < 28.9;
  s7.userData.bd.tick(t);
  const zf = (1 - P(t, 23.45, 23.85, E.out)) * .45 + P(t, 28.8, 29.15, E.expoIn) * .5;
  return { scene: s7, cam: c7, dof: { focus: 8.0, aperture: .00035, maxblur: .006 }, bloom: .65, zoom: zf };
}

// ==========================================================================================
// S8  29.15–33.05  "Nothing lingers on a server. Your data stays in your hands."
// ==========================================================================================
const s8 = scene({ glow: 0x2a0508, glowPos: [0, 0], seed: 16 }), c8 = cam();
const server = new THREE.Group(); s8.add(server);
const metal = new THREE.MeshPhysicalMaterial({ color: 0x2a2b30, metalness: .9, roughness: .3, clearcoat: .6 });
const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 1, .45).multiplyScalar(3), toneMapped: false });
for (let i = 0; i < 6; i++) { const u = new THREE.Mesh(new RoundedBoxGeometry(1.6, .36, 1.2, 4, .04), metal); u.position.y = i * .4 - 1; server.add(u);
  for (let j = 0; j < 3; j++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.025, 12, 8), ledMat); l.position.set(-.6 + j * .09, i * .4 - 1, .61); server.add(l); }
  const vent = new THREE.Mesh(new THREE.BoxGeometry(.8, .12, .01), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: .8 })); vent.position.set(.25, i * .4 - 1, .605); server.add(vent); }
const shards = new THREE.InstancedMesh(new RoundedBoxGeometry(.19, .19, .19, 2, .03), metal, 8 * 12 * 6);
s8.add(shards);
const shardData = []; { const r = rng(21); for (let x = 0; x < 8; x++) for (let y = 0; y < 12; y++) for (let z = 0; z < 6; z++) shardData.push({ p: new THREE.Vector3(-.7 + x * .2, -1.15 + y * .2, -.5 + z * .2), v: new THREE.Vector3((r() - .5) * 6, (r() - .2) * 5, (r() - .2) * 6), rot: new THREE.Vector3(r() * 8, r() * 8, r() * 8), d: r() * .25 }); }
const shieldShape = new THREE.Shape(); shieldShape.moveTo(0, 1.1); shieldShape.bezierCurveTo(.45, .95, .75, .9, .85, .85); shieldShape.lineTo(.85, .1); shieldShape.bezierCurveTo(.85, -.55, .4, -.95, 0, -1.15); shieldShape.bezierCurveTo(-.4, -.95, -.85, -.55, -.85, .1); shieldShape.lineTo(-.85, .85); shieldShape.bezierCurveTo(-.75, .9, -.45, .95, 0, 1.1);
const shieldMat = mats.glass(0xff5a5a, .08); shieldMat.attenuationColor = new THREE.Color(0xc0101a); shieldMat.attenuationDistance = .5; shieldMat.thickness = 1.2;
const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: .3, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 6, curveSegments: 32 }), shieldMat);
shield.geometry.center(); s8.add(shield);
const lock = new THREE.Group(); shield.add(lock);
const lockBody = new THREE.Mesh(new RoundedBoxGeometry(.5, .4, .16, 4, .06), new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: .3, clearcoat: 1 })); lockBody.position.set(0, -.15, .05); lock.add(lockBody);
const shackle = new THREE.Mesh(new THREE.TorusGeometry(.2, .055, 16, 48, Math.PI), mats.chrome()); shackle.position.set(0, .1, .05); lock.add(shackle);
const shieldLight = new THREE.PointLight(0xff3030, 0, 6, 2); s8.add(shieldLight);
const chip8 = ['No permanent storage', 'One trusted device', 'Admin-approved access'].map(s => { const c = glassCard(1.75, .36, (g, w, h) => { ink(g, '600 74px Inter', '#fff', 'center'); g.fillText(s, w / 2, h / 2 + 3); }, { rough: .28, scale: 500 }); s8.add(c); return c; });
rig(s8, { keyI: 140, key: [-3, 5, 6], rimI: 200 });
const h8a = hud(W_('Nothing lingers'), { size: .22, y: 1.32 }), h8b = hud(W_('on a server.'), { size: .22, y: 1.02 });
const h8c = hud(W_('Your data stays'), { size: .22, y: 1.32 }), h8d = hud(R_('in your hands.'), { size: .22, y: 1.02 });
function S8(t) {
  const u = t - 29.15;
  look(c8, [Math.sin(u * .08 - .15) * 9, .4, Math.cos(u * .08 - .15) * 9], [0, -.55, 0]);
  const build = P(t, 29.2, 29.7, E.expoOut), blast = clamp((t - 29.95) / 1.1);
  server.visible = t < 29.95; server.position.y = -.55; server.rotation.y = .5 + u * .2; server.scale.setScalar(Math.max(.001, build));
  shards.visible = t >= 29.95 && t < 31.3;
  if (shards.visible) { const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    shardData.forEach((s, i) => { const k = clamp(blast - s.d) / (1 - s.d), e = k * k;
      const p = s.p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), server.rotation.y).add(new THREE.Vector3(0, -.55, 0)).addScaledVector(s.v, e * 1.6 + k * .4);
      p.y -= e * 2.0; q.setFromEuler(new THREE.Euler(s.rot.x * k, s.rot.y * k, s.rot.z * k)); m.compose(p, q, new THREE.Vector3().setScalar(Math.max(.001, 1 - k * .9))); shards.setMatrixAt(i, m); });
    shards.instanceMatrix.needsUpdate = true; }
  const sk = P(t, 31.3, 32.1, E.backOut), sOut = P(t, 32.55, 33.05, E.expoIn);
  shield.visible = t > 31.25; shield.position.set(0, lerp(-3, -.45, sk), sOut * 5); shield.rotation.set(0, lerp(-2.4, 0, P(t, 31.3, 32.2, E.expoOut)) + Math.sin(t * 1.5) * .12, 0); shield.scale.setScalar(Math.max(.001, sk) * 1.15);
  shieldLight.position.set(0, -.4, 1.5); shieldLight.intensity = 6 * P(t, 31.5, 32.2);
  chip8.forEach((c, i) => { const k = P(t, 31.6 + i * .2, 32.1 + i * .2, E.backOut), a = t * .5 + i * 2.1;
    c.position.set(Math.cos(a) * 1.55, -1.25 + i * .5 - .5, Math.sin(a) * 1.0 + .6); c.rotation.set(0, -a * .2, 0); c.scale.setScalar(Math.max(.001, k) * .78); c.visible = t > 31.6; });
  hudShow(h8a, t, 29.2, 30.95); hudShow(h8b, t, 29.38, 30.95); hudShow(h8c, t, 31.25, 32.55); hudShow(h8d, t, 31.42, 32.55);
  s8.userData.bd.tick(t);
  return { scene: s8, cam: c8, dof: { focus: 9, aperture: .00035, maxblur: .006 }, bloom: .75, threshold: .7, zoom: (1 - P(t, 29.15, 29.5, E.out)) * .4 + sOut * .6, white: sOut * .9 };
}

// ==========================================================================================
// S9  33.05–41.2  Finale: the mark against the orchard, tagline, call to action.
// ==========================================================================================
const s9 = new THREE.Scene(); s9.environment = env; s9.background = new THREE.Color(0x050405); const c9 = cam();
const orchard = new THREE.Mesh(new THREE.PlaneGeometry(40, 40 * 940 / 1672), new THREE.MeshBasicMaterial({ map: T.hero, toneMapped: false, color: 0x8a8a8a }));
orchard.position.set(-4, 1, -26); s9.add(orchard);
const logo9 = makeLogo(); s9.add(logo9);
rig(s9, { keyI: 160, key: [-3, 5, 6], rim: [3, 3, -4], rimC: 0xffc080, rimI: 220 });
const h9a = hud([['Malus ', mats.white()], ['Lens', mats.red()]], { size: .3, y: -.3 });
const h9b = hud(W_('Apple quality.'), { size: .18, y: -.64 }), h9c = hud(R_('Assessed in seconds.'), { size: .18, y: -.88 });
const cta = glassCard(1.0, .3, (g, w, h) => { ink(g, '700 74px Inter', '#fff', 'center'); g.fillText('Book a demo', w / 2, h / 2 + 4); }, { tint: 0xff3a3a, rough: .18, r: .15, depth: .08, scale: 480 });
cta.position.set(0, -1.2, HUD_Z);
cta.userData.slab.material = new THREE.MeshPhysicalMaterial({ color: RED, emissive: 0x5a0508, roughness: .2, clearcoat: 1, clearcoatRoughness: .05 }); hudScene.add(cta); huds.push(cta); cta.visible = false;
const by9 = label(1.6, .16, (g, w, h) => { ink(g, '600 40px "JetBrains Mono"', 'rgba(255,255,255,.8)', 'center'); g.fillText('MALUS LENS · BY CNEL INDIA', w / 2, h * .3); ink(g, '500 36px "JetBrains Mono"', 'rgba(255,255,255,.55)', 'center'); g.fillText('cnelindia.com · hello@cnelindia.com', w / 2, h * .78); });
by9.position.set(0, -1.45, HUD_Z);
function S9(t) {
  const u = t - 33.05, k = P(t, 33.05, 34.4, E.expoOut);
  look(c9, [Math.sin(lerp(-.9, .12, k) - u * .015) * lerp(6, 8.6, k), lerp(-.4, .35, k), Math.cos(lerp(-.9, .12, k) - u * .015) * lerp(6, 8.6, k)], [0, .55, 0]);
  logo9.position.y = 1.3; logo9.rotation.y = lerp(1.2, 0, k) + Math.sin(u * .6) * .12; logo9.scale.setScalar(.72);
  orchard.position.x = -4 + u * .12;
  hudShow(h9a, t, 33.3, 99, { stagger: .04 }); hudShow(h9b, t, 35.0, 99); hudShow(h9c, t, 36.35, 99, { stagger: .025 });
  const ck = P(t, 37.4, 38.0, E.backOut); cta.visible = t > 37.4; cta.scale.setScalar(Math.max(.001, ck) * (1 + Math.max(0, Math.sin((t - 38.2) * 6)) * .04 * (t > 38.2 && t < 39.8 ? 1 : 0))); cta.rotation.set(0, (1 - ck) * 1.2 + Math.sin(t) * .06, 0);
  by9.visible = t > 37.7; by9.material.opacity = P(t, 37.7, 38.2);
  return { scene: s9, cam: c9, dof: { focus: c9.position.distanceTo(logo9.position), aperture: .0012, maxblur: .02 }, bloom: .55, black: P(t, 40.2, 41.2, E.in), white: (1 - P(t, 33.05, 33.5, E.out)) * .8, zoom: (1 - P(t, 33.05, 33.5, E.out)) * .4 };
}

// ---- timeline ---------------------------------------------------------------------------
const SHOTS = [[0, S1], [2.95, S2], [9.05, S3], [11.98, S4], [13.65, S5], [17.4, S6], [23.45, S7], [29.15, S8], [33.05, S9]];
window.__duration = TOTAL;
window.__seek = (t, frame = 0) => {
  huds.forEach(h => h.visible = false);
  let fn = SHOTS[0][1]; for (const [t0, f] of SHOTS) if (t >= t0) fn = f;
  const fx = fn(t);
  fx.seed = (frame % 97) * 1.37;
  draw(fx.scene, fx.cam, fx);
  const gl = document.querySelector('canvas').getContext('webgl2'); gl.finish();
};
window.__ready = true;
