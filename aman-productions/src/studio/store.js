// Studio OS data layer. In this client preview everything lives in the browser (localStorage).
// All reads/writes go through this module, so a real backend can replace it without touching the UI.
import { useSyncExternalStore } from 'react';
import { seed, TEMPLATES } from './seed.js';
import { uid, today, addDays, SERVICES, STAGE_PROB, sum } from './lib.js';
import { drainInbox, INBOX_KEY } from '../shared/inbox.js';

const KEY = 'aman-studio-os-v3'; // v3: starts blank (v2 held the demo workspace)
const listeners = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.version === 2 && Array.isArray(d.projects)) return d;
    }
  } catch (e) { console.warn('Studio storage unavailable — using a fresh, empty workspace.', e); }
  return seed();
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Could not save', e); }
}

function emit() { listeners.forEach((l) => l()); }

export function getState() { return state; }

export function useStudio(selector = (s) => s) {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => selector(state));
}

// Mutate a draft copy, then commit. Small data, so structuredClone is simple and safe.
export function update(fn, logText, kind = 'info') {
  const draft = structuredClone(state);
  fn(draft);
  if (logText) draft.activity = [{ id: uid(), text: logText, at: new Date().toISOString(), kind }, ...draft.activity].slice(0, 80);
  state = draft;
  persist();
  emit();
}

export function resetDemo() { state = seed(); persist(); emit(); }
try { localStorage.removeItem('aman-studio-os-v2'); } catch { /* old demo data */ }
export function importData(obj) {
  if (!obj || obj.version !== 2 || !Array.isArray(obj.projects)) throw new Error('This file is not a Studio OS v2 export.');
  state = obj; persist(); emit();
}
export function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aman-studio-os-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Website inbox → pipeline ──────────────────────────────────────────────────
export function collectInbox() {
  const items = drainInbox();
  if (!items.length) return 0;
  update((d) => {
    items.forEach((e) => {
      const service = e.type || 'Something new';
      d.leads.unshift({
        id: uid(),
        title: `${service} — ${e.location || 'Kashmir'}`,
        clientName: e.name, phone: e.phone || '', email: e.email || '', type: service, stage: 'New',
        value: Number(e.budget) || 0, date: e.date || null, location: e.location || '', guests: e.guests || null,
        source: e.source || 'Website', feeling: e.feeling || '', story: e.story || '',
        notes: [e.story && `Story: ${e.story}`, e.feeling && `Should feel: ${e.feeling}`].filter(Boolean).join('\n'),
        createdAt: e.receivedAt || new Date().toISOString(), fresh: true,
      });
      d.activity.unshift({ id: uid(), text: `New website enquiry from ${e.name}: ${service}`, at: new Date().toISOString(), kind: 'lead' });
    });
  });
  return items.length;
}
addEventListener('storage', (e) => {
  if (e.key === INBOX_KEY && e.newValue) collectInbox();
  if (e.key === KEY && e.newValue) { try { state = JSON.parse(e.newValue); emit(); } catch { /* ignore */ } }
});

