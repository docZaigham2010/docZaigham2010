import React, { useMemo, useState } from 'react';
import {
  Plus, Film, PartyPopper, MapPin, CalendarDays, Users, LayoutGrid, List, Trash2, Printer, Phone, MessageCircle, ArrowLeft, Camera,
  ListChecks, Wallet, Clock, Package, FileText, Receipt, Aperture, AlertTriangle, Check, GripVertical,
} from 'lucide-react';
import { useStudio, actions, crewClashes, getState } from '../store.js';
import { Button, Badge, Card, Drawer, Empty, Field, Modal, PageHead, Progress, Segmented, StatusBadge, Tabs, useForm, useUI, InlineEdit, Avatar, Stat } from '../ui.jsx';
import {
  PHASES, SERVICES, compactInr, inr, fmtDate, fmtDateLong, fmtRelative, today, sum, taskProgress, projectCost, projectEstimate, crewCost,
  invoiceTotals, invoiceStatus, uid, cx, daysBetween, overlaps, addDays,
} from '../lib.js';
import { navigate } from '../App.jsx';

// ═════════════════════════════ List ═════════════════════════════
export function Productions({ create }) {
  const s = useStudio();
  const [view, setView] = useState('grid');
  const [kind, setKind] = useState('All');
  const [status, setStatus] = useState('Active');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(create || null);
  const client = (id) => s.clients.find((c) => c.id === id);
  const list = s.projects
    .filter((p) => kind === 'All' || p.kind === (kind === 'Events' ? 'event' : 'film'))
    .filter((p) => status === 'All' || p.status === status)
    .filter((p) => !q || `${p.name} ${p.code} ${p.location} ${client(p.clientId)?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  const isCrew = s.settings.role === 'Crew';

  return (
    <div>
      <PageHead eyebrow="Productions" title="Everything in production."
        actions={!isCrew && <><Button icon={PartyPopper} onClick={() => setCreating('event')}>New event</Button><Button variant="primary" icon={Film} onClick={() => setCreating('film')}>New film</Button></>}>
        {s.projects.filter((p) => p.status === 'Active').length} active · {s.projects.filter((p) => p.status === 'Wrapped').length} wrapped
      </PageHead>
      <div className="toolbar">
        <input className="search" placeholder="Search productions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search productions" />
        <Segmented options={['All', 'Events', 'Films']} value={kind} onChange={setKind} label="Type" />
        <Segmented options={['Active', 'On hold', 'Wrapped', 'All']} value={status} onChange={setStatus} label="Status" />
        <span className="spacer" />
        <Segmented options={[{ value: 'grid', label: <LayoutGrid size={15} /> }, { value: 'list', label: <List size={15} /> }]} value={view} onChange={setView} label="View" />
      </div>
      {list.length === 0 && <Empty icon={Film} title="No productions match.">Try another filter — or start something new.</Empty>}
      {view === 'grid' ? (
        <div className="pgrid">
          {list.map((p) => {
            const est = projectEstimate(p), cost = projectCost(p);
            return (
              <a key={p.id} className="pcard" href={`#/productions/${p.id}`} style={{ '--accent': p.color }}>
                <div className="pcard__top">
                  <span className="pcard__kind">{p.kind === 'film' ? <Film size={14} /> : <PartyPopper size={14} />}{p.service}</span>
                  <StatusBadge status={p.status} />
                </div>
                <h3>{p.name}</h3>
                <p className="pcard__client">{client(p.clientId)?.name} · <span className="mono">{p.code}</span></p>
                <ol className="phases" aria-label="Phase">
                  {PHASES[p.kind].map((ph, i) => <li key={ph} className={cx(i < p.phase && 'done', i === p.phase && 'now')} title={ph}><span>{ph}</span></li>)}
                </ol>
                <div className="pcard__meta">
                  <span><CalendarDays size={13} />{fmtDate(p.startDate)}{p.endDate && p.endDate !== p.startDate ? `–${fmtDate(p.endDate)}` : ''}</span>
                  <span><MapPin size={13} />{p.location}</span>
                  <span><Users size={13} />{p.crew.length} crew</span>
                </div>
                <div className="pcard__bars">
                  <span><small>Tasks</small><Progress value={taskProgress(p)} label="Tasks" /></span>
                  {!isCrew && <span><small>Budget</small><Progress value={est ? cost / est * 100 : 0} tone={cost > est ? 'red' : 'saffron'} label="Budget" /></span>}
                </div>
                {!isCrew && <p className="pcard__fee"><b>{compactInr(p.fee)}</b> contract</p>}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Production</th><th>Client</th><th>Phase</th><th>Dates</th><th>Location</th><th>Tasks</th>{!isCrew && <th className="num">Contract</th>}<th>Status</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => navigate(`productions/${p.id}`)} className="is-link">
                  <td><b>{p.name}</b><br /><small className="mono muted">{p.code}</small></td>
                  <td>{client(p.clientId)?.name}</td>
                  <td>{PHASES[p.kind][p.phase]}</td>
                  <td>{fmtDate(p.startDate)}</td>
                  <td>{p.location}</td>
                  <td style={{ minWidth: 100 }}><Progress value={taskProgress(p)} label="Tasks" /></td>
                  {!isCrew && <td className="num">{inr(p.fee)}</td>}
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateProduction kind={creating} onClose={() => { setCreating(null); if (create) navigate('productions'); }} />}
    </div>
  );
}

