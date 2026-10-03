// Shared 3D engine for the Malus Lens reel: renderer, cinematic post chain,
// studio environment, and the reusable hero assets (apple, logo, phone, glass,
// 3D type). Everything is a pure function of time so frames render deterministically.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export { THREE, RoundedBoxGeometry };
export const W = 1080, H = 1920;
export const RED = 0xd3202a;

// ---- easing / timing ----------------------------------------------------------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  lin: t => t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  expoOut: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoIn: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  expoInOut: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  backOut: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
// progress of t through [a,b], eased
export const P = (t, a, b, ease = E.inOut) => ease(clamp((t - a) / (b - a)));
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---- renderer + post ------------------------------------------------------------
export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const Q = new URLSearchParams(location.search);
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: Number(Q.get('msaa') ?? 2) });
export const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
export const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 10, aperture: 0.0005, maxblur: 0.008 });
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.55, 0.82);
const output = new OutputPass();
// Lens: zoom blur for whip transitions, chromatic aberration, vignette, grain, fades.
export const lens = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, zoom: { value: 0 }, ca: { value: 0.0015 }, vig: { value: 0.9 }, grain: { value: 0.05 },
    seed: { value: 0 }, black: { value: 0 }, white: { value: 0 }, center: { value: new THREE.Vector2(.5, .5) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float zoom, ca, vig, grain, seed, black, white; uniform vec2 center; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
    void main(){
      vec2 d = vUv - center; vec3 c = vec3(0.);
      const int N = 12;
      int n = zoom > 0.002 ? N : 1;
      for (int i = 0; i < N; i++) {
        if (i >= n) break;
        float s = 1. - zoom * float(i) / float(N);
        vec2 uv = center + d * s;
        float k = ca * (1. + 6. * zoom);
        c.r += texture2D(tDiffuse, center + (uv - center) * (1. + k)).r;
        c.g += texture2D(tDiffuse, uv).g;
        c.b += texture2D(tDiffuse, center + (uv - center) * (1. - k)).b;
      }
      c /= float(n);
      float r = length(d * vec2(1., 1.6));
      c *= mix(1., smoothstep(1.05, 0.25, r), vig);
      c += (h(vUv * 1000.) - .5) * grain;
      c = mix(c, vec3(1.), white); c = mix(c, vec3(0.), black);
      gl_FragColor = vec4(c, 1.);
    }`,
});
export const hudScene = new THREE.Scene();
export const hudCam = new THREE.PerspectiveCamera(30, W / H, .1, 100);
const hudPass = new RenderPass(hudScene, hudCam); hudPass.clear = false; hudPass.clearDepth = true;
composer.addPass(renderPass); composer.addPass(bokeh); composer.addPass(hudPass); composer.addPass(bloom); composer.addPass(output); composer.addPass(lens);

export function draw(scene, camera, fx = {}) {
  renderPass.scene = scene; renderPass.camera = camera;
  bokeh.enabled = !!fx.dof && Q.get('dof') !== '0';
  if (fx.dof) {
    bokeh.scene = scene; bokeh.camera = camera;
    bokeh.uniforms.focus.value = fx.dof.focus; bokeh.uniforms.aperture.value = fx.dof.aperture; bokeh.uniforms.maxblur.value = fx.dof.maxblur ?? 0.01;
  }
  bloom.strength = (fx.bloom ?? 0.45) * .7; bloom.threshold = Math.max(.9, fx.threshold ?? .92); bloom.radius = fx.bloomRadius ?? 0.55;
  renderer.toneMappingExposure = fx.exposure ?? 1.0;
  const u = lens.uniforms;
  u.zoom.value = fx.zoom ?? 0; u.ca.value = fx.ca ?? 0.0012; u.vig.value = fx.vig ?? 0.85; u.grain.value = fx.grain ?? 0.045;
  u.black.value = fx.black ?? 0; u.white.value = fx.white ?? 0; u.seed.value = fx.seed ?? 0;
  u.center.value.set(fx.cx ?? .5, fx.cy ?? .5);
  composer.render();
}

// ---- studio environment (soft boxes + strip lights) -----------------------------
export function studioEnv(tint = 0xffffff) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide })));
  const panel = (w, h, pos, rot, intensity, color = tint) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); s.add(m);
  };
  panel(16, 6, [0, 12, 2], [Math.PI / 2, 0, 0], 3.2);            // top soft box
  panel(1.4, 18, [-11, 1, 3], [0, Math.PI / 2, 0], 6);            // left strip
  panel(1.4, 18, [11, 1, -2], [0, -Math.PI / 2, 0], 4.5);         // right strip
  panel(10, 3, [0, -3, 12], [0, Math.PI, 0], 1.2);                // soft front fill
  panel(6, 2, [-6, -6, -8], [0, .5, 0], 2.5, 0xff5544);           // warm red kicker
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

// ---- background: deep gradient dome + drifting bokeh dust -----------------------
export function backdrop(scene, { top = 0x030304, glow = 0x3a0609, glowPos = [0.2, 0.15], dust = 140, seed = 1, spread = 14 } = {}) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { c0: { value: new THREE.Color(top) }, c1: { value: new THREE.Color(glow) }, gp: { value: new THREE.Vector2(...glowPos) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 c0, c1; uniform vec2 gp; varying vec3 vP;
      void main(){ float g = smoothstep(1.1, 0., distance(vP.xy, gp)) * smoothstep(-0.2, 1., -vP.z);
        gl_FragColor = vec4(c0 + c1 * g * 0.75, 1.); }`,
  }));
  scene.add(dome);
  const r = rng(seed), n = dust, pos = new Float32Array(n * 3), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * spread; pos[i * 3 + 1] = (r() - .5) * spread * 1.6; pos[i * 3 + 2] = -r() * spread - 2; sz[i] = .3 + r() * 1.2; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(0xffd0c8) }, t: { value: 0 } },
    vertexShader: `attribute float size; uniform float t; varying float vA;
      void main(){ vec3 p = position; p.y += sin(t * .3 + position.x) * .25; p.x += cos(t * .2 + position.z) * .2;
        vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = size * 900. / -mv.z; vA = clamp(1.2 - (-mv.z) / 18., .1, 1.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .1, d) * .22 * vA; gl_FragColor = vec4(color * a, a); }`,
  }));
  scene.add(pts);
  return { dome, dust: pts, tick: t => { pts.material.uniforms.t.value = t; } };
}