// ── Domain actions ────────────────────────────────────────────────────────────
export const actions = {
  saveLead(lead) {
    update((d) => {
      const i = d.leads.findIndex((l) => l.id === lead.id);
      if (i >= 0) d.leads[i] = lead; else d.leads.unshift({ ...lead, id: uid(), createdAt: new Date().toISOString() });
    }, lead.id ? null : `New lead: ${lead.title}`, 'lead');
  },
  moveLead(id, stage) {
    const l = state.leads.find((x) => x.id === id);
    if (!l || l.stage === stage) return;
    update((d) => { const x = d.leads.find((y) => y.id === id); x.stage = stage; x.fresh = false; }, `${l.title} moved to ${stage}`, 'lead');
  },
  deleteLead(id) { update((d) => { d.leads = d.leads.filter((l) => l.id !== id); }); },

  convertLead(id) {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return null;
    const kind = SERVICES[lead.type] || 'event';
    const tpl = TEMPLATES[kind];
    const pid = uid();
    let clientId;
    update((d) => {
      let client = d.clients.find((c) => c.name.toLowerCase() === (lead.clientName || '').toLowerCase());
      if (!client) {
        client = { id: uid(), name: lead.clientName || 'New client', company: '', phone: lead.phone || '', email: lead.email || '', city: lead.location || '', notes: '' };
        d.clients.push(client);
      }
      clientId = client.id;
      const fee = Number(lead.value) || 0;
      const start = lead.date || addDays(today(), 30);
      const n = d.projects.length + 32;
      d.projects.unshift({
        id: pid, code: `AP-26-${String(n).padStart(3, '0')}`, name: `${lead.clientName} — ${lead.title}`, clientId, kind, service: lead.type, phase: 0, status: 'Active',
        startDate: start, endDate: start, location: lead.location || '', venue: '', guests: lead.guests || null, fee,
        brief: [lead.story, lead.notes].filter(Boolean).join('\n\n'),
        crew: [], tasks: tpl.tasks.map((title) => ({ id: uid(), title, status: 'todo', due: null, assignee: null })),
        budget: tpl.budget.map(([category, item, share]) => ({ id: uid(), category, item, estimate: Math.round(fee * .7 * share / 1000) * 1000, actual: 0, vendor: '' })),
        schedule: kind === 'event' ? tpl.schedule.map(([time, title]) => ({ id: uid(), time, title, owner: null, note: '' })) : [],
        shots: kind === 'film' ? tpl.shots.map(([scene, shot, desc, type, lens]) => ({ id: uid(), scene, shot, desc, type, lens, status: 'Planned' })) : [],
        deliverables: [], notes: '', color: kind === 'film' ? '#f0a63a' : '#23d5e8',
      });
      const l = d.leads.find((x) => x.id === id);
      l.stage = 'Won'; l.projectId = pid; l.fresh = false;
    }, `${lead.title} won — production created`, 'project');
    return pid;
  },

  saveProject(p) { update((d) => { const i = d.projects.findIndex((x) => x.id === p.id); if (i >= 0) d.projects[i] = p; }); },
  patchProject(id, fn, log) { update((d) => { const p = d.projects.find((x) => x.id === id); if (p) fn(p, d); }, log, 'project'); },
  createProject(data) {
    const id = uid();
    const tpl = TEMPLATES[data.kind];
    update((d) => {
      const fee = Number(data.fee) || 0;
      d.projects.unshift({
        id, code: `AP-26-${String(d.projects.length + 32).padStart(3, '0')}`, phase: 0, status: 'Active', crew: [], deliverables: [], notes: '', venue: '', guests: null, brief: '',
        tasks: tpl.tasks.map((title) => ({ id: uid(), title, status: 'todo', due: null, assignee: null })),
        budget: tpl.budget.map(([category, item, share]) => ({ id: uid(), category, item, estimate: Math.round(fee * .7 * share / 1000) * 1000, actual: 0, vendor: '' })),
        schedule: data.kind === 'event' ? tpl.schedule.map(([time, title]) => ({ id: uid(), time, title, owner: null, note: '' })) : [],
        shots: data.kind === 'film' ? tpl.shots.map(([scene, shot, desc, type, lens]) => ({ id: uid(), scene, shot, desc, type, lens, status: 'Planned' })) : [],
        color: data.kind === 'film' ? '#f0a63a' : '#23d5e8',
        ...data, fee,
        endDate: data.endDate || data.startDate,
      });
    }, `New production: ${data.name}`, 'project');
    return id;
  },
  deleteProject(id) { update((d) => { d.projects = d.projects.filter((p) => p.id !== id); d.gear.forEach((g) => { g.bookings = g.bookings.filter((b) => b.projectId !== id); }); }); },

  saveClient(c) { update((d) => { const i = d.clients.findIndex((x) => x.id === c.id); if (i >= 0) d.clients[i] = c; else d.clients.push({ ...c, id: uid() }); }); },
  saveCrew(c) { update((d) => { const i = d.crew.findIndex((x) => x.id === c.id); if (i >= 0) d.crew[i] = c; else d.crew.push({ ...c, id: uid() }); }, c.id ? null : `${c.name} added to crew & vendors`); },
  deleteCrew(id) { update((d) => { d.crew = d.crew.filter((c) => c.id !== id); d.projects.forEach((p) => { p.crew = p.crew.filter((c) => c.crewId !== id); }); }); },
  saveGear(g) { update((d) => { const i = d.gear.findIndex((x) => x.id === g.id); if (i >= 0) d.gear[i] = g; else d.gear.push({ ...g, id: uid(), bookings: [] }); }); },
  deleteGear(id) { update((d) => { d.gear = d.gear.filter((g) => g.id !== id); }); },
  bookGear(gearId, booking) { update((d) => { d.gear.find((g) => g.id === gearId).bookings.push({ ...booking, id: uid() }); }, 'Gear booked'); },
  unbookGear(gearId, bookingId) { update((d) => { const g = d.gear.find((x) => x.id === gearId); g.bookings = g.bookings.filter((b) => b.id !== bookingId); }); },

  saveEntry(e) { update((d) => { const i = d.entries.findIndex((x) => x.id === e.id); if (i >= 0) d.entries[i] = e; else d.entries.push({ ...e, id: uid() }); }, e.id ? null : `Scheduled: ${e.title}`, 'calendar'); },
  deleteEntry(id) { update((d) => { d.entries = d.entries.filter((e) => e.id !== id); }); },

  saveInvoice(inv) {
    let id = inv.id;
    update((d) => {
      const i = d.invoices.findIndex((x) => x.id === inv.id);
      if (i >= 0) d.invoices[i] = inv;
      else {
        id = uid();
        const prefix = inv.kind === 'Quote' ? d.settings.quotePrefix : d.settings.invoicePrefix;
        const nums = d.invoices.filter((x) => x.kind === inv.kind).map((x) => parseInt(String(x.number).split(/[/-]/).pop(), 10) || 0);
        d.invoices.unshift({ ...inv, id, number: `${prefix}${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`, payments: [] });
      }
    }, inv.id ? null : `${inv.kind} created`, 'money');
    return id;
  },
  deleteInvoice(id) { update((d) => { d.invoices = d.invoices.filter((x) => x.id !== id); }); },
  recordPayment(invId, p) {
    update((d) => { d.invoices.find((x) => x.id === invId).payments.push({ ...p, id: uid() }); },
      `Payment of ₹${Number(p.amount).toLocaleString('en-IN')} recorded`, 'money');
  },
  quoteToInvoice(qId) {
    const q = state.invoices.find((x) => x.id === qId);
    return actions.saveInvoice({ ...structuredClone(q), id: undefined, kind: 'Invoice', status: 'Sent', issueDate: today(), dueDate: addDays(today(), 14), payments: [], fromQuote: q.number });
  },
  saveSettings(s) { update((d) => { d.settings = { ...d.settings, ...s }; }); },
};

