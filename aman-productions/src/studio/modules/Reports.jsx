import React, { useMemo } from 'react';
import { useStudio } from '../store.js';
import { Card, PageHead, Stat } from '../ui.jsx';
import { HBars } from '../charts.jsx';
import { compactInr, inr, sum, projectCost, projectEstimate, invoiceTotals, SERVICES, STAGES, today, addDays } from '../lib.js';

export default function Reports() {
  const s = useStudio();
  const r = useMemo(() => {
    const byService = {};
    s.projects.forEach((p) => { byService[p.service] = (byService[p.service] || 0) + p.fee; });
    const margins = s.projects.map((p) => {
      const cost = Math.max(projectEstimate(p), projectCost(p));
      return { label: p.name.split('—')[0].trim(), sub: p.service, value: p.fee - cost, pct: p.fee ? Math.round((p.fee - cost) / p.fee * 100) : 0 };
    }).sort((a, b) => b.value - a.value);
    const closed = s.leads.filter((l) => ['Won', 'Lost'].includes(l.stage));
    const sources = {};
    s.leads.forEach((l) => { const k = (l.source || 'Other').split(' · ')[0]; (sources[k] ||= { n: 0, won: 0, value: 0 }); sources[k].n++; if (l.stage === 'Won') { sources[k].won++; sources[k].value += l.value; } });
    const crewDays = {};
    s.projects.forEach((p) => p.crew.forEach((c) => { crewDays[c.crewId] = (crewDays[c.crewId] || 0) + (Number(c.days) || 0); }));
    const fee = sum(s.projects, (p) => p.fee), cost = sum(s.projects, (p) => Math.max(projectEstimate(p), projectCost(p)));
    return {
      byService: Object.entries(byService).map(([label, value]) => ({ label, value, sub: SERVICES[label] === 'film' ? 'Film' : 'Event' })).sort((a, b) => b.value - a.value),
      margins, winRate: closed.length ? Math.round(closed.filter((l) => l.stage === 'Won').length / closed.length * 100) : 0,
      sources: Object.entries(sources).map(([label, v]) => ({ label, value: v.n, sub: `${v.won} won · ${compactInr(v.value)}` })).sort((a, b) => b.value - a.value),
      crew: Object.entries(crewDays).map(([id, value]) => ({ label: s.crew.find((c) => c.id === id)?.name || 'Removed', sub: s.crew.find((c) => c.id === id)?.role, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      fee, cost,
      avgDeal: s.projects.length ? fee / s.projects.length : 0,
    };
  }, [s]);
  return (
    <div>
      <PageHead eyebrow="Reports" title="How the studio is really doing.">All productions and leads in this workspace. Margin uses the larger of estimate or actual cost.</PageHead>
      <div className="stats">
        <Stat label="Contract value" value={compactInr(r.fee)} sub={`${s.projects.length} productions`} />
        <Stat label="Projected margin" value={compactInr(r.fee - r.cost)} sub={r.fee ? `${Math.round((r.fee - r.cost) / r.fee * 100)}% blended` : ''} />
        <Stat label="Average production" value={compactInr(r.avgDeal)} />
        <Stat label="Lead win rate" value={`${r.winRate}%`} sub="of closed leads" />
      </div>
      <div className="grid-2">
        <Card title="Revenue by service"><HBars data={r.byService} /></Card>
        <Card title="Margin by production"><HBars data={r.margins.map((m) => ({ ...m, sub: `${m.sub} · ${m.pct}%` }))} /></Card>
        <Card title="Where leads come from"><HBars data={r.sources} format={(v) => `${v} lead${v === 1 ? '' : 's'}`} tone={2} /></Card>
        <Card title="Crew days booked"><HBars data={r.crew} format={(v) => `${v} day${v === 1 ? '' : 's'}`} tone={2} /></Card>
      </div>
    </div>
  );
}
