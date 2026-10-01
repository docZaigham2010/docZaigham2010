// Shared helpers for Studio OS
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const inr = (n, opts = {}) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, ...opts }).format(Number(n) || 0);
export const compactInr = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(v >= 1e6 ? 1 : 2)} L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v}`;
};

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const rel = (n) => addDays(today(), n);
export const parse = (s) => new Date(s + 'T12:00:00');
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const fmtDate = (s, opts = { day: 'numeric', month: 'short' }) => (s ? parse(s).toLocaleDateString('en-IN', opts) : '—');
export const fmtDateLong = (s) => fmtDate(s, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtRelative = (s) => {
  if (!s) return '—';
  const d = daysBetween(today(), s);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return `In ${d} days`;
  if (d < -1 && d > -7) return `${-d} days ago`;
  return fmtDate(s);
};
export const timeAgo = (isoStr) => {
  const s = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const overlaps = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2;
export const sum = (arr, f = (x) => x) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const cx = (...c) => c.filter(Boolean).join(' ');

export const PHASES = {
  event: ['Brief', 'Design', 'Planning', 'Event day', 'Wrap'],
  film: ['Development', 'Pre-production', 'Production', 'Post', 'Delivery'],
};
export const STAGES = ['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];
export const STAGE_PROB = { New: 10, Contacted: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 };
export const SERVICES = {
  Wedding: 'event', Celebration: 'event', 'Corporate event': 'event', 'Concert / festival': 'event', 'Destination experience': 'event',
  'Brand film': 'film', Documentary: 'film', 'Music video': 'film', 'Event film': 'film', 'Something new': 'event',
};
export const DEPTS = ['Production', 'Camera', 'Lighting', 'Sound', 'Décor', 'Catering', 'Post', 'Talent', 'Logistics'];
export const GEAR_CATS = ['Camera', 'Lens', 'Lighting', 'Audio', 'Grip', 'Drone', 'Stage & AV'];
export const ENTRY_TYPES = ['Meeting', 'Recce', 'Shoot', 'Event', 'Deadline', 'Other'];

// Invoice maths — GST split as CGST + SGST for intra-state supply
export function invoiceTotals(inv, settings) {
  const subtotal = sum(inv.items || [], (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0));
  const rate = inv.gst ? (Number(settings?.gstRate) || 18) : 0;
  const tax = Math.round(subtotal * rate / 100);
  const total = subtotal + tax;
  const paid = sum(inv.payments || [], (p) => p.amount);
  return { subtotal, rate, tax, cgst: Math.round(tax / 2), sgst: tax - Math.round(tax / 2), total, paid, balance: Math.max(0, total - paid) };
}
export function invoiceStatus(inv, settings) {
  if (inv.kind === 'Quote') return inv.status || 'Draft';
  const t = invoiceTotals(inv, settings);
  if (t.total > 0 && t.balance === 0) return 'Paid';
  if (inv.status === 'Draft') return 'Draft';
  if (inv.dueDate && inv.dueDate < today()) return 'Overdue';
  if (t.paid > 0) return 'Part-paid';
  return 'Sent';
}

export function projectCost(p) { return sum(p.budget || [], (b) => b.actual); }
export function projectEstimate(p) { return sum(p.budget || [], (b) => b.estimate); }
export function crewCost(p) { return sum(p.crew || [], (c) => (Number(c.rate) || 0) * (Number(c.days) || 1)); }
export function taskProgress(p) {
  const t = p.tasks || [];
  return t.length ? Math.round(t.filter((x) => x.status === 'done').length / t.length * 100) : 0;
}

// Cover art for productions, by service (concept imagery shipped with the website)
const COVERS = { Wedding: 'scene-wedding', Celebration: 'frame-wedding', 'Corporate event': 'obj-mic', 'Concert / festival': 'obj-spot', 'Destination experience': 'obj-shikara',
  'Brand film': 'obj-camera', Documentary: 'scene-dal', 'Music video': 'obj-clapper', 'Event film': 'scene-film', 'Something new': 'frame-oval' };
export const coverFor = (p) => `media/v3/${COVERS[p?.service] || (p?.kind === 'film' ? 'scene-film' : 'scene-wedding')}.webp`;