function CreateProduction({ kind, onClose }) {
  const s = useStudio();
  const { toast } = useUI();
  const services = Object.entries(SERVICES).filter(([, k]) => k === kind).map(([x]) => x);
  const { values: v, bind } = useForm({ kind, name: '', clientId: s.clients[0]?.id || '', newClient: '', service: services[0], startDate: addDays(today(), 21), endDate: '', location: 'Srinagar', fee: '' });
  const submit = () => {
    if (!v.name.trim()) { toast('Name the production first.', 'red'); return; }
    let clientId = v.clientId || null;
    if (clientId === '__new') {
      if (!v.newClient.trim()) { toast('Add the new client’s name.', 'red'); return; }
      actions.saveClient({ name: v.newClient.trim(), company: '', phone: '', email: '', city: v.location, notes: '' });
      clientId = getState().clients.at(-1).id;
    }
    const id = actions.createProject({ kind, name: v.name.trim(), clientId, service: v.service, startDate: v.startDate, endDate: v.endDate || v.startDate, location: v.location, fee: Number(v.fee) || 0 });
    toast(`${kind === 'film' ? 'Film' : 'Event'} created with a starter plan from the template.`, 'green');
    onClose();
    navigate(`productions/${id}`);
  };
  return (
    <Modal open onClose={onClose} title={kind === 'film' ? 'New film production' : 'New event production'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create production</Button></>}>
      <p className="muted small" style={{ marginTop: 0 }}>We’ll start it with the {kind} template: phases, a task list, budget lines {kind === 'film' ? 'and a starter shot list' : 'and a draft run of show'}.</p>
      <div className="form-grid">
        <Field label="Production name" span={2}><input {...bind('name')} placeholder={kind === 'film' ? 'Brand film — “Made by Hand”' : 'The Lakeside Wedding'} autoFocus /></Field>
        <Field label="Client"><select {...bind('clientId')}>{s.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__new">+ New client…</option></select></Field>
        {v.clientId === '__new' ? <Field label="New client name"><input {...bind('newClient')} /></Field> : <Field label="Service"><select {...bind('service')}>{services.map((x) => <option key={x}>{x}</option>)}</select></Field>}
        <Field label={kind === 'film' ? 'Shoot starts' : 'Event date'}><input type="date" {...bind('startDate')} /></Field>
        <Field label={kind === 'film' ? 'Shoot ends' : 'Ends (if multi-day)'}><input type="date" {...bind('endDate')} /></Field>
        <Field label="Location"><input {...bind('location')} /></Field>
        <Field label="Contract value (₹)" hint="Budget lines are estimated at 70% of this — edit them later."><input type="number" min="0" step="1000" {...bind('fee', { number: true })} /></Field>
      </div>
    </Modal>
  );
}

// ═════════════════════════════ Detail ═════════════════════════════
function TitleEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  if (!editing) return <h1><button className="title-btn" onClick={() => setEditing(true)} title="Rename">{value}</button></h1>;
  return <h1><input className="inline-edit title-edit" defaultValue={value} autoFocus aria-label="Production name"
    onBlur={(e) => { setEditing(false); const v = e.target.value.trim(); if (v && v !== value) onSave(v); }}
    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = value; e.currentTarget.blur(); } }} /></h1>;
}

