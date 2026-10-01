// A generated score: projector hum + a slow, warm pad. Nothing is downloaded.
let ctx, master, started = false, enabled = false;

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Projector hum: filtered noise with a 24fps flutter
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * .5;
  const noise = ctx.createBufferSource();
  noise.buffer = buf; noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = .7;
  const humGain = ctx.createGain(); humGain.gain.value = .035;
  const flutter = ctx.createOscillator(); flutter.frequency.value = 24;
  const flutterDepth = ctx.createGain(); flutterDepth.gain.value = .012;
  flutter.connect(flutterDepth).connect(humGain.gain);
  noise.connect(band).connect(humGain).connect(master);
  noise.start(); flutter.start();

  // Pad: a suspended chord around D, slowly breathing
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = .4;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .05;
  const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 380;
  lfo.connect(lfoDepth).connect(lp.frequency); lfo.start();
  const padGain = ctx.createGain(); padGain.gain.value = .06;
  lp.connect(padGain).connect(master);
  [73.42, 110, 146.83, 164.81, 220.0].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = f; o.detune.value = (i - 2) * 4;
    const g = ctx.createGain(); g.gain.value = i === 0 ? .9 : .45;
    o.connect(g).connect(lp); o.start();
  });
}

export function setSound(on) {
  enabled = on;
  if (on && !started) { build(); started = true; }
  if (!ctx) return;
  if (on && ctx.state === 'suspended') ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? .8 : 0, ctx.currentTime, on ? .8 : .25);
}

export const soundOn = () => enabled;

// Short cues: a "clap" for the slate and a soft tick for hovers.
export function clap() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const len = ctx.sampleRate * .12;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const s = ctx.createBufferSource(); s.buffer = b;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
  const g = ctx.createGain(); g.gain.value = .5;
  s.connect(hp).connect(g).connect(master); s.start(t);
}

export function tick() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.frequency.value = 1800; o.type = 'sine';
  const g = ctx.createGain(); g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .06);
  o.connect(g).connect(master); o.start(t); o.stop(t + .07);
}