// ---- textures from canvas ---------------------------------------------------------
export function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const loader = new THREE.TextureLoader();
export const tex = (url) => new Promise(res => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }));

// ---- the apple ----------------------------------------------------------------------
const PROFILE = [[0, -0.84], [0.14, -0.9], [0.36, -0.95], [0.62, -0.9], [0.86, -0.68], [1.0, -0.33], [1.06, 0.05], [1.03, 0.4], [0.9, 0.68], [0.68, 0.86], [0.44, 0.88], [0.24, 0.8], [0.09, 0.66], [0, 0.6]];
export function appleRadiusAt(y) { // approximate outer radius at height y (for placing parts)
  let best = 0; for (let i = 0; i < PROFILE.length - 1; i++) { const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) best = Math.max(best, lerp(r0, r1, (y - y0) / (y1 - y0))); } return best;
}
function appleGeometry(pts = 120, segs = 160) {
  const curve = new THREE.SplineCurve(PROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(pts), segs);
  g.computeVertexNormals();
  return g;
}
function appleSkin(seed = 3) {
  const r = rng(seed);
  return canvasTex(2048, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#7a0b10'); grd.addColorStop(.25, '#b3141b'); grd.addColorStop(.6, '#c21a1f'); grd.addColorStop(.85, '#8f2a12'); grd.addColorStop(1, '#a8681c');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { // vertical streaks
      const x = r() * w, ww = 4 + r() * 22;
      g.fillStyle = r() < .55 ? `rgba(95,6,12,${.03 + r() * .07})` : `rgba(235,95,55,${.02 + r() * .05})`;
      g.fillRect(x, h * (.1 + r() * .2), ww, h * (.4 + r() * .45));
    }
    for (let i = 0; i < 60; i++) { // irregular blush patches
      const x = r() * w, y = h * (.2 + r() * .6), rr = 60 + r() * 220, c = r() < .6 ? '120,8,14' : '210,70,30';
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${c},${.12 + r() * .15})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    g.filter = 'blur(10px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
    for (let i = 0; i < 2600; i++) { // lenticels
      g.fillStyle = `rgba(255,${200 + r() * 40},${150 + r() * 60},${.15 + r() * .35})`;
      g.beginPath(); g.ellipse(r() * w, h * (.12 + r() * .78), 1 + r() * 2.2, 1 + r() * 1.6, 0, 0, Math.PI * 2); g.fill();
    }
  });
}
let _skin;
export const appleGeo = () => appleGeometry(24, 28);
export const appleMat = () => new THREE.MeshPhysicalMaterial({ map: (_skin ??= appleSkin(3)), roughness: .34, clearcoat: .55, clearcoatRoughness: .22, sheen: .4, sheenColor: new THREE.Color(0xffb0a0) });
export function makeApple({ logo = false, seed = 3 } = {}) {
  const grp = new THREE.Group();
  const mat = logo
    ? new THREE.MeshPhysicalMaterial({ color: RED, roughness: .22, clearcoat: 1, clearcoatRoughness: .06, sheen: .25, sheenColor: new THREE.Color(0xff8080) })
    : new THREE.MeshPhysicalMaterial({ map: (_skin ??= appleSkin(seed)), roughness: .34, clearcoat: .55, clearcoatRoughness: .22, sheen: .4, sheenColor: new THREE.Color(0xffb0a0) });
  const body = new THREE.Mesh(appleGeometry(), mat); grp.add(body);
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .58, 0), new THREE.Vector3(.02, .82, 0), new THREE.Vector3(-.06, 1.06, .02), new THREE.Vector3(-.16, 1.2, .04)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 24, .035, 10), new THREE.MeshStandardMaterial({ color: 0x4a2d14, roughness: .7 }));
  grp.add(stem);
  // leaf: outline shape, bent along its length and across its midrib
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(.18, .12, .45, .2, .78, 0); s.bezierCurveTo(.45, -.2, .18, -.12, 0, 0);
  const lg = new THREE.ShapeGeometry(s, 24); const p = lg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * .35 + Math.abs(y) * .5); }
  lg.computeVertexNormals();
  const leaf = new THREE.Mesh(lg, new THREE.MeshPhysicalMaterial({ color: 0x2e9e3f, roughness: .35, clearcoat: .6, side: THREE.DoubleSide, sheen: .5, sheenColor: new THREE.Color(0x9fffb0) }));
  leaf.position.set(-.02, .9, .02); leaf.rotation.set(.2, -.5, .55);
  grp.add(leaf);
  grp.userData = { body, stem, leaf };
  return grp;
}