export function ProductionDetail({ id, tab }) {
  const s = useStudio();
  const { confirm } = useUI();
  const p = s.projects.find((x) => x.id === id);
  if (!p) return <Empty icon={Film} title="This production doesn’t exist (any more)." action={<a className="btn" href="#/productions">Back to productions</a>} />;
  const client = s.clients.find((c) => c.id === p.clientId);
  const isCrew = s.settings.role === 'Crew';
  const invoices = s.invoices.filter((i) => i.projectId === p.id);
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Aperture },
    { id: 'tasks', label: 'Tasks', icon: ListChecks, count: p.tasks.filter((t) => t.status !== 'done').length },
    !isCrew && { id: 'budget', label: 'Budget', icon: Wallet },
    p.kind === 'event' ? { id: 'show', label: 'Run of show', icon: Clock } : { id: 'shots', label: 'Shot list', icon: Camera, count: p.shots.length },
    { id: 'crew', label: 'Crew', icon: Users, count: p.crew.length },
    { id: 'gear', label: 'Gear', icon: Package },
    { id: 'deliverables', label: 'Deliverables', icon: FileText },
    { id: 'callsheet', label: 'Call sheet', icon: Printer },
    !isCrew && { id: 'money', label: 'Money', icon: Receipt, count: invoices.length },
  ].filter(Boolean);
  const patch = (fn, log) => actions.patchProject(p.id, fn, log);

  return (
    <div className="pdetail" style={{ '--accent': p.color }}>
      <a className="back" href="#/productions"><ArrowLeft size={15} /> Productions</a>
      <header className="pdetail__head">
        <div>
          <p className="eyebrow">{p.kind === 'film' ? <Film size={13} /> : <PartyPopper size={13} />} {p.service} · <span className="mono">{p.code}</span></p>
          <TitleEdit value={p.name} onSave={(v) => patch((x) => { x.name = v; })} />
          <p className="pdetail__sub">{client?.name || 'No client'} · {p.location} · {fmtDateLong(p.startDate)}{p.endDate && p.endDate !== p.startDate ? ` → ${fmtDateLong(p.endDate)}` : ''}</p>
        </div>
        <div className="pdetail__actions">
          <select value={p.status} onChange={(e) => patch((x) => { x.status = e.target.value; }, `${p.name} marked ${e.target.value}`)} aria-label="Status" className="select-sm">
            {['Active', 'On hold', 'Wrapped'].map((x) => <option key={x}>{x}</option>)}
          </select>
          {!isCrew && <Button variant="ghost" icon={Trash2} aria-label="Delete production" onClick={async () => { if (await confirm({ title: 'Delete this production?', text: 'Tasks, budget, schedule and gear bookings for it will be removed. Invoices stay in Finance.', danger: true, ok: 'Delete' })) { actions.deleteProject(p.id); navigate('productions'); } }} />}
        </div>
      </header>
      <ol className="phases phases--big" aria-label="Production phase">
        {PHASES[p.kind].map((ph, i) => (
          <li key={ph} className={cx(i < p.phase && 'done', i === p.phase && 'now')}>
            <button onClick={() => patch((x) => { x.phase = i; }, `${p.name} moved to ${ph}`)} aria-current={i === p.phase ? 'step' : undefined}>
              <i>{i < p.phase ? <Check size={12} /> : i + 1}</i><span>{ph}</span>
            </button>
          </li>
        ))}
      </ol>
      <Tabs tabs={tabs} value={tab} onChange={(t) => navigate(`productions/${p.id}/${t}`)} />
      <div className="pdetail__body">
        {tab === 'overview' && <Overview p={p} patch={patch} isCrew={isCrew} />}
        {tab === 'tasks' && <Tasks p={p} patch={patch} />}
        {tab === 'budget' && !isCrew && <Budget p={p} patch={patch} />}
        {tab === 'show' && <RunOfShow p={p} patch={patch} />}
        {tab === 'shots' && <ShotList p={p} patch={patch} />}
        {tab === 'crew' && <CrewTab p={p} patch={patch} isCrew={isCrew} />}
        {tab === 'gear' && <GearTab p={p} />}
        {tab === 'deliverables' && <Deliverables p={p} patch={patch} />}
        {tab === 'callsheet' && <CallSheet p={p} />}
        {tab === 'money' && !isCrew && <Money p={p} invoices={invoices} />}
      </div>
    </div>
  );
}

