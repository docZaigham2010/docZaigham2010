// Small, dependency-free SVG charts. Series colours are validated tokens (--s1, --s2).
import React, { useState } from 'react';
import { compactInr, inr } from './lib.js';

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p / 2) * 2 * p;
};

// Vertical grouped bars, e.g. invoiced vs collected per month
export function GroupedBars({ data, series, height = 220, format = compactInr }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = height, pad = { l: 46, r: 8, t: 12, b: 26 };
  const max = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d[s.key] || 0))));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const groupW = iw / data.length;
  const barW = Math.min(22, (groupW - 12) / series.length - 4);
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = [0, .5, 1].map((f) => max * f);
  // Capsules: fully rounded bars, like pills standing on the baseline
  const bar = (x, top, w, h) => {
    const r = Math.min(w / 2, h / 2);
    return `M${x} ${top + h - r} V${top + r} A${r} ${r} 0 0 1 ${x + w} ${top + r} V${top + h - r} A${r} ${r} 0 0 1 ${x} ${top + h - r} Z`;
  };
  return (
    <div className="chart">
      <div className="chart__legend">{series.map((s, i) => <span key={s.key}><i style={{ background: `var(--s${i + 1})` }} />{s.label}</span>)}</div>
      <div className="chart__wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${series.map((s) => s.label).join(' and ')} by month`}>
          {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" /><text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart__tick">{format(t)}</text></g>)}
          {data.map((d, i) => {
            const gx = pad.l + i * groupW;
            const start = gx + (groupW - (barW + 4) * series.length) / 2;
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={gx} y={pad.t} width={groupW} height={ih} className={hover === i ? 'chart__hit is-on' : 'chart__hit'} />
                {series.map((s, k) => {
                  const v = d[s.key] || 0; const h = Math.max(0, ih - (y(v) - pad.t));
                  return h > 0 && <g key={s.key} style={{ opacity: d.future ? .45 : 1 }}><path d={bar(start + k * (barW + 4), y(v), barW, h)} style={{ fill: `var(--s${k + 1})` }} />{h > barW && <circle cx={start + k * (barW + 4) + barW / 2} cy={y(v) + barW / 2} r={barW / 4.5} className="chart__cap" />}</g>;
                })}
                <text x={gx + groupW / 2} y={H - 8} textAnchor="middle" className="chart__tick">{d.label}</text>
              </g>
            );
          })}
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="chart__axis" />
        </svg>
        {hover != null && (
          <div className="chart__tip" style={{ left: `${((pad.l + (hover + .5) * groupW) / W) * 100}%` }}>
            <b>{data[hover].full || data[hover].label}</b>
            {series.map((s, k) => <span key={s.key}><i style={{ background: `var(--s${k + 1})` }} />{s.label}<em>{inr(data[hover][s.key] || 0)}</em></span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// Horizontal single-series bars with direct value labels
export function HBars({ data, format = compactInr, tone = 1, max: forcedMax }) {
  const [hover, setHover] = useState(null);
  const max = forcedMax || Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <ul className="hbars">
      {data.map((d, i) => (
        <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? 'is-on' : ''} title={d.title || `${d.label}: ${format(d.value)}`}>
          <span className="hbars__label">{d.label}{d.sub && <small>{d.sub}</small>}</span>
          <span className="hbars__track"><i style={{ width: `${Math.max(1.5, Math.abs(d.value) / max * 100)}%`, background: d.color || (d.value < 0 ? 'var(--red)' : `var(--s${tone})`) }} /></span>
          <span className="hbars__value">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Thin ring for a single proportion (e.g. collected vs invoiced)
export function Ring({ value, size = 64, label }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--s1)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, value)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" className="ring__text">{Math.round(value * 100)}%</text>
    </svg>
  );
}
