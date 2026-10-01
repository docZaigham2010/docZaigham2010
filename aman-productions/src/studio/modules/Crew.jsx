import React, { useMemo, useState } from 'react';
import { Plus, Phone, MessageCircle, Mail, Star, Trash2, Users } from 'lucide-react';
import { useStudio, actions, timeline } from '../store.js';
import { Button, Drawer, Field, PageHead, Segmented, useForm, useUI, Avatar, Empty, Badge } from '../ui.jsx';
import { DEPTS, inr, today, addDays, parse, cx } from '../lib.js';

export default function Crew() {
  const s = useStudio();
  const [type, setType] = useState('All');
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const isCrew = s.settings.role === 'Crew';
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
  const busy = useMemo(() => {
    const map = {};
    timeline(s).forEach((x) => (x.crewIds || []).forEach((id) => {
      for (let d = x.date; d <= x.endDate; d = addDays(d, 1)) { (map[id] ||= {})[d] = [...(map[id]?.[d] || []), x.title]; }
    }));
    return map;
  }, [s]);
  const list = s.crew.filter((c) => (type === 'All' || c.type === type) && (!dept || c.dept === dept) && (!q || `${c.name} ${c.role}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHead eyebrow="Crew & vendors" title="The people who make it happen."
        actions={!isCrew && <Button variant="primary" icon={Plus} onClick={() => setEditing({ name: '', role: '', type: 'Crew', dept: 'Production', phone: '', email: '', dayRate: '', rating: 4, city: 'Srinagar' })}>Add person or vendor</Button>}>
        {s.crew.filter((c) => c.type === 'Crew').length} crew · {s.crew.filter((c) => c.type === 'Vendor').length} vendors · availability for the next two weeks
      </PageHead>
      <div className="toolbar">
        <input className="search" placeholder="Search name or role…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search crew" />
        <Segmented options={['All', 'Crew', 'Vendor']} value={type} onChange={setType} label="Type" />
        <select className="select-sm" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      {list.length === 0 && <Empty icon={Users} title="No one matches." />}
      <div className="crewgrid">
        {list.map((c) => {
          const wa = c.phone.replace(/[^\d]/g, '');
          const booked = days.filter((d) => busy[c.id]?.[d]).length;
          return (
            <article key={c.id} className="person">
              <header>
                <Avatar name={c.name} size={44} />
                <div><h3>{c.name}</h3><p>{c.role}</p></div>
                <Badge tone={c.type === 'Vendor' ? 'violet' : 'cyan'}>{c.type}</Badge>
              </header>
              <div className="person__meta">
                <span>{c.dept}</span><span>{c.city}</span>
                <span className="stars" aria-label={`${c.rating} out of 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < c.rating ? 'currentColor' : 'none'} />)}</span>
                {!isCrew && <span>{c.dayRate ? `${inr(c.dayRate)}/day` : 'Quoted per job'}</span>}
              </div>
              <div className="avail" aria-label={`Booked ${booked} of the next 14 days`}>
                {days.map((d) => <i key={d} className={busy[c.id]?.[d] ? 'is-busy' : ''} title={`${parse(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}${busy[c.id]?.[d] ? ` — ${busy[c.id][d].join(', ')}` : ' — free'}`} />)}
              </div>
              <p className="muted small">{booked ? `Booked ${booked} of the next 14 days` : 'Free for the next 14 days'}</p>
              <footer>
                <a className="btn btn--sm" href={`tel:${c.phone}`}><Phone size={14} />Call</a>
                <a className="btn btn--sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener"><MessageCircle size={14} />WhatsApp</a>
                {c.email && <a className="btn btn--ghost btn--icon btn--sm" href={`mailto:${c.email}`} aria-label={`Email ${c.name}`}><Mail size={14} /></a>}
                {!isCrew && <button className="btn btn--ghost btn--sm" onClick={() => setEditing(c)}>Edit</button>}
              </footer>
            </article>
          );
        })}
      </div>
      {editing && <CrewDrawer person={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CrewDrawer({ person, onClose }) {
  const { toast, confirm } = useUI();
  const { values: v, bind } = useForm({ ...person });
  const save = () => {
    if (!v.name.trim()) { toast('A name is needed.', 'red'); return; }
    actions.saveCrew({ ...v, dayRate: Number(v.dayRate) || 0, rating: Number(v.rating) || 0 });
    toast('Saved'); onClose();
  };
  return (
    <Drawer open onClose={onClose} title={person.id ? person.name : 'Add to the crew list'}
      footer={<>{person.id && <Button variant="ghost" icon={Trash2} aria-label="Remove" onClick={async () => { if (await confirm({ title: `Remove ${person.name}?`, text: 'They will be unassigned from all productions.', danger: true, ok: 'Remove' })) { actions.deleteCrew(person.id); onClose(); } }} />}<span className="spacer" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Name" span={2}><input {...bind('name')} autoFocus /></Field>
        <Field label="Role / speciality"><input {...bind('role')} /></Field>
        <Field label="Type"><select {...bind('type')}><option>Crew</option><option>Vendor</option></select></Field>
        <Field label="Department"><select {...bind('dept')}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="City"><input {...bind('city')} /></Field>
        <Field label="Phone"><input type="tel" {...bind('phone')} /></Field>
        <Field label="Email"><input type="email" {...bind('email')} /></Field>
        <Field label="Day rate (₹)"><input type="number" min="0" step="500" {...bind('dayRate', { number: true })} /></Field>
        <Field label="Rating"><select {...bind('rating', { number: true })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></Field>
      </div>
    </Drawer>
  );
}