// ---- the Malus Lens mark in 3D: apple + white band + a real camera lens ----------
export function makeLogo() {
  const grp = makeApple({ logo: true });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
  const bandY = .02, bandR = appleRadiusAt(bandY) + .012;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(bandR, bandR, .15, 160, 1, true), white);
  band.material = white.clone(); band.material.side = THREE.DoubleSide; band.position.y = bandY; grp.add(band);
  const lens = new THREE.Group(); lens.position.set(0, bandY, bandR - .12); grp.add(lens);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.5, .52, .34, 96), white); ring.rotation.x = Math.PI / 2; lens.add(ring);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .36, 96), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: .35, metalness: .6 }));
  barrel.rotation.x = Math.PI / 2; barrel.position.z = .01; lens.add(barrel);
  for (const [rr, z] of [[.385, .17]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, .008, 8, 96), new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 1, roughness: .25 })); t.position.z = z; lens.add(t);
  }
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.36, 96, 48, 0, Math.PI * 2, 0, .62), new THREE.MeshPhysicalMaterial({
    color: 0x020203, roughness: .03, metalness: .5, clearcoat: 1, clearcoatRoughness: 0, iridescence: .8, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 700] }));
  glass.rotation.x = Math.PI / 2; glass.position.z = -.12; lens.add(glass);
  const hl = new THREE.Mesh(new THREE.CircleGeometry(.075, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  hl.position.set(.13, .13, .2); hl.visible = false;
  grp.userData.band = band; grp.userData.lens = lens; grp.userData.lensGlass = glass; grp.userData.hl = hl;
  return grp;
}

// ---- 3D type --------------------------------------------------------------------------
const fonts = {};
export async function loadFonts() {
  for (const w of ['ExtraBold', 'Bold', 'SemiBold']) fonts[w] = new FontLoader().parse(await (await fetch(`fonts/Montserrat-${w}.json`)).json());
  const inter = [400, 500, 600, 700].map(w => new FontFace('Inter', `url(../reel/fonts/Inter-${w}.woff2)`, { weight: String(w) }));
  const mono = [500, 700].map(w => new FontFace('JetBrains Mono', `url(../reel/fonts/JetBrainsMono-${w}.woff2)`, { weight: String(w) }));
  const mont = [700, 800, 900].map(w => new FontFace('Montserrat', `url(../reel/fonts/Montserrat-${w}.woff2)`, { weight: String(w) }));
  for (const f of [...inter, ...mono, ...mont]) document.fonts.add(await f.load());
}
export const mats = {
  white: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0x161616, roughness: .28, clearcoat: 1, clearcoatRoughness: .1 }),
  red: () => new THREE.MeshPhysicalMaterial({ color: RED, emissive: 0x200103, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 }),
  glass: (color = 0xffffff, rough = .06) => new THREE.MeshPhysicalMaterial({ color, transmission: 1, roughness: rough, thickness: .8, ior: 1.45, clearcoat: 1, clearcoatRoughness: .02, iridescence: .35, iridescenceIOR: 1.3, specularIntensity: 1, envMapIntensity: 1.4 }),
  chrome: () => new THREE.MeshPhysicalMaterial({ color: 0xdedede, metalness: 1, roughness: .12 }),
};
// Returns a group of per-letter meshes laid out on one line, centred; each letter has
// userData.i for staggered animation. `parts` lets a line mix materials: [['Malus ', matA], ['Lens', matB]].
export function text3d(parts, { size = .5, depth = .12, weight = 'ExtraBold', bevel = .012, align = 'center', tracking = -0.02 } = {}) {
  if (typeof parts === 'string') parts = [[parts, mats.white()]];
  const font = fonts[weight], res = font.data.resolution, grp = new THREE.Group();
  let x = 0, i = 0;
  for (const [str, mat] of parts) for (const ch of str) {
    const gl = font.data.glyphs[ch] || font.data.glyphs['?'];
    if (ch !== ' ') {
      const geo = new TextGeometry(ch, { font, size, depth, curveSegments: 7, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 3 });
      geo.computeBoundingBox(); const bb = geo.boundingBox;
      const cx = (bb.min.x + bb.max.x) / 2, cy = size * .36;
      geo.translate(-cx, -cy, -depth / 2);           // pivot each letter at its own centre
      const m = new THREE.Mesh(geo, mat); m.position.x = x + cx; m.position.y = cy; m.userData.i = i++;
      grp.add(m);
    }
    x += gl.ha / res * size + tracking * size;
  }
  const shift = align === 'center' ? -x / 2 : align === 'right' ? -x : 0;
  grp.children.forEach(m => { m.position.x += shift; m.userData.base = m.position.clone(); });
  grp.userData.width = x;
  return grp;
}
// Animate a text group's letters in: rise + flip + fade (needs transparent mats for fade)
export function letterIn(grp, t, t0, { stagger = .03, dur = .7, rise = .35, flip = 1.2, out = null } = {}) {
  grp.children.forEach(m => {
    const k = P(t, t0 + m.userData.i * stagger, t0 + m.userData.i * stagger + dur, E.expoOut);
    let o = out ? P(t, out + m.userData.i * stagger * .5, out + m.userData.i * stagger * .5 + .45, E.expoIn) : 0;
    m.position.y = m.userData.base.y - rise * (1 - k) + rise * .8 * o;
    m.rotation.x = flip * (1 - k) - flip * .8 * o;
    m.position.z = m.userData.base.z - (1 - k) * .6 + o * .6;
    m.scale.setScalar(Math.max(0.0001, (.6 + .4 * k) * (1 - o)));
    m.visible = k > 0.001 && o < .999;
  });
}

