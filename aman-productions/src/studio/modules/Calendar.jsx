import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { useStudio, actions, timeline, crewClashes } from '../store.js';
import { Button, Card, Field, Modal, PageHead, StatusBadge, useForm, useUI, Segmented, Avatar } from '../ui.jsx';
import { iso, today, parse, fmtDateLong, ENTRY_TYPES, cx, addDays } from '../lib.js';

export default function Calendar({ create }) {
  const s = useStudio();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today());
  const [editing, setEditing] = useState(create ? { title: '', type: 'Meeting', date: today(), start: '10:00', end: '11:00', projectId: '', crewIds: [] } : null);
  const [types, setTypes] = useState('All');
  const isCrew = s.settings.role === 'Crew';

  const items = useMemo(() => timeline(s).filter((x) => (!isCrew || x.type !== 'Invoice due') && (types === 'All' || (types === 'Production' ? ['Event', 'Shoot'].includes(x.type) : types === 'Deadlines' ? ['Deadline', 'Invoice due'].includes(x.type) : ['Meeting', 'Recce', 'Other'].includes(x.type)))), [s, types, isCrew]);
  const clashes = crewClashes(s);
  const clashDays = new Set(clashes.flatMap((c) => [c.a.date, c.b.date]));

  // 6-week grid starting Monday
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(first.getDate() - offset);
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d); });
  const on = (d) => items.filter((x) => x.date <= d && x.endDate >= d);
  const month = cursor.getMonth();
  const dayItems = on(selected);

  return (
    <div>
      <PageHead eyebrow="Calendar" title={cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        actions={<>
          <Button icon={ChevronLeft} aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} />
          <Button onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(today()); }}>Today</Button>
          <Button icon={ChevronRight} aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} />
          <Button variant="primary" icon={Plus} onClick={() => setEditing({ title: '', type: 'Meeting', date: selected, start: '10:00', end: '11:00', projectId: '', crewIds: [] })}>Schedule</Button>
        </>}>
        Productions, recces, meetings, deadlines{!isCrew && ' and invoice due dates'} — in one place.
      </PageHead>
      <div className="toolbar">
        <Segmented options={['All', 'Production', 'Meetings & recces', 'Deadlines']} value={types} onChange={setTypes} label="Show" />
        {clashes.length > 0 && <span className="pill pill--warn"><AlertTriangle size={14} /> {clashes.length} crew clash{clashes.length > 1 ? 'es' : ''}</span>}
      </div>
      <div className="cal-layout">
        <div className="cal" role="grid" aria-label="Month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="cal__dow" role="columnheader">{d}</div>)}
          {cells.map((d) => {
            const list = on(d);
            const dt = parse(d);
            return (
              <button key={d} role="gridcell" className={cx('cal__cell', dt.getMonth() !== month && 'is-out', d === today() && 'is-today', d === selected && 'is-sel', clashDays.has(d) && 'is-clash')}
                onClick={() => setSelected(d)} onDoubleClick={() => setEditing({ title: '', type: 'Meeting', date: d, start: '10:00', end: '11:00', projectId: '', crewIds: [] })} aria-label={`${fmtDateLong(d)}, ${list.length} items`}>
                <span className="cal__num">{dt.getDate()}</span>
                <span className="cal__items">
                  {list.slice(0, 3).map((x) => <span key={x.id} className={`chip chip--${x.type.replace(' ', '-').toLowerCase()}`}>{x.start && <em>{x.start}</em>}{x.title}</span>)}
                  {list.length > 3 && <span className="cal__more">+{list.length - 3}</span>}
                </span>
                {list.length > 0 && <span className="cal__dots">{list.slice(0, 4).map((x) => <i key={x.id} className={`dot dot--${x.type.replace(' ', '-').toLowerCase()}`} />)}</span>}
              </button>
            );
          })}
        </div>
        <Card title={fmtDateLong(selected)} className="cal-day" action={<Button size="sm" icon={Plus} onClick={() => setEditing({ title: '', type: 'Meeting', date: selected, start: '10:00', end: '11:00', projectId: '', crewIds: [] })}>Add</Button>}>
          {dayItems.length === 0 ? <p className="muted small">Nothing scheduled. A rare quiet day.</p> : (
            <ul className="agenda">
              {dayItems.map((x) => {
                const clash = clashes.filter((c) => c.a.id === x.id || c.b.id === x.id);
                return (
                  <li key={x.id}>
                    <span className="agenda__time mono">{x.start || 'All day'}{x.end && `–${x.end}`}</span>
                    <div>
                      <StatusBadge status={x.type} />
                      <p className="agenda__title">
                        {x.projectId && !x.entryId ? <a href={`#/productions/${x.projectId}`}>{x.title}</a> : x.invoiceId ? <a href={`#/invoice/${x.invoiceId}`}>{x.title}</a> : x.title}
                      </p>
                      {x.projectId && x.entryId && <p className="muted small">{s.projects.find((p) => p.id === x.projectId)?.name}</p>}
                      {x.crewIds?.length > 0 && <span className="agenda__crew">{x.crewIds.map((id) => { const m = s.crew.find((c) => c.id === id); return m && <span key={id} title={m.name}><Avatar name={m.name} size={22} /></span>; })}</span>}
                      {clash.length > 0 && <p className="tone-saffron small"><AlertTriangle size={12} /> {clash.map((c) => s.crew.find((m) => m.id === c.crewId)?.name).join(', ')} double-booked</p>}
                      {x.entryId && <button className="link small" onClick={() => setEditing(s.entries.find((e) => e.id === x.entryId))}>Edit</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      {editing && <EntryModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EntryModal({ entry, onClose }) {
  const s = useStudio();
  const { toast } = useUI();
  const { values: v, bind, set } = useForm({ ...entry, projectId: entry.projectId || '' });
  const toggle = (id) => set('crewIds', v.crewIds.includes(id) ? v.crewIds.filter((x) => x !== id) : [...v.crewIds, id]);
  const save = () => {
    if (!v.title.trim()) { toast('Give it a title.', 'red'); return; }
    if (v.end && v.start && v.end <= v.start) { toast('End time should be after the start.', 'red'); return; }
    actions.saveEntry({ ...v, projectId: v.projectId || null });
    toast('Saved to the calendar'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={entry.id ? 'Edit' : 'Schedule something'}
      footer={<>{entry.id && <Button variant="ghost" icon={Trash2} onClick={() => { actions.deleteEntry(entry.id); onClose(); }} aria-label="Delete" />}<span className="spacer" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Field label="What" span={2}><input {...bind('title')} placeholder="Recce at Nishat Bagh" autoFocus /></Field>
        <Field label="Type"><select {...bind('type')}>{ENTRY_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Date"><input type="date" {...bind('date')} /></Field>
        <Field label="Starts"><input type="time" {...bind('start')} /></Field>
        <Field label="Ends"><input type="time" {...bind('end')} /></Field>
        <Field label="Production" span={2}><select {...bind('projectId')}><option value="">None</option>{s.projects.filter((p) => p.status !== 'Wrapped').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      </div>
      <p className="field__label" style={{ marginTop: 16 }}>Who’s needed</p>
      <div className="chips-select">{s.crew.map((c) => <button key={c.id} type="button" aria-pressed={v.crewIds.includes(c.id)} onClick={() => toggle(c.id)}>{c.name}</button>)}</div>
    </Modal>
  );
}
