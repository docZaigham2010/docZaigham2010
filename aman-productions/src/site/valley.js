// "The valley is our set" — a ridgeline relief of the Kashmir valley with
// the studio at its heart and routes drawn out to the places we know best.
const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 620;
const LON = [74.18, 75.52], LAT = [33.86, 34.46];

export const LOCATIONS = [
  { id: 'hq', name: 'Abi Guzar', tag: 'The studio · Srinagar', lat: 34.0717, lon: 74.8143, hq: true, dx: -14, dy: 34, anchor: 'end',
    light: 'Every plan starts here — in the heart of Srinagar.', good: 'Briefs, planning sessions and the first cup of kahwa.' },
  { id: 'dal', name: 'Dal Lake', tag: 'Srinagar', lat: 34.1105, lon: 74.8652, dx: 16, dy: 26, anchor: 'start',
    light: 'First light, when the mist still sits on the water.', good: 'Shikara arrivals, lakeside celebrations, opening shots.' },
  { id: 'gardens', name: 'Mughal Gardens', tag: 'Nishat · Shalimar · Chashme Shahi', lat: 34.1460, lon: 74.8720, dx: 16, dy: -16, anchor: 'start',
    light: 'Late afternoon, falling through the chinar trees.', good: 'Garden ceremonies, portraits, period frames.' },
  { id: 'gulmarg', name: 'Gulmarg', tag: 'Meadow of flowers', lat: 34.0484, lon: 74.3805, dx: 0, dy: 34, anchor: 'middle',
    light: 'Blue hour on fresh snow.', good: 'Winter celebrations, brand films, snow sequences.' },
  { id: 'pahalgam', name: 'Pahalgam', tag: 'Lidder valley', lat: 34.0161, lon: 75.3150, dx: 0, dy: 34, anchor: 'middle',
    light: 'Golden hour along the Lidder river.', good: 'Retreats, destination weddings, documentaries.' },
  { id: 'sonamarg', name: 'Sonamarg', tag: 'Meadow of gold', lat: 34.3000, lon: 75.2900, dx: 0, dy: -22, anchor: 'middle',
    light: 'Midday on the glaciers; dusk in the meadow.', good: 'Epic landscapes, adventure films, aerial-led stories (with permits).' },
];

const project = (lat, lon) => [
  60 + (lon - LON[0]) / (LON[1] - LON[0]) * (W - 120),
  40 + (1 - (lat - LAT[0]) / (LAT[1] - LAT[0])) * (H - 80),
];

function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

// deterministic pseudo-noise so the relief is the same on every visit
const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
function noise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }

export function buildValley(svg, card, list, onSelect) {
  const hq = LOCATIONS[0];
  const [cx, cy] = project(hq.lat, hq.lon);

  // Ridgelines: high around the edges, low across the valley floor
  const ridges = el('g', { class: 'ridges' }, svg);
  const rows = 34;
  for (let r = 0; r < rows; r++) {
    const y0 = 30 + r * ((H - 40) / rows);
    let d = `M0 ${H} L0 ${y0}`;
    for (let x = 0; x <= W; x += 8) {
      const dist = Math.hypot((x - cx) / 520, (y0 - cy) / 300);
      const mountain = Math.max(0, Math.min(1, (dist - .28) * 1.6));
      const n = noise1(x * .018 + r * 3.7) * .65 + noise1(x * .05 + r * 1.3) * .35;
      const peak = Math.pow(n, 2.2) * 90 * mountain;
      d += ` L${x} ${(y0 - peak).toFixed(1)}`;
    }
    d += ` L${W} ${H} Z`;
    el('path', { d, class: `contour${r % 6 === 0 ? ' hi' : ''}`, style: 'fill: #07080a' }, ridges);
  }

  // Graticule labels
  [74.4, 74.8, 75.2].forEach((lon) => { const [x] = project(LAT[0], lon); el('text', { x: x + 4, y: H - 12, class: 'axis' }, svg).textContent = `${lon.toFixed(1)}°E`; });
  [34.0, 34.2, 34.4].forEach((lat) => { const [, y] = project(lat, LON[0]); el('text', { x: 8, y: y - 4, class: 'axis' }, svg).textContent = `${lat.toFixed(1)}°N`; });

  // Routes from the studio
  const routes = el('g', { class: 'routes' }, svg);
  const routeEls = [];
  LOCATIONS.slice(1).forEach((loc) => {
    const [x, y] = project(loc.lat, loc.lon);
    const mx = (cx + x) / 2, my = (cy + y) / 2 - Math.min(120, Math.hypot(x - cx, y - cy) * .35);
    const p = el('path', { d: `M${cx} ${cy} Q${mx} ${my} ${x} ${y}`, class: 'route' }, routes);
    routeEls.push(p);
  });

  // Pins
  const pins = LOCATIONS.map((loc) => {
    const [x, y] = project(loc.lat, loc.lon);
    const g = el('g', { class: `pin${loc.hq ? ' hq' : ''}`, transform: `translate(${x} ${y})`, tabindex: '0', role: 'button', 'aria-label': `${loc.name}, ${loc.tag}` }, svg);
    el('circle', { r: 7, class: 'halo' }, g);
    el('circle', { r: loc.hq ? 6 : 4.5, class: 'core' }, g);
    const t = el('text', { x: loc.dx, y: loc.dy - 6, 'text-anchor': loc.anchor }, g); t.textContent = loc.name;
    const s = el('text', { x: loc.dx, y: loc.dy + 9, 'text-anchor': loc.anchor, class: 'sub' }, g);
    s.textContent = loc.hq ? 'THE STUDIO' : `≈ ${km(hq, loc)} KM`;
    g.addEventListener('click', () => select(loc.id));
    g.addEventListener('mouseenter', () => select(loc.id));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(loc.id); } });
    return { loc, g };
  });

  // Chips (keyboard + touch friendly)
  const chips = LOCATIONS.map((loc) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = loc.name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => select(loc.id));
    li.appendChild(b); list.appendChild(li);
    return { loc, b };
  });

  function select(id) {
    const loc = LOCATIONS.find((l) => l.id === id);
    pins.forEach(({ loc: l, g }) => g.classList.toggle('is-active', l.id === id));
    chips.forEach(({ loc: l, b }) => b.setAttribute('aria-pressed', String(l.id === id)));
    const dist = loc.hq ? 'Home base' : `≈ ${km(hq, loc)} km from the studio, as the crow flies`;
    card.innerHTML = `
      <span class="mono tag">${loc.tag}</span>
      <h3>${loc.name}</h3>
      <span class="mono coords">${loc.lat.toFixed(3)}° N · ${loc.lon.toFixed(3)}° E</span>
      <dl>
        <div><dt>${loc.hq ? 'What happens here' : 'When the light is best'}</dt><dd>${loc.light}</dd></div>
        <div><dt>${loc.hq ? 'Also' : 'Made for'}</dt><dd>${loc.good}</dd></div>
        <div><dt>Distance</dt><dd>${dist}</dd></div>
      </dl>`;
    onSelect?.(loc);
  }
  select('dal');
  return { routes: routeEls, pins: pins.map((p) => p.g) };
}
