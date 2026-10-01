// The through-line of the film: one field of light that re-forms itself
// into whatever each chapter is about — logo, spark, aperture, stage, wave, valley, portal.
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, ShaderMaterial,
  Points, AdditiveBlending, Vector2, Color,
} from 'three';

const rand = (a = -1, b = 1) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// ── Shape generators: each fills a Float32Array(n*3) ─────────────────────────
async function sampleLogo(n) {
  const img = new Image();
  img.src = new URL('media/ap-logo.jpeg', document.baseURI).href;
  await img.decode();
  const W = 220, H = 220;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const hits = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 2] > 140 && data[i] < 120) hits.push(x, y);
  }
  const out = new Float32Array(n * 3);
  const count = hits.length / 2;
  for (let i = 0; i < n; i++) {
    const k = (Math.random() * count) | 0;
    const x = (hits[k * 2] + Math.random() - W / 2) / W;
    const y = -(hits[k * 2 + 1] + Math.random() - H / 2) / H;
    out[i * 3] = x * 7.6;
    out[i * 3 + 1] = y * 7.6 + .15;
    out[i * 3 + 2] = gauss() * .18;
  }
  return out;
}

function spark(n) { // a galaxy of ideas around a bright core
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const core = Math.random() < .25;
    const r = core ? Math.pow(Math.random(), 2) * .7 : .6 + Math.pow(Math.random(), .8) * 5.5;
    const arm = (i % 3) * (Math.PI * 2 / 3);
    const a = arm + r * .9 + gauss() * .35;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = Math.sin(a) * r * .55 + gauss() * .12;
    out[i * 3 + 2] = Math.sin(a) * r * .6 + gauss() * .3;
  }
  return out;
}

