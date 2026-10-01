import React, { useState } from 'react';
import { Plus, Package, Trash2, AlertTriangle, Wrench } from 'lucide-react';
import { useStudio, actions, gearClashes } from '../store.js';
import { Button, Drawer, Field, Modal, PageHead, Segmented, Stat, StatusBadge, useForm, useUI, Empty } from '../ui.jsx';
import { GEAR_CATS, inr, compactInr, fmtDate, today, overlaps, sum, addDays } from '../lib.js';

export default function Gear() {
  const s = useStudio();
  const [cat, setCat] = useState('All');
  const [editing, setEditing] = useState(null);
  const [booking, setBooking] = useState(null);
  const t0 = today();
  const isCrew = s.settings.role === 'Crew';
  const statusOf = (g) => g.status === 'Maintenance' ? 'Maintenance' : g.bookings.some((b) => b.from <= t0 && b.to >= t0) ? 'Booked' : 'Available';
  const list = s.gear.filter((g) => cat === 'All' || g.category === cat);
  const clashes = gearClashes(s);
  const upcomingDays = sum(s.gear.flatMap((g) => g.bookings.filter((b) => b.to >= t0 && b.from <= addDays(t0, 30))), (b) => 1);

  return (
    <div>
      <PageHead eyebrow="Gear room" title="Every lens, light and drone — accounted for."
        actions={!isCrew && <Button variant="primary" icon={Plus} onClick={() => setEditing({ name: '', category: 'Camera', serial: '', value: '', status: 'Available' })}>Add equipment</Button>}>
        Book kit against productions. Double-bookings are blocked before they happen.
      </PageHead>
      <div className="stats">
        <Stat label="Items" value={s.gear.length} sub={`${GEAR_CATS.length} categories`} icon={Package} />
        <Stat label="Out today" value={s.gear.filter((g) => statusOf(g) === 'Booked').length} sub="on productions" />
        <Stat label="Bookings · next 30 days" value={upcomingDays} />
        {!isCrew && <Stat label="Kit value" value={compactInr(sum(s.gear, (g) => g.value))} sub={`${s.gear.filter((g) => g.status === 'Maintenance').length} in maintenance`} icon={Wrench} />}
      </div>
      {clashes.length > 0 && <div className="notice notice--warn"><AlertTriangle size={16} /><div>{clashes.map((c, i) => <p key={i}><b>{c.gear.name}</b> has overlapping bookings ({fmtDate(c.a.from)} and {fmtDate(c.b.from)}).</p>)}</div></div>}
      <div className="toolbar"><Segmented options={['All', ...GEAR_CATS]} value={cat} onChange={setCat} label="Category" /></div>
      {list.length === 0 ? <Empty icon={Package} title="Nothing in this category yet." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th>Category</th><th>Status</th><th>Bookings</th>{!isCrew && <th className="num">Value</th>}<th /></tr></thead>
            <tbody>
              {list.map((g) => {
                const upcoming = g.bookings.filter((b) => b.to >= t0).sort((a, b) => a.from.localeCompare(b.from));
                return (
                  <tr key={g.id}>
                    <td><b>{g.name}</b><br /><small className="mono muted">{g.serial}</small></td>
                    <td>{g.category}</td>
                    <td><StatusBadge status={statusOf(g)} /></td>
                    <td>
                      {upcoming.length === 0 ? <span className="muted small">Free</span> : upcoming.map((b) => {
                        const p = s.projects.find((x) => x.id === b.projectId);
                        return <span key={b.id} className="booking"><a href={`#/productions/${b.projectId}/gear`}>{p?.code || 'Production'}</a> {fmtDate(b.from)}–{fmtDate(b.to)}{!isCrew && <button className="icon-x" aria-label="Release booking" onClick={() => actions.unbookGear(g.id, b.id)}>×</button>}</span>;
                      })}
                    </td>
                    {!isCrew && <td className="num">{inr(g.value)}</td>}
                    <td className="row row--tight">
                      <Button size="sm" onClick={() => setBooking(g)} disabled={g.status === 'Maintenance'}>Book</Button>
                      {!isCrew && <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>Edit</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && <GearDrawer item={editing} onClose={() => setEditing(null)} />}
      {booking && <BookModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

function BookModal({ item, onClose }) {
  const s = useStudio();
  const { toast } = useUI();
  const active = s.projects.filter((p) => p.status === 'Active');
  const [pid, setPid] = useState(active[0]?.id || '');
  const proj = s.projects.find((p) => p.id === pid);
  const [from, setFrom] = useState(proj?.startDate || today());
  const [to, setTo] = useState(proj?.endDate || today());
  const clash = item.bookings.find((b) => overlaps(from, to, b.from, b.to));
  const choose = (id) => { setPid(id); const p = s.projects.find((x) => x.id === id); if (p) { setFrom(p.startDate); setTo(p.endDate || p.startDate); } };
  return (
    <Modal open onClose={onClose} title={`Book ${item.name}`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!clash || !pid || to < from} onClick={() => { actions.bookGear(item.id, { projectId: pid, from, to }); toast('Booked', 'green'); onClose(); }}>Book</Button></>}>
      <div className="form-grid">
        <Field label="Production" span={2}><select value={pid} onChange={(e) => choose(e.target.value)}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {clash && <div className="notice notice--warn" style={{ marginTop: 14 }}><AlertTriangle size={16} /><p>Already out on {s.projects.find((p) => p.id === clash.projectId)?.name} ({fmtDate(clash.from)}–{fmtDate(clash.to)}).</p></div>}
    </Modal>
  );
}

function GearDrawer({ item, onClose }) {
  const { toast } = useUI();
  const { values: v, bind } = useForm({ ...item });
  return (
    <Drawer open onClose={onClose} title={item.id ? item.name : 'Add equipment'}
      footer={<>{item.id && <Button variant="ghost" icon={Trash2} aria-label="Delete" onClick={() => { actions.deleteGear(item.id); onClose(); }} />}<span className="spacer" /><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { if (!v.name.trim()) { toast('Name it first.', 'red'); return; } actions.saveGear({ ...v, value: Number(v.value) || 0 }); toast('Saved'); onClose(); }}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Name" span={2}><input {...bind('name')} autoFocus /></Field>
        <Field label="Category"><select {...bind('category')}>{GEAR_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Serial / tag"><input {...bind('serial')} /></Field>
        <Field label="Replacement value (₹)"><input type="number" min="0" {...bind('value', { number: true })} /></Field>
        <Field label="Condition"><select {...bind('status')}><option>Available</option><option>Maintenance</option></select></Field>
      </div>
    </Drawer>
  );
}