// ---- glass card with a label -----------------------------------------------------------
export function glassCard(w, h, paint, { r = .12, depth = .06, tint = 0xffffff, rough = .28, scale = 520 } = {}) {
  const grp = new THREE.Group();
  const slab = new THREE.Mesh(new RoundedBoxGeometry(w, h, depth, 6, r), mats.glass(tint, rough));
  slab.material.iridescence = .5; slab.material.thickness = .4;
  grp.add(slab);
  if (paint) {
    const t = canvasTex(Math.round(w * scale), Math.round(h * scale), paint);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
    face.position.z = depth / 2 + .003; grp.add(face); grp.userData.face = face;
  }
  grp.userData.slab = slab;
  return grp;
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---- phone -------------------------------------------------------------------------------
export function makePhone(screens) {
  const grp = new THREE.Group();
  const W_ = 1.0, H_ = 2.165, D = .1;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W_, H_, D, 8, .14), new THREE.MeshPhysicalMaterial({ color: 0x9a9ca2, metalness: 1, roughness: .28, clearcoat: .4 }));
  grp.add(frame);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(W_ - .02, H_ - .02, D + .004, 8, .13), new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: .1, clearcoat: 1 }));
  grp.add(bezel);
  const mask = canvasTex(512, 1108, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; roundRect(g, 0, 0, w, h, 58); g.fill(); });
  mask.colorSpace = THREE.NoColorSpace;
  const sw = W_ - .07, sh = H_ - .07;
  const scr = screens.map((t, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: t, alphaMap: mask, transparent: true, toneMapped: false, opacity: i ? 0 : 1, color: 0xc8c8c8 }));
    m.position.z = D / 2 + .004 + i * .001; grp.add(m); return m;
  });
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .06, roughness: 0, clearcoat: 1, alphaMap: mask }));
  cover.position.z = D / 2 + .01; grp.add(cover);
  const island = new THREE.Mesh(new RoundedBoxGeometry(.27, .08, .01, 4, .04), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, sh / 2 - .07, D / 2 + .012); grp.add(island);
  grp.userData.screens = scr;
  return grp;
}
