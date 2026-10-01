import React, { useState } from 'react';
import { Plus, Phone, MessageCircle, Mail, Building2 } from 'lucide-react';
import { useStudio, actions } from '../store.js';
import { Button, Drawer, Field, PageHead, useForm, useUI, Avatar, Empty, StatusBadge } from '../ui.jsx';
import { inr, compactInr, sum, fmtDate, invoiceTotals } from '../lib.js';

export default function Clients() {
  const s = useStudio();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const isCrew = s.settings.role === 'Crew';
  const rows = s.clients.map((c) => {
    const projects = s.projects.filter((p) => p.clientId === c.id);
    const paid = sum(s.invoices.filter((i) => i.clientId === c.id || projects.some((p) => p.id === i.projectId)), (i) => invoiceTotals(i, s.settings).paid);
    return { c, projects, value: sum(projects, (p) => p.fee), paid, last: projects.map((p) => p.startDate).sort().at(-1) };
  }).filter((r) => !q || `${r.c.name} ${r.c.company} ${r.c.city}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHead eyebrow="Clients" title="The people whose stories we tell."
        actions={<Button variant="primary" icon={Plus} onClick={() => setOpen({ name: '', company: '', phone: '', email: '', city: 'Srinagar', notes: '' })}>Add client</Button>}>
        {s.clients.length} clients{!isCrew && ` · ${compactInr(sum(rows, (r) => r.value))} lifetime contract value`}
      </PageHead>
      <div className="toolbar"><input className="search" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" /></div>
      {rows.length === 0 ? <Empty icon={Building2} title="No clients match." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Client</th><th>City</th><th>Productions</th><th>Most recent</th>{!isCrew && <><th className="num">Lifetime value</th><th className="num">Collected</th></>}<th>Contact</th></tr></thead>
            <tbody>
              {rows.map(({ c, projects, value, paid, last }) => (
                <tr key={c.id} className="is-link" onClick={() => setOpen(c)}>
                  <td><span className="cellperson"><Avatar name={c.name} size={30} /><span><b>{c.name}</b>{c.company && c.company !== c.name && <small>{c.company}</small>}</span></span></td>
                  <td>{c.city}</td>
                  <td>{projects.length}</td>
                  <td>{last ? fmtDate(last, { month: 'short', year: 'numeric' }) : '—'}</td>
                  {!isCrew && <><td className="num">{inr(value)}</td><td className="num">{inr(paid)}</td></>}
                  <td onClick={(e) => e.stopPropagation()} className="row row--tight">
                    {c.phone && <a className="btn btn--ghost btn--icon btn--sm" href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}><Phone size={14} /></a>}
                    {c.phone && <a className="btn btn--ghost btn--icon btn--sm" href={`https://wa.me/${c.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${c.name}`}><MessageCircle size={14} /></a>}
                    {c.email && <a className="btn btn--ghost btn--icon btn--sm" href={`mailto:${c.email}`} aria-label={`Email ${c.name}`}><Mail size={14} /></a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <ClientDrawer client={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ClientDrawer({ client, onClose }) {
  const s = useStudio();
  const { toast } = useUI();
  const { values: v, bind } = useForm({ ...client });
  const projects = s.projects.filter((p) => p.clientId === client.id);
  return (
    <Drawer open onClose={onClose} title={client.id ? client.name : 'New client'}
      footer={<><span className="spacer" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { if (!v.name.trim()) { toast('A name is needed.', 'red'); return; } actions.saveClient(v); toast('Saved'); onClose(); }}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Name" span={2}><input {...bind('name')} autoFocus={!client.id} /></Field>
        <Field label="Company"><input {...bind('company')} /></Field>
        <Field label="City"><input {...bind('city')} /></Field>
        <Field label="Phone"><input type="tel" {...bind('phone')} /></Field>
        <Field label="Email"><input type="email" {...bind('email')} /></Field>
        <Field label="Notes" span={2}><textarea rows={3} {...bind('notes')} /></Field>
      </div>
      {projects.length > 0 && (
        <>
          <p className="field__label" style={{ marginTop: 20 }}>Productions together</p>
          <ul className="linklist">{projects.map((p) => <li key={p.id}><a href={`#/productions/${p.id}`} onClick={onClose}><span><b>{p.name}</b><small>{fmtDate(p.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} · {p.location}</small></span><StatusBadge status={p.status} /></a></li>)}</ul>
        </>
      )}
    </Drawer>
  );
}