function Overview({ p, patch, isCrew }) {
  const s = useStudio();
  const est = projectEstimate(p), cost = projectCost(p);
  const paid = sum(s.invoices.filter((i) => i.projectId === p.id), (i) => invoiceTotals(i, s.settings).paid);
  const margin = p.fee - Math.max(est, cost);
  return (
    <div className="grid-2 grid-2--wide">
      <Card title="The brief">
        <textarea className="brief" defaultValue={p.brief} placeholder="What is this production about? What should people feel?" onBlur={(e) => e.target.value !== p.brief && patch((x) => { x.brief = e.target.value; })} rows={6} aria-label="Brief" />
        <div className="form-grid form-grid--tight">
          <Field label={p.kind === 'film' ? 'Shoot starts' : 'Event starts'}><input type="date" value={p.startDate || ''} onChange={(e) => patch((x) => { x.startDate = e.target.value; if (!x.endDate || x.endDate < e.target.value) x.endDate = e.target.value; })} /></Field>
          <Field label="Ends"><input type="date" value={p.endDate || ''} min={p.startDate} onChange={(e) => patch((x) => { x.endDate = e.target.value; })} /></Field>
          <Field label="Location"><InlineEdit value={p.location} onSave={(v) => patch((x) => { x.location = v; })} ariaLabel="Location" /></Field>
          <Field label="Venue / set"><InlineEdit value={p.venue} onSave={(v) => patch((x) => { x.venue = v; })} ariaLabel="Venue" placeholder="Add venue" /></Field>
          {p.kind === 'event' && <Field label="Guests"><InlineEdit type="number" value={p.guests || ''} onSave={(v) => patch((x) => { x.guests = v; })} ariaLabel="Guests" /></Field>}
          {!isCrew && <Field label="Contract value (₹)"><InlineEdit type="number" value={p.fee} onSave={(v) => patch((x) => { x.fee = v; })} ariaLabel="Contract value" format={inr} /></Field>}
        </div>
        <Field label="Private notes"><textarea defaultValue={p.notes} rows={3} onBlur={(e) => e.target.value !== p.notes && patch((x) => { x.notes = e.target.value; })} placeholder="Things the team should know — not for the client." /></Field>
      </Card>
      <div className="stack">
        <div className="stats stats--2">
          <Stat label="Tasks done" value={`${taskProgress(p)}%`} sub={`${p.tasks.filter((t) => t.status === 'done').length} of ${p.tasks.length}`} />
          <Stat label="Countdown" value={daysBetween(today(), p.startDate) >= 0 ? `${daysBetween(today(), p.startDate)}d` : 'Done'} sub={fmtRelative(p.startDate)} />
          {!isCrew && <Stat label="Budget used" value={est ? `${Math.round(cost / est * 100)}%` : '—'} sub={`${compactInr(cost)} of ${compactInr(est)}`} tone={cost > est ? 'warn' : undefined} />}
          {!isCrew && <Stat label="Projected margin" value={compactInr(margin)} sub={p.fee ? `${Math.round(margin / p.fee * 100)}% · ${compactInr(paid)} collected` : 'Set a contract value'} tone={margin < 0 ? 'warn' : undefined} />}
        </div>
        <Card title="Team on this production" action={<a className="link" href={`#/productions/${p.id}/crew`}>Manage</a>}>
          {p.crew.length === 0 ? <p className="muted small">No one assigned yet.</p> : (
            <ul className="people">{p.crew.map((c) => { const m = s.crew.find((x) => x.id === c.crewId); return m && <li key={c.crewId}><Avatar name={m.name} size={30} /><span><b>{m.name}</b><small>{c.role}</small></span><em className="mono">{c.call}</em></li>; })}</ul>
          )}
        </Card>
        <Card title="Next up">
          <ul className="tasklist">{p.tasks.filter((t) => t.status !== 'done').slice(0, 5).map((t) => <li key={t.id}><input type="checkbox" onChange={() => patch((x) => { x.tasks.find((y) => y.id === t.id).status = 'done'; }, `Done: ${t.title}`)} aria-label={`Complete ${t.title}`} /><span><b>{t.title}</b><small>{t.assignee ? s.crew.find((c) => c.id === t.assignee)?.name : 'Unassigned'}</small></span><em>{t.due ? fmtRelative(t.due) : ''}</em></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}

function Tasks({ p, patch }) {
  const s = useStudio();
  const [title, setTitle] = useState('');
  const [drag, setDrag] = useState(null);
  const cols = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
  const add = (e) => { e.preventDefault(); if (!title.trim()) return; patch((x) => { x.tasks.push({ id: uid(), title: title.trim(), status: 'todo', due: null, assignee: null }); }); setTitle(''); };
  return (
    <div>
      <form className="addrow" onSubmit={add}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter…" aria-label="New task" /><Button variant="primary" icon={Plus} type="submit">Add</Button></form>
      <div className="kanban kanban--tasks" style={{ '--cols': 3 }}>
        {cols.map(([st, label]) => (
          <section key={st} className="kanban__col" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) patch((x) => { x.tasks.find((t) => t.id === drag).status = st; }); setDrag(null); }}>
            <header className="kanban__head"><StatusBadge status={label} /><span className="muted small">{p.tasks.filter((t) => t.status === st).length}</span></header>
            <div className="kanban__list">
              {p.tasks.filter((t) => t.status === st).map((t) => (
                <article key={t.id} className={cx('task', t.status === 'done' && 'is-done')} draggable onDragStart={() => setDrag(t.id)}>
                  <div className="task__row">
                    <GripVertical size={14} className="muted grip" />
                    <InlineEdit value={t.title} onSave={(v) => patch((x) => { x.tasks.find((y) => y.id === t.id).title = v; })} ariaLabel="Task title" />
                    <button className="icon-x" aria-label="Delete task" onClick={() => patch((x) => { x.tasks = x.tasks.filter((y) => y.id !== t.id); })}>×</button>
                  </div>
                  <div className="task__meta">
                    <select value={t.assignee || ''} onChange={(e) => patch((x) => { x.tasks.find((y) => y.id === t.id).assignee = e.target.value || null; })} aria-label="Assignee">
                      <option value="">Unassigned</option>{s.crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="date" value={t.due || ''} onChange={(e) => patch((x) => { x.tasks.find((y) => y.id === t.id).due = e.target.value || null; })} aria-label="Due date" className={t.due && t.due < today() && t.status !== 'done' ? 'is-late' : ''} />
                    <select value={t.status} onChange={(e) => patch((x) => { x.tasks.find((y) => y.id === t.id).status = e.target.value; })} aria-label="Status" className="task__status">
                      {cols.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Budget({ p, patch }) {
  const est = projectEstimate(p), cost = projectCost(p);
  const cats = [...new Set(p.budget.map((b) => b.category))];
  const set = (id, k, v) => patch((x) => { x.budget.find((b) => b.id === id)[k] = v; });
  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Contract value" value={inr(p.fee)} />
        <Stat label="Estimated cost" value={inr(est)} sub={p.fee ? `${Math.round(est / p.fee * 100)}% of contract` : ''} />
        <Stat label="Spent so far" value={inr(cost)} sub={est ? `${Math.round(cost / est * 100)}% of estimate` : ''} tone={cost > est ? 'warn' : undefined} />
        <Stat label="Projected margin" value={inr(p.fee - Math.max(est, cost))} sub={p.fee ? `${Math.round((p.fee - Math.max(est, cost)) / p.fee * 100)}%` : ''} tone={p.fee - Math.max(est, cost) < 0 ? 'warn' : undefined} />
      </div>
      <div className="table-wrap">
        <table className="table table--edit">
          <thead><tr><th>Category</th><th>Line item</th><th>Vendor</th><th className="num">Estimate</th><th className="num">Actual</th><th className="num">Variance</th><th /></tr></thead>
          <tbody>
            {cats.map((c) => p.budget.filter((b) => b.category === c).map((b, i) => {
              const v = b.estimate - b.actual;
              return (
                <tr key={b.id}>
                  <td>{i === 0 ? <b>{c}</b> : ''}</td>
                  <td><InlineEdit value={b.item} onSave={(val) => set(b.id, 'item', val)} ariaLabel="Line item" /></td>
                  <td><InlineEdit value={b.vendor} onSave={(val) => set(b.id, 'vendor', val)} ariaLabel="Vendor" placeholder="—" /></td>
                  <td className="num"><InlineEdit type="number" value={b.estimate} onSave={(val) => set(b.id, 'estimate', val)} ariaLabel="Estimate" format={inr} /></td>
                  <td className="num"><InlineEdit type="number" value={b.actual} onSave={(val) => set(b.id, 'actual', val)} ariaLabel="Actual" format={inr} /></td>
                  <td className={cx('num', v < 0 && 'tone-red')}>{v < 0 ? <><AlertTriangle size={12} /> {inr(v)}</> : inr(v)}</td>
                  <td><button className="icon-x" aria-label="Remove line" onClick={() => patch((x) => { x.budget = x.budget.filter((y) => y.id !== b.id); })}>×</button></td>
                </tr>
              );
            }))}
          </tbody>
          <tfoot><tr><td colSpan={3}><b>Total</b></td><td className="num"><b>{inr(est)}</b></td><td className="num"><b>{inr(cost)}</b></td><td className={cx('num', est - cost < 0 && 'tone-red')}><b>{inr(est - cost)}</b></td><td /></tr></tfoot>
        </table>
      </div>
      <div className="row">
        <Button icon={Plus} onClick={() => patch((x) => { x.budget.push({ id: uid(), category: 'Other', item: 'New line', estimate: 0, actual: 0, vendor: '' }); })}>Add line</Button>
        <select className="select-sm" aria-label="Add line in category" value="" onChange={(e) => e.target.value && patch((x) => { x.budget.push({ id: uid(), category: e.target.value, item: 'New line', estimate: 0, actual: 0, vendor: '' }); })}>
          <option value="">Add to category…</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="muted small">Crew booked on this production: {inr(crewCost(p))} planned (from Crew tab).</span>
      </div>
    </div>
  );
}

function RunOfShow({ p, patch }) {
  const s = useStudio();
  const rows = [...p.schedule].sort((a, b) => a.time.localeCompare(b.time));
  const set = (id, k, v) => patch((x) => { x.schedule.find((r) => r.id === id)[k] = v; });
  return (
    <Card title={`Run of show · ${fmtDateLong(p.startDate)}`} action={<Button size="sm" icon={Plus} onClick={() => patch((x) => { x.schedule.push({ id: uid(), time: '12:00', title: 'New cue', owner: null, note: '' }); })}>Add cue</Button>}>
      {rows.length === 0 ? <Empty icon={Clock} title="No cues yet." >Build the night minute by minute.</Empty> : (
        <ol className="ros">
          {rows.map((r) => (
            <li key={r.id}>
              <input type="time" value={r.time} onChange={(e) => set(r.id, 'time', e.target.value)} aria-label="Time" className="ros__time" />
              <div className="ros__body">
                <InlineEdit value={r.title} onSave={(v) => set(r.id, 'title', v)} ariaLabel="Cue" className="ros__title" />
                <InlineEdit value={r.note} onSave={(v) => set(r.id, 'note', v)} ariaLabel="Note" placeholder="Add a note for the team" className="ros__note" />
              </div>
              <select value={r.owner || ''} onChange={(e) => set(r.id, 'owner', e.target.value || null)} aria-label="Owner" className="select-sm">
                <option value="">Owner…</option>{s.crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="icon-x" aria-label="Remove cue" onClick={() => patch((x) => { x.schedule = x.schedule.filter((y) => y.id !== r.id); })}>×</button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function ShotList({ p, patch }) {
  const set = (id, k, v) => patch((x) => { x.shots.find((r) => r.id === id)[k] = v; });
  const shot = p.shots.filter((x) => x.status === 'Shot').length;
  return (
    <Card title={`Shot list · ${shot}/${p.shots.length} in the can`} action={<Button size="sm" icon={Plus} onClick={() => patch((x) => { const last = x.shots[x.shots.length - 1]; x.shots.push({ id: uid(), scene: last?.scene || '1', shot: '', desc: 'New shot', type: 'MS', lens: '35mm', status: 'Planned' }); })}>Add shot</Button>} pad={false}>
      <div className="table-wrap">
        <table className="table table--edit">
          <thead><tr><th>Sc.</th><th>Shot</th><th>Description</th><th>Size / move</th><th>Lens</th><th>Status</th><th /></tr></thead>
          <tbody>
            {p.shots.map((r) => (
              <tr key={r.id} className={r.status === 'Shot' ? 'is-done' : ''}>
                <td style={{ width: 56 }}><InlineEdit value={r.scene} onSave={(v) => set(r.id, 'scene', v)} ariaLabel="Scene" /></td>
                <td style={{ width: 64 }}><InlineEdit value={r.shot} onSave={(v) => set(r.id, 'shot', v)} ariaLabel="Shot" /></td>
                <td><InlineEdit value={r.desc} onSave={(v) => set(r.id, 'desc', v)} ariaLabel="Description" /></td>
                <td style={{ width: 120 }}><select value={r.type} onChange={(e) => set(r.id, 'type', e.target.value)} aria-label="Shot size">{['ECU', 'CU', 'MS', 'WS', 'EWS', 'Gimbal', 'Drone', 'Dolly', 'Handheld', 'Insert'].map((x) => <option key={x}>{x}</option>)}</select></td>
                <td style={{ width: 110 }}><InlineEdit value={r.lens} onSave={(v) => set(r.id, 'lens', v)} ariaLabel="Lens" /></td>
                <td style={{ width: 120 }}><select value={r.status} onChange={(e) => set(r.id, 'status', e.target.value)} aria-label="Status">{['Planned', 'Shot', 'Pick-up'].map((x) => <option key={x}>{x}</option>)}</select></td>
                <td><button className="icon-x" aria-label="Remove shot" onClick={() => patch((x) => { x.shots = x.shots.filter((y) => y.id !== r.id); })}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CrewTab({ p, patch, isCrew }) {
  const s = useStudio();
  const [pick, setPick] = useState('');
  const clashes = crewClashes(s).filter((c) => c.a.projectId === p.id || c.b.projectId === p.id);
  const add = () => {
    const m = s.crew.find((c) => c.id === pick);
    if (!m) return;
    patch((x) => { x.crew.push({ crewId: m.id, role: m.role, rate: m.dayRate, days: Math.max(1, daysBetween(x.startDate, x.endDate || x.startDate) + 1), call: '08:00' }); }, `${m.name} booked on ${p.name}`);
    setPick('');
  };
  const set = (crewId, k, v) => patch((x) => { x.crew.find((c) => c.crewId === crewId)[k] = v; });
  return (
    <div className="stack">
      {clashes.length > 0 && (
        <div className="notice notice--warn"><AlertTriangle size={16} /><div>{clashes.map((c, i) => { const other = c.a.projectId === p.id ? c.b : c.a; return <p key={i}><b>{s.crew.find((x) => x.id === c.crewId)?.name}</b> is also booked on <b>{other.title}</b> ({fmtDate(other.date)}).</p>; })}</div></div>
      )}
      {!isCrew && (
        <div className="addrow">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Choose crew or vendor">
            <option value="">Add crew or vendor…</option>
            {s.crew.filter((c) => !p.crew.some((x) => x.crewId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
          </select>
          <Button variant="primary" icon={Plus} onClick={add} disabled={!pick}>Book</Button>
        </div>
      )}
      <div className="table-wrap">
        <table className="table table--edit">
          <thead><tr><th>Name</th><th>Role on this production</th><th>Call time</th>{!isCrew && <><th className="num">Day rate</th><th className="num">Days</th><th className="num">Cost</th></>}<th>Contact</th><th /></tr></thead>
          <tbody>
            {p.crew.map((c) => {
              const m = s.crew.find((x) => x.id === c.crewId);
              if (!m) return null;
              const wa = m.phone.replace(/[^\d]/g, '');
              return (
                <tr key={c.crewId}>
                  <td><span className="cellperson"><Avatar name={m.name} size={28} /><span><b>{m.name}</b><small>{m.type} · {m.dept}</small></span></span></td>
                  <td><InlineEdit value={c.role} onSave={(v) => set(c.crewId, 'role', v)} ariaLabel="Role" /></td>
                  <td style={{ width: 110 }}><input type="time" value={/^\d\d:\d\d$/.test(c.call) ? c.call : ''} onChange={(e) => set(c.crewId, 'call', e.target.value)} aria-label="Call time" /></td>
                  {!isCrew && <>
                    <td className="num" style={{ width: 110 }}><InlineEdit type="number" value={c.rate} onSave={(v) => set(c.crewId, 'rate', v)} ariaLabel="Day rate" format={inr} /></td>
                    <td className="num" style={{ width: 70 }}><InlineEdit type="number" value={c.days} onSave={(v) => set(c.crewId, 'days', v)} ariaLabel="Days" /></td>
                    <td className="num">{inr(c.rate * c.days)}</td>
                  </>}
                  <td><span className="row row--tight"><a className="btn btn--ghost btn--icon btn--sm" href={`tel:${m.phone}`} aria-label={`Call ${m.name}`}><Phone size={14} /></a><a className="btn btn--ghost btn--icon btn--sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${m.name}`}><MessageCircle size={14} /></a></span></td>
                  <td>{!isCrew && <button className="icon-x" aria-label="Remove from production" onClick={() => patch((x) => { x.crew = x.crew.filter((y) => y.crewId !== c.crewId); })}>×</button>}</td>
                </tr>
              );
            })}
          </tbody>
          {!isCrew && <tfoot><tr><td colSpan={5}><b>Planned crew & vendor cost</b></td><td className="num"><b>{inr(crewCost(p))}</b></td><td colSpan={2} /></tr></tfoot>}
        </table>
      </div>
      {p.crew.length === 0 && <Empty icon={Users} title="Nobody’s on this one yet." />}
    </div>
  );
}

function GearTab({ p }) {
  const s = useStudio();
  const { toast } = useUI();
  const booked = s.gear.flatMap((g) => g.bookings.filter((b) => b.projectId === p.id).map((b) => ({ g, b })));
  const from = p.startDate, to = p.endDate || p.startDate;
  const available = s.gear.filter((g) => !booked.some((x) => x.g.id === g.id));
  const book = (g) => {
    const clash = g.bookings.find((b) => overlaps(from, to, b.from, b.to));
    if (g.status === 'Maintenance') { toast(`${g.name} is in maintenance.`, 'red'); return; }
    if (clash) { toast(`${g.name} is already booked on ${s.projects.find((x) => x.id === clash.projectId)?.name || 'another production'} for those dates.`, 'red'); return; }
    actions.bookGear(g.id, { projectId: p.id, from, to });
    toast(`${g.name} booked ${fmtDate(from)}–${fmtDate(to)}`, 'green');
  };
  return (
    <div className="grid-2">
      <Card title={`Booked for ${fmtDate(from)}–${fmtDate(to)}`} pad={false}>
        {booked.length === 0 ? <Empty icon={Package} title="No kit booked yet." /> : (
          <ul className="gearlist">{booked.map(({ g, b }) => <li key={b.id}><span><b>{g.name}</b><small>{g.category} · {g.serial}</small></span><button className="btn btn--ghost btn--sm" onClick={() => actions.unbookGear(g.id, b.id)}>Release</button></li>)}</ul>
        )}
      </Card>
      <Card title="Gear room" pad={false}>
        <ul className="gearlist">
          {available.map((g) => {
            const clash = g.bookings.find((b) => overlaps(from, to, b.from, b.to));
            return (
              <li key={g.id} className={clash || g.status === 'Maintenance' ? 'is-off' : ''}>
                <span><b>{g.name}</b><small>{g.category} · {g.status === 'Maintenance' ? 'In maintenance' : clash ? `Out on ${s.projects.find((x) => x.id === clash.projectId)?.code}` : 'Free for these dates'}</small></span>
                <button className="btn btn--sm" onClick={() => book(g)} disabled={!!clash || g.status === 'Maintenance'}>Book</button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Deliverables({ p, patch }) {
  const set = (id, k, v) => patch((x) => { x.deliverables.find((d) => d.id === id)[k] = v; });
  return (
    <Card title="Deliverables" action={<Button size="sm" icon={Plus} onClick={() => patch((x) => { x.deliverables.push({ id: uid(), title: 'New deliverable', due: p.endDate || p.startDate, status: 'Not started' }); })}>Add</Button>} pad={false}>
      {p.deliverables.length === 0 ? <Empty icon={FileText} title="What does the client walk away with?">Films, run-of-show documents, photo galleries, reports…</Empty> : (
        <div className="table-wrap"><table className="table table--edit">
          <thead><tr><th>Deliverable</th><th>Due</th><th>Status</th><th /></tr></thead>
          <tbody>{p.deliverables.map((d) => (
            <tr key={d.id}>
              <td><InlineEdit value={d.title} onSave={(v) => set(d.id, 'title', v)} ariaLabel="Deliverable" /></td>
              <td style={{ width: 160 }}><input type="date" value={d.due || ''} onChange={(e) => set(d.id, 'due', e.target.value)} aria-label="Due" /></td>
              <td style={{ width: 160 }}><select value={d.status} onChange={(e) => set(d.id, 'status', e.target.value)} aria-label="Status">{['Not started', 'In progress', 'In review', 'Delivered'].map((x) => <option key={x}>{x}</option>)}</select></td>
              <td><button className="icon-x" aria-label="Remove" onClick={() => patch((x) => { x.deliverables = x.deliverables.filter((y) => y.id !== d.id); })}>×</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  );
}

function CallSheet({ p }) {
  const s = useStudio();
  const client = s.clients.find((c) => c.id === p.clientId);
  const lead = p.crew.map((c) => s.crew.find((x) => x.id === c.crewId)).find((m) => m?.dept === 'Production');
  const earliest = [...p.crew].map((c) => c.call).filter((c) => /^\d\d:\d\d$/.test(c)).sort()[0];
  return (
    <div>
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print / save as PDF</Button>
        <span className="muted small">Generated live from this production’s crew, schedule and location.</span>
      </div>
      <article className="sheet print-area">
        <header className="sheet__head">
          <div className="sheet__brand"><img src="media/ap-logo.jpeg" alt="" width="48" height="48" /><div><b>{s.settings.company.toUpperCase()}</b><small>{s.settings.tagline}</small></div></div>
          <div className="sheet__title"><p>CALL SHEET</p><h2>{p.name}</h2><span>{p.code}</span></div>
        </header>
        <div className="sheet__grid">
          <div><span>Date</span><b>{fmtDateLong(p.startDate)}{p.endDate && p.endDate !== p.startDate ? ` → ${fmtDateLong(p.endDate)}` : ''}</b></div>
          <div><span>General call</span><b>{earliest || 'TBC'}</b></div>
          <div><span>Location</span><b>{p.location}</b>{p.venue && <small>{p.venue}</small>}</div>
          <div><span>Client</span><b>{client?.name || '—'}</b></div>
          <div><span>Production contact</span><b>{lead ? `${lead.name} · ${lead.phone}` : s.settings.phone}</b></div>
          <div><span>Studio</span><b>{s.settings.phone}</b><small>{s.settings.address}</small></div>
        </div>
        {p.kind === 'event' && p.schedule.length > 0 && (
          <section><h3>Run of show</h3><table><tbody>{[...p.schedule].sort((a, b) => a.time.localeCompare(b.time)).map((r) => <tr key={r.id}><td className="mono">{r.time}</td><td>{r.title}{r.note && <small> — {r.note}</small>}</td><td>{s.crew.find((c) => c.id === r.owner)?.name || ''}</td></tr>)}</tbody></table></section>
        )}
        {p.kind === 'film' && p.shots.length > 0 && (
          <section><h3>Shots</h3><table><tbody>{p.shots.map((r) => <tr key={r.id}><td className="mono">{r.scene}/{r.shot}</td><td>{r.desc}</td><td>{r.type} · {r.lens}</td></tr>)}</tbody></table></section>
        )}
        <section><h3>Crew & vendors</h3><table><thead><tr><th>Call</th><th>Name</th><th>Role</th><th>Phone</th></tr></thead><tbody>{[...p.crew].sort((a, b) => String(a.call).localeCompare(String(b.call))).map((c) => { const m = s.crew.find((x) => x.id === c.crewId); return m && <tr key={c.crewId}><td className="mono">{c.call}</td><td>{m.name}</td><td>{c.role}</td><td className="mono">{m.phone}</td></tr>; })}</tbody></table></section>
        {p.notes && <section><h3>Notes</h3><p>{p.notes}</p></section>}
        <footer className="sheet__foot">Emergency: 112 · Please be on location 15 minutes before your call time. · Generated by Studio OS</footer>
      </article>
    </div>
  );
}

function Money({ p, invoices }) {
  const s = useStudio();
  const totals = invoices.filter((i) => i.kind === 'Invoice').map((i) => invoiceTotals(i, s.settings));
  const invoiced = sum(totals, (t) => t.subtotal), paid = sum(totals, (t) => t.paid);
  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Contract (ex-GST)" value={inr(p.fee)} />
        <Stat label="Invoiced (ex-GST)" value={inr(invoiced)} sub={p.fee ? `${Math.round(invoiced / p.fee * 100)}% of contract` : ''} />
        <Stat label="Collected (incl. GST)" value={inr(paid)} />
        <Stat label="Left to invoice" value={inr(Math.max(0, p.fee - invoiced))} />
      </div>
      <Card title="Invoices" action={<a className="btn btn--primary btn--sm" href={`#/finance/new?project=${p.id}`}><Plus size={14} /> New invoice</a>} pad={false}>
        {invoices.length === 0 ? <Empty icon={Receipt} title="Nothing invoiced yet." /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Number</th><th>Issued</th><th>Due</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th></tr></thead>
            <tbody>{invoices.map((i) => { const t = invoiceTotals(i, s.settings); return <tr key={i.id} className="is-link" onClick={() => navigate(`invoice/${i.id}`)}><td className="mono">{i.number}</td><td>{fmtDate(i.issueDate)}</td><td>{fmtDate(i.dueDate)}</td><td className="num">{inr(t.total)}</td><td className="num">{inr(t.balance)}</td><td><StatusBadge status={invoiceStatus(i, s.settings)} /></td></tr>; })}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