// ── Derived data ──────────────────────────────────────────────────────────────
export const weightedPipeline = (leads) => sum(leads.filter((l) => !['Won', 'Lost'].includes(l.stage)), (l) => (l.value || 0) * (STAGE_PROB[l.stage] / 100));

// Every dated thing in the studio, as one list for calendars & clashes
export function timeline(s) {
  const out = [];
  s.projects.forEach((p) => {
    if (p.status === 'Wrapped' || !p.startDate) return;
    out.push({ id: `p-${p.id}`, type: p.kind === 'film' ? 'Shoot' : 'Event', title: p.name, date: p.startDate, endDate: p.endDate || p.startDate, projectId: p.id, crewIds: p.crew.map((c) => c.crewId), color: p.color });
    p.deliverables.forEach((dl) => dl.due && dl.status !== 'Delivered' && out.push({ id: `d-${dl.id}`, type: 'Deadline', title: `${dl.title}`, date: dl.due, endDate: dl.due, projectId: p.id, crewIds: [] }));
  });
  s.entries.forEach((e) => out.push({ ...e, endDate: e.date, id: `e-${e.id}`, entryId: e.id }));
  s.invoices.forEach((i) => { if (i.kind === 'Invoice' && i.dueDate) out.push({ id: `i-${i.id}`, type: 'Invoice due', title: `${i.number} due`, date: i.dueDate, endDate: i.dueDate, invoiceId: i.id, crewIds: [] }); });
  return out.sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
}

// Crew booked on two productions/entries that overlap in time
export function crewClashes(s) {
  const items = timeline(s).filter((x) => ['Shoot', 'Event', 'Recce', 'Meeting'].includes(x.type) && x.crewIds?.length);
  const clashes = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.projectId && a.projectId === b.projectId) continue;
    if (a.date > b.endDate || b.date > a.endDate) continue;
    if (a.start && b.start && a.date === b.date && a.endDate === b.endDate && (a.end <= b.start || b.end <= a.start)) continue;
    a.crewIds.filter((c) => b.crewIds.includes(c)).forEach((crewId) => clashes.push({ crewId, a, b }));
  }
  return clashes;
}

export function gearClashes(s) {
  const out = [];
  s.gear.forEach((g) => {
    for (let i = 0; i < g.bookings.length; i++) for (let j = i + 1; j < g.bookings.length; j++) {
      const a = g.bookings[i], b = g.bookings[j];
      if (a.from <= b.to && b.from <= a.to) out.push({ gear: g, a, b });
    }
  });
  return out;
}