function aperture(n) { // a seven-blade iris
  const out = new Float32Array(n * 3);
  const blades = 7, R = 3.1, r0 = .85;
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    let x, y, z = gauss() * .06;
    if (t < .32) { // outer barrel rings
      const a = Math.random() * Math.PI * 2;
      const rr = R + (Math.random() < .5 ? 0 : .22) + gauss() * .02;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = gauss() * .25;
    } else if (t < .8) { // blade edges: tangent lines from inner heptagon to the barrel
      const b = (Math.random() * blades) | 0;
      const a = b / blades * Math.PI * 2;
      const px = Math.cos(a) * r0, py = Math.sin(a) * r0;
      const dx = -Math.sin(a), dy = Math.cos(a);
      const len = Math.sqrt(R * R - r0 * r0);
      const s = Math.random() * len;
      x = px + dx * s + gauss() * .015; y = py + dy * s + gauss() * .015;
    } else { // blade surfaces, sparse
      const b = (Math.random() * blades) | 0;
      const a = b / blades * Math.PI * 2 + Math.random() * (Math.PI * 2 / blades);
      const rr = r0 + Math.random() * (R - r0);
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = gauss() * .03 - .1;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function stage(n) { // a crowd floor with three beams of light falling on it
  const out = new Float32Array(n * 3);
  const beams = [-2.6, 0, 2.6];
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (Math.random() < .55) { // crowd floor
      x = rand(-7, 7); z = rand(-6, 2.4); y = -2.1 + Math.abs(Math.sin(x * 3.1 + z * 2.3)) * .14 + Math.random() * .05;
    } else { // light cones from the rig
      const bx = beams[(Math.random() * 3) | 0];
      const h = Math.random();
      const spread = h * 1.25;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * spread;
      x = bx * (1 - h * .1) + Math.cos(a) * rr; y = 3.4 - h * 5.5; z = -1.4 + Math.sin(a) * rr * .6;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function wave(n) { // a flowing ribbon: the process, in motion
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rand(-1, 1), v = Math.random();
    const x = u * 8;
    const lane = (i % 5) / 4 - .5;
    const y = Math.sin(u * 3 + lane * 2) * 1.2 + lane * 1.6 + gauss() * .05;
    const z = Math.cos(u * 2.4 + v) * 1.4 - 1 + lane;
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function ridge(x, z) {
  let h = 0, amp = 1.6, f = .32;
  for (let o = 0; o < 4; o++) {
    const s = Math.sin(x * f + o * 1.7) * Math.cos(z * f * 1.3 + o * .9);
    h += (1 - Math.abs(s)) * amp; amp *= .5; f *= 2.05;
  }
  return h;
}
function valley(n) { // the mountains around a lake
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = rand(-9, 9), z = rand(-9, 1.5);
    const bowl = Math.min(1, Math.pow(Math.abs(x) / 6, 1.6) + Math.max(0, -z - 2) / 5);
    let y = ridge(x, z) * bowl * 1.25 - 2.3;
    if (bowl < .25 && Math.random() < .5) y = -2.3; // the lake
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function portal(n) { // a ring with a vortex drawing inwards: your scene
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (Math.random() < .45) {
      const a = Math.random() * Math.PI * 2, rr = 2.9 + gauss() * .08;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = gauss() * .1;
    } else {
      const t = Math.random();
      const a = t * 18 + (i % 6) * (Math.PI / 3);
      const rr = 2.8 * (1 - t) + .05;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = -t * 6;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

// ── Shaders ──────────────────────────────────────────────────────────────────
const vertex = /* glsl */`
  uniform float uTime, uMorph, uPixel, uSize, uScatter;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  attribute vec3 aFrom, aTo;
  attribute float aRand;
  varying float vRand, vGlow;
  float ease(float t) { return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
  void main() {
    float t = clamp((uMorph * 1.5) - aRand * .5, 0., 1.);
    float e = ease(t);
    vec3 p = mix(aFrom, aTo, e);
    // turbulence during the transition and a gentle idle breathing
    float swirl = sin(3.14159 * e);
    p += vec3(sin(uTime * .7 + aRand * 40.), cos(uTime * .6 + aRand * 31.), sin(uTime * .5 + aRand * 17.)) * (.035 + swirl * 1.1 * uScatter);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    // pointer pushes particles away, like a hand through light
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uMouse;
    float f = smoothstep(.28, 0., length(d)) * uMouseOn;
    mv.xy += normalize(d + 1e-4) * f * .55;
    gl_Position = projectionMatrix * mv;
    vGlow = f;
    vRand = aRand;
    gl_PointSize = uSize * uPixel * (0.6 + aRand * .9) * (1. / -mv.z);
  }
`;
const fragment = /* glsl */`
  uniform vec3 uA, uB;
  uniform float uOpacity, uTime;
  varying float vRand, vGlow;
  void main() {
    vec2 c = gl_PointCoord - .5;
    float d = length(c);
    float a = smoothstep(.5, .0, d);
    a *= a;
    vec3 col = mix(uA, uB, smoothstep(.62, .98, vRand));
    col = mix(col, vec3(1.), vGlow * .6);
    float twinkle = .75 + .25 * sin(uTime * 2. + vRand * 60.);
    gl_FragColor = vec4(col, a * uOpacity * twinkle);
  }
`;

export async function createParticles(canvas, { mobile }) {
  const N = mobile ? 7000 : 15000;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 0, 10);

  const shapes = {
    logo: await sampleLogo(N),
    spark: spark(N), aperture: aperture(N), stage: stage(N), wave: wave(N), valley: valley(N), portal: portal(N),
  };
  // Each chapter has a mood: [base colour, accent colour, camera tilt, camera distance]
  const moods = {
    logo: ['#23d5e8', '#f0a63a', 0, 10],
    spark: ['#f0a63a', '#efe9df', .25, 11],
    aperture: ['#efe9df', '#23d5e8', 0, 10.5],
    stage: ['#23d5e8', '#f0a63a', -.18, 11.5],
    wave: ['#efe9df', '#f0a63a', .1, 11],
    valley: ['#23d5e8', '#efe9df', -.32, 9.5],
    portal: ['#f0a63a', '#23d5e8', 0, 9],
  };

  const geo = new BufferGeometry();
  const from = new Float32Array(shapes.logo);
  const to = new Float32Array(shapes.logo);
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) rnd[i] = Math.random();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aFrom', new BufferAttribute(from, 3));
  geo.setAttribute('aTo', new BufferAttribute(to, 3));
  geo.setAttribute('aRand', new BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 }, uMorph: { value: 0 }, uPixel: { value: dpr }, uSize: { value: mobile ? 34 : 40 },
    uMouse: { value: new Vector2(9, 9) }, uMouseOn: { value: 0 }, uScatter: { value: 1 },
    uA: { value: new Color(moods.logo[0]) }, uB: { value: new Color(moods.logo[1]) }, uOpacity: { value: 0 },
  };
  const mat = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let fromKey = 'logo', toKey = 'logo';
  const state = { morph: 0, tilt: 0, dist: 10, opacity: 1, intro: 0, x: 0, y: 0 };
  // Where each shape sits in frame. The opening logo shares the screen with the headline.
  const framing = (key) => {
    if (key !== 'logo' || !atTop) return [0, 0];
    return mobile ? [0, 2.4] : [2.9, .5];
  };
  let atTop = true;
  const colA = new Color(moods.logo[0]), colB = new Color(moods.logo[1]);
  const mouse = new Vector2(9, 9), mouseTarget = new Vector2(9, 9);
  let mouseOn = 0, mouseOnTarget = 0, running = true, visible = true;

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep shapes framed on portrait screens
    camera.fov = w < h ? 62 : 45;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    mouseTarget.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    mouseOnTarget = e.pointerType === 'mouse' ? 1 : 0;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // Called by the scroll director: we're morphing from shape A to shape B by t∈[0,1]
  function setChapter(a, b, t) {
    if (a !== fromKey || b !== toKey) {
      from.set(shapes[a] || shapes.logo); to.set(shapes[b] || shapes.logo);
      geo.attributes.aFrom.needsUpdate = true; geo.attributes.aTo.needsUpdate = true;
      fromKey = a; toKey = b;
    }
    state.morph = t;
    const ma = moods[a], mb = moods[b];
    colA.set(ma[0]).lerp(new Color(mb[0]), t);
    colB.set(ma[1]).lerp(new Color(mb[1]), t);
    state.tilt = ma[2] + (mb[2] - ma[2]) * t;
    state.dist = ma[3] + (mb[3] - ma[3]) * t;
    atTop = scrollY < innerHeight * 2;
    const fa = framing(a), fb = framing(b);
    state.x = fa[0] + (fb[0] - fa[0]) * t;
    state.y = fa[1] + (fb[1] - fa[1]) * t;
  }

  let last = performance.now(), smoothMorph = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || !visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    smoothMorph += (state.morph - smoothMorph) * Math.min(1, dt * 6);
    uniforms.uMorph.value = smoothMorph;
    uniforms.uA.value.lerp(colA, dt * 3);
    uniforms.uB.value.lerp(colB, dt * 3);
    uniforms.uOpacity.value += (state.opacity * state.intro - uniforms.uOpacity.value) * Math.min(1, dt * 3);
    mouse.lerp(mouseTarget, Math.min(1, dt * 8));
    mouseOn += (mouseOnTarget - mouseOn) * Math.min(1, dt * 4);
    uniforms.uMouse.value.copy(mouse);
    uniforms.uMouseOn.value = mouseOn;
    const t = uniforms.uTime.value;
    points.rotation.y = Math.sin(t * .12) * .22 + mouse.x * .12 * mouseOn;
    points.rotation.x = state.tilt + Math.cos(t * .1) * .05 - mouse.y * .06 * mouseOn;
    camera.position.z += (state.dist - camera.position.z) * Math.min(1, dt * 2);
    points.position.x += (state.x - points.position.x) * Math.min(1, dt * 2.5);
    points.position.y += (state.y - points.position.y) * Math.min(1, dt * 2.5);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setChapter,
    setOpacity(v) { state.opacity = v; },
    intro(v) { state.intro = v; },
    setStatic(v) { uniforms.uScatter.value = v ? 0 : 1; },
    pause(v) { running = !v; },
  };
}
