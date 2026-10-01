import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Globe, Phone, MessageCircle, Mail, ArrowRight, Trash2, CalendarDays, MapPin, Users, Sparkles } from 'lucide-react';
import { useStudio, actions, weightedPipeline } from '../store.js';
import { Button, Badge, Drawer, Field, PageHead, StatusBadge, useForm, useUI, Segmented } from '../ui.jsx';
import { STAGES, STAGE_PROB, SERVICES, compactInr, inr, fmtDate, timeAgo, sum, cx, today } from '../lib.js';
import { navigate } from '../App.jsx';

const blank = { title: '', clientName: '', phone: '', email: '', type: 'Wedding', stage: 'New', value: '', date: '', location: 'Srinagar', guests: '', source: 'Phone', notes: '' };

export default function Pipeline({ focus }) {
  const s = useStudio();
  const { toast } = useUI();
  const [editing, setEditing] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showLost, setShowLost] = useState(false);

  useEffect(() => {
    if (focus === 'new') setEditing({ ...blank });
    else if (focus) { const l = s.leads.find((x) => x.id === focus); if (l) setEditing(l); }
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const leads = s.leads.filter((l) => filter === 'All' || SERVICES[l.type] === (filter === 'Events' ? 'event' : 'film'));
  const stages = STAGES.filter((st) => showLost || st !== 'Lost');
  const open = leads.filter((l) => !['Won', 'Lost'].includes(l.stage));
  const won = leads.filter((l) => l.stage === 'Won').length, lost = leads.filter((l) => l.stage === 'Lost').length;

  const drop = (stage) => {
    if (drag) { actions.moveLead(drag, stage); if (stage === 'Won') toast('Deal won 🎬 — convert it to a production when ready.', 'green'); }
    setDrag(null); setOver(null);
  };

  return (
    <div>
      <PageHead eyebrow="Pipeline" title="Every story starts as an enquiry."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing({ ...blank })}>New lead</Button>}>
        {open.length} open · {compactInr(sum(open, (l) => l.value))} in play · {compactInr(weightedPipeline(leads))} weighted · win rate {won + lost ? Math.round(won / (won + lost) * 100) : 0}%
      </PageHead>
      <div className="toolbar">
        <Segmented options={['All', 'Events', 'Films']} value={filter} onChange={setFilter} label="Filter leads" />
        <label className="check"><input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} /> Show lost</label>
        <p className="muted small hide-sm">Drag cards between stages. Website enquiries arrive here automatically.</p>
      </div>
      <div className="kanban" style={{ '--cols': stages.length }}>
        {stages.map((st) => {
          const items = leads.filter((l) => l.stage === st);
          return (
            <section key={st} className={cx('kanban__col', over === st && 'is-over')}
              onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver(null)} onDrop={() => drop(st)} aria-label={`${st} stage`}>
              <header className="kanban__head">
                <StatusBadge status={st} /><span className="muted small">{items.length} · {compactInr(sum(items, (l) => l.value))}</span>
                <span className="kanban__prob">{STAGE_PROB[st]}%</span>
              </header>
              <div className="kanban__list">
                {items.map((l) => (
                  <article key={l.id} className={cx('lead', l.fresh && 'is-fresh', drag === l.id && 'is-drag')} draggable
                    onDragStart={(e) => { setDrag(l.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }}
                    onClick={() => setEditing(l)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(l)}>
                    <div className="lead__top">
                      <Badge tone={SERVICES[l.type] === 'film' ? 'saffron' : 'cyan'}>{l.type}</Badge>
                      {l.source?.startsWith('Website') && <span className="lead__src" title={l.source}><Globe size={12} /> Web</span>}
                    </div>
                    <h3>{l.title}</h3>
                    <p className="lead__client">{l.clientName}</p>
                    <div className="lead__meta">
                      {l.date && <span><CalendarDays size={12} />{fmtDate(l.date)}</span>}
                      {l.location && <span><MapPin size={12} />{l.location}</span>}
                      {l.guests && <span><Users size={12} />{l.guests}</span>}
                    </div>
                    <div className="lead__foot"><b>{l.value ? compactInr(l.value) : 'Budget TBC'}</b><small>{timeAgo(l.createdAt)}</small></div>
                    {l.fresh && <span className="lead__new">NEW</span>}
                  </article>
                ))}
                {items.length === 0 && <p className="kanban__empty">Drop a lead here</p>}
              </div>
            </section>
          );
        })}
      </div>
      {editing && <LeadDrawer lead={editing} onClose={() => { setEditing(null); if (focus) navigate('pipeline'); }} />}
    </div>
  );
}

