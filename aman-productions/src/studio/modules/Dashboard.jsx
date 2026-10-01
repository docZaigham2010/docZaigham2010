import React, { useMemo } from 'react';
import { Workflow, Wallet, Clapperboard, AlertTriangle, IndianRupee, Users, ArrowUpRight, Film, PartyPopper, Sparkles } from 'lucide-react';
import { useStudio, actions, weightedPipeline, timeline } from '../store.js';
import { Card, Stat, StatusBadge, Progress, Badge, Empty, Avatar } from '../ui.jsx';
import { GroupedBars, HBars } from '../charts.jsx';
import {
  compactInr, inr, fmtDate, fmtRelative, today, rel, addDays, parse, sum, invoiceTotals, invoiceStatus, PHASES, STAGES, taskProgress,
  projectCost, projectEstimate, timeAgo, daysBetween,
} from '../lib.js';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard({ alerts }) {
  const s = useStudio();
  const isCrew = s.settings.role === 'Crew';
  const active = s.projects.filter((p) => p.status === 'Active');
  const t0 = today();

  const money = useMemo(() => {
    const invs = s.invoices.filter((i) => i.kind === 'Invoice');
    const totals = invs.map((i) => ({ i, t: invoiceTotals(i, s.settings), st: invoiceStatus(i, s.settings) }));
    const collected = sum(totals, (x) => x.t.paid);
    const outstanding = sum(totals.filter((x) => x.st !== 'Draft'), (x) => x.t.balance);
    const overdue = totals.filter((x) => x.st === 'Overdue');
    // Last 6 months + next 1 by month
    const months = [];
    const now = new Date();
    for (let k = -5; k <= 1; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key, label: d.toLocaleDateString('en-IN', { month: 'short' }), full: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), future: k > 0,
        invoiced: sum(totals.filter((x) => x.i.issueDate?.startsWith(key)), (x) => x.t.total),
        collected: sum(invs.flatMap((i) => i.payments).filter((p) => p.date?.startsWith(key)), (p) => p.amount),
      });
    }
    return { collected, outstanding, overdue, months, booked: sum(s.projects, (p) => p.fee) };
  }, [s]);

  const upcoming = useMemo(() => timeline(s).filter((x) => x.date >= t0 && x.date <= addDays(t0, 13) && (!isCrew || x.type !== 'Invoice due')), [s, t0, isCrew]);
  const days = Array.from({ length: 10 }, (_, i) => addDays(t0, i));
  const crewOnCall = new Set(upcoming.filter((x) => x.date <= addDays(t0, 6)).flatMap((x) => x.crewIds || [])).size;
  const tasksDue = active.flatMap((p) => p.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= addDays(t0, 7)).map((t) => ({ ...t, project: p })))
    .sort((a, b) => a.due.localeCompare(b.due));
  const next = active.filter((p) => p.startDate >= t0).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const pipeline = STAGES.filter((st) => st !== 'Lost').map((st) => ({ label: st, value: sum(s.leads.filter((l) => l.stage === st), (l) => l.value), sub: `${s.leads.filter((l) => l.stage === st).length}` }));
  const fresh = s.leads.filter((l) => l.fresh);

  return (
    <div className="dash">
      <section className="hero-card">
        <div className="hero-card__text">
          <p className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · Control Room</p>
          <h1>{greeting()}, {s.settings.userName}. <span className="h1-soft">Here’s today’s call sheet.</span></h1>
          <p className="hero-card__lede">
            {next
              ? <><b>{next.name.split('—')[0].trim()}</b> {daysBetween(t0, next.startDate) === 0 ? 'is happening today' : <>is <b>{daysBetween(t0, next.startDate)} days</b> away</>} — {taskProgress(next)}% of its tasks are done.</>
              : 'The slate is clear — a good day to win new work.'}
            {fresh.length > 0 && <> {fresh.length} new {fresh.length > 1 ? 'enquiries are' : 'enquiry is'} waiting in the pipeline.</>}
          </p>
        </div>
        {next && (
          <a className="countdown" href={`#/productions/${next.id}`}>
            <span className="countdown__k">Next on set</span>
            <span className="countdown__n">{Math.max(0, daysBetween(t0, next.startDate))}<small>days</small></span>
            <span className="countdown__name">{next.name.split('—')[0].trim()}</span><span className="countdown__t">{next.kind === 'film' ? <Film size={14} /> : <PartyPopper size={14} />}{fmtDate(next.startDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {next.location}</span>
          </a>
        )}
      </section>

      <div className="stats">
        {!isCrew && <Stat label="Collected" value={compactInr(money.collected)} sub={`of ${compactInr(money.booked)} booked`} icon={Wallet} tone="feature" meter={money.booked ? money.collected / money.booked : 0} />}
        {!isCrew && <Stat label="Weighted pipeline" value={compactInr(weightedPipeline(s.leads))} sub={`${s.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).length} open leads`} icon={Workflow} />}
        {!isCrew && <Stat label="Outstanding" value={compactInr(money.outstanding)} sub={money.overdue.length ? `${money.overdue.length} overdue` : 'Nothing overdue'} icon={IndianRupee} tone={money.overdue.length ? 'warn' : undefined} />}
        <Stat label="Active productions" value={active.length} sub={`${active.filter((p) => p.kind === 'event').length} events · ${active.filter((p) => p.kind === 'film').length} films`} icon={Clapperboard} />
        <Stat label="Crew on call · 7 days" value={crewOnCall} sub={`of ${s.crew.length} in the directory`} icon={Users} />
      </div>

      <Card title="The next ten days" action={<a className="link" href="#/calendar">Open calendar <ArrowUpRight size={14} /></a>} className="strip-card">
        <div className="daystrip">
          {days.map((d) => {
            const items = upcoming.filter((x) => x.date <= d && x.endDate >= d);
            const dt = parse(d);
            return (
              <div key={d} className={d === t0 ? 'daystrip__day is-today' : 'daystrip__day'}>
                <p className="daystrip__date"><span>{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span><b>{dt.getDate()}</b></p>
                <div className="daystrip__items">
                  {items.slice(0, 3).map((x) => (
                    <a key={x.id + d} href={x.projectId ? `#/productions/${x.projectId}` : x.invoiceId ? `#/invoice/${x.invoiceId}` : '#/calendar'} className={`chip chip--${x.type.replace(' ', '-').toLowerCase()}`} title={x.title}>
                      {x.start && <em>{x.start}</em>}{x.title}
                    </a>
                  ))}
                  {items.length > 3 && <span className="muted small">+{items.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid-2">
        {!isCrew && (
          <Card title="Money in" action={<a className="link" href="#/finance">Finance <ArrowUpRight size={14} /></a>}>
            <GroupedBars data={money.months} series={[{ key: 'invoiced', label: 'Invoiced (incl. GST)' }, { key: 'collected', label: 'Collected' }]} />
          </Card>
        )}
        <Card title="Production health" action={<a className="link" href="#/productions">All productions <ArrowUpRight size={14} /></a>} pad={false}>
          {active.length === 0 && <Empty icon={Clapperboard} title="No productions yet.">Win a lead in the pipeline, or create an event or film.</Empty>}
          <ul className="health">
            {active.map((p) => {
              const est = projectEstimate(p), cost = projectCost(p);
              const used = est ? cost / est * 100 : 0;
              return (
                <li key={p.id}>
                  <a href={`#/productions/${p.id}`}>
                    <span className="health__swatch" style={{ background: p.color }} />
                    <span className="health__main">
                      <b>{p.name}</b>
                      <small>{PHASES[p.kind][p.phase]} · {fmtRelative(p.startDate)}</small>
                    </span>
                    <span className="health__meter"><small>Tasks {taskProgress(p)}%</small><Progress value={taskProgress(p)} label="Tasks done" /></span>
                    {!isCrew && <span className="health__meter"><small className={used > 100 ? 'is-over' : ''}>Budget {Math.round(used)}%</small><Progress value={used} tone={used > 100 ? 'red' : used > 85 ? 'saffron' : 'cyan'} label="Budget used" /></span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Due this week" action={<Badge tone="muted">{tasksDue.length}</Badge>} pad={false}>
          {tasksDue.length === 0 ? <Empty icon={Sparkles} title="Nothing due this week." /> : (
            <ul className="tasklist">
              {tasksDue.slice(0, 7).map((t) => (
                <li key={t.id}>
                  <input type="checkbox" checked={t.status === 'done'} aria-label={`Mark ${t.title} done`}
                    onChange={() => actions.patchProject(t.project.id, (p) => { const x = p.tasks.find((y) => y.id === t.id); x.status = 'done'; }, `Done: ${t.title}`)} />
                  <span><b>{t.title}</b><small>{t.project.name.split('—')[0]} · {t.assignee ? s.crew.find((c) => c.id === t.assignee)?.name : 'Unassigned'}</small></span>
                  <em className={t.due < t0 ? 'is-late' : ''}>{fmtRelative(t.due)}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {!isCrew ? (
          <Card title="Pipeline by stage" action={<a className="link" href="#/pipeline">Pipeline <ArrowUpRight size={14} /></a>}>
            <HBars data={pipeline.map((p) => ({ ...p, sub: `${p.sub} lead${p.sub === '1' ? '' : 's'}` }))} />
          </Card>
        ) : (
          <Card title="Your call times">
            <ul className="tasklist">{upcoming.filter((x) => x.type !== 'Deadline').slice(0, 6).map((x) => <li key={x.id}><span><b>{x.title}</b><small>{fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}{x.start ? ` · ${x.start}` : ''}</small></span><StatusBadge status={x.type} /></li>)}</ul>
          </Card>
        )}
        <Card title="Needs attention" action={<Badge tone={alerts.length ? 'saffron' : 'green'}>{alerts.length}</Badge>} pad={false}>
          {alerts.length === 0 ? <Empty icon={Sparkles} title="All clear." >No clashes, no overdue invoices, no overspends.</Empty> : (
            <ul className="alerts">
              {alerts.slice(0, 6).map((a, i) => <li key={i}><a href={`#/${a.go}`}><AlertTriangle size={15} className={`tone-${a.tone}`} /><span>{a.text}</span></a></li>)}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Studio log" pad={false}>
        <ul className="log">
          {s.activity.slice(0, 8).map((a) => <li key={a.id}><i className={`dot dot--${a.kind}`} /><span>{a.text}</span><time>{timeAgo(a.at)}</time></li>)}
        </ul>
      </Card>
    </div>
  );
}