function LeadDrawer({ lead, onClose }) {
  const s = useStudio();
  const { toast, confirm } = useUI();
  const { values: v, bind, setValues } = useForm({ ...lead });
  const isNew = !lead.id;
  const quote = s.invoices.find((i) => i.kind === 'Quote' && i.leadId === lead.id);
  const wa = (v.phone || '').replace(/[^\d]/g, '');

  const save = () => {
    if (!v.title.trim() || !v.clientName.trim()) { toast('Give the lead a title and a client name.', 'red'); return; }
    actions.saveLead({ ...v, value: Number(v.value) || 0, guests: v.guests ? Number(v.guests) : null, fresh: false });
    toast(isNew ? 'Lead added to the pipeline' : 'Lead saved');
    onClose();
  };
  const convert = () => {
    actions.saveLead({ ...v, value: Number(v.value) || 0, guests: v.guests ? Number(v.guests) : null });
    const pid = actions.convertLead(v.id);
    toast('Production created from the template — tasks, budget and schedule are ready.', 'green');
    onClose();
    navigate(`productions/${pid}`);
  };
  const makeQuote = () => {
    const id = actions.saveInvoice({
      kind: 'Quote', status: 'Draft', projectId: null, clientId: null, leadId: v.id, clientName: v.clientName, issueDate: today(), dueDate: null, gst: true, notes: '',
      items: [{ desc: `${v.type} production — ${v.location || 'Kashmir'}`, qty: 1, rate: Number(v.value) || 0 }],
    });
    onClose(); navigate(`invoice/${id}`);
  };

  return (
    <Drawer open onClose={onClose} title={isNew ? 'New lead' : v.title} size="lg"
      footer={<>
        {!isNew && <Button variant="ghost" icon={Trash2} onClick={async () => { if (await confirm({ title: 'Delete this lead?', text: 'It will be removed from the pipeline.', danger: true, ok: 'Delete' })) { actions.deleteLead(v.id); onClose(); } }} />}
        <span className="spacer" />
        {!isNew && v.stage !== 'Won' && s.settings.role !== 'Crew' && !quote && <Button onClick={makeQuote}>Draft a quote</Button>}
        {!isNew && !v.projectId && v.stage !== 'Lost' && <Button variant="accent" icon={ArrowRight} onClick={convert}>Won — create production</Button>}
        {v.projectId && <Button onClick={() => { onClose(); navigate(`productions/${v.projectId}`); }}>Open production</Button>}
        <Button variant="primary" onClick={save}>{isNew ? 'Add lead' : 'Save'}</Button>
      </>}>
      {!isNew && (
        <div className="contact-row">
          {v.phone && <a className="btn btn--sm" href={`tel:${v.phone}`}><Phone size={14} /> Call</a>}
          {wa && <a className="btn btn--sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener"><MessageCircle size={14} /> WhatsApp</a>}
          {v.email && <a className="btn btn--sm" href={`mailto:${v.email}`}><Mail size={14} /> Email</a>}
          {quote && <a className="btn btn--sm" href={`#/invoice/${quote.id}`}>Quote {quote.number}</a>}
        </div>
      )}
      {(lead.story || lead.feeling) && (
        <blockquote className="script-quote">
          <span className="eyebrow"><Sparkles size={12} /> Their scene, from the website</span>
          {lead.story && <p>“{lead.story}”</p>}
          {lead.feeling && <p className="muted">Everyone should feel <b>{lead.feeling}</b>.</p>}
        </blockquote>
      )}
      <div className="form-grid">
        <Field label="Lead title" span={2}><input {...bind('title')} placeholder="Winter wedding in Gulmarg" autoFocus={isNew} /></Field>
        <Field label="Client name"><input {...bind('clientName')} /></Field>
        <Field label="Service"><select {...bind('type')}>{Object.keys(SERVICES).map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Phone"><input {...bind('phone')} type="tel" /></Field>
        <Field label="Email"><input {...bind('email')} type="email" /></Field>
        <Field label="Stage"><select {...bind('stage')}>{STAGES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Estimated value (₹)" hint={v.value ? `${inr(v.value)} · weighted ${inr((Number(v.value) || 0) * STAGE_PROB[v.stage] / 100)}` : ''}><input {...bind('value', { number: true })} type="number" min="0" step="1000" /></Field>
        <Field label="Date"><input {...bind('date')} type="date" /></Field>
        <Field label="Location"><input {...bind('location')} /></Field>
        <Field label="Guests"><input {...bind('guests', { number: true })} type="number" min="0" /></Field>
        <Field label="Source"><select {...bind('source')}>{['Website', 'Website · WhatsApp', 'Phone', 'Referral', 'Instagram', 'Walk-in', 'Existing client', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Notes" span={2}><textarea {...bind('notes')} rows={4} /></Field>
      </div>
    </Drawer>
  );
}
