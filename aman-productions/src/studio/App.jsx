import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Workflow, Clapperboard, CalendarDays, Users, Camera, Building2, Receipt, BarChart3, Settings as SettingsIcon,
  Search, Plus, Sun, Moon, ArrowUpRight, Menu, Command, Bell, Film, PartyPopper, UserPlus, FileText,
} from 'lucide-react';
import { useStudio, collectInbox, crewClashes, gearClashes, actions } from './store.js';
import { UIProvider, useUI, Avatar } from './ui.jsx';
import { cx, invoiceStatus } from './lib.js';
import Dashboard from './modules/Dashboard.jsx';
import Pipeline from './modules/Pipeline.jsx';
import { Productions, ProductionDetail } from './modules/Productions.jsx';
import Calendar from './modules/Calendar.jsx';
import Crew from './modules/Crew.jsx';
import Gear from './modules/Gear.jsx';
import Clients from './modules/Clients.jsx';
import { Finance, InvoiceDetail } from './modules/Finance.jsx';
import Reports from './modules/Reports.jsx';
import Settings from './modules/Settings.jsx';

// ── Hash router ───────────────────────────────────────────────────────────────
export function navigate(path) { location.hash = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`; }
function useRoute() {
  const read = () => {
    let h = location.hash.replace(/^#\/?/, '');
    if (!h) h = 'control-room';
    const [path, qs] = h.split('?');
    const r = path.split('/');
    r.query = new URLSearchParams(qs || '');
    r.key = h;
    return r;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); document.querySelector('.main')?.scrollTo?.(0, 0); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

const NAV = [
  { id: 'control-room', label: 'Control Room', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Workflow, badge: (s) => s.leads.filter((l) => l.fresh || l.stage === 'New').length },
  { id: 'productions', label: 'Productions', icon: Clapperboard, badge: (s) => s.projects.filter((p) => p.status === 'Active').length, quiet: true },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'crew', label: 'Crew & Vendors', icon: Users },
  { id: 'gear', label: 'Gear Room', icon: Camera },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'finance', label: 'Finance', icon: Receipt, roles: ['Owner', 'Producer'], badge: (s) => s.invoices.filter((i) => invoiceStatus(i, s.settings) === 'Overdue').length, alert: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Owner'] },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  return <UIProvider><Shell /></UIProvider>;
}

function Shell() {
  const s = useStudio();
  const route = useRoute();
  const { toast } = useUI();
  const [palette, setPalette] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const role = s.settings.role;

  useEffect(() => { document.documentElement.dataset.theme = s.settings.theme; }, [s.settings.theme]);
  useEffect(() => {
    const n = collectInbox();
    if (n) toast(`${n} new enquir${n > 1 ? 'ies' : 'y'} arrived from the website`, 'cyan');
    const h = location.hash;
    if (h === '#pipeline' || h === '#enquiries') navigate('pipeline');
    const onFocus = () => { const k = collectInbox(); if (k) toast(`${k} new website enquir${k > 1 ? 'ies' : 'y'}`, 'cyan'); };
    addEventListener('focus', onFocus);
    return () => removeEventListener('focus', onFocus);
  }, [toast]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); setPalette(true); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => setNavOpen(false), [route.key]);

  const nav = NAV.filter((n) => !n.roles || n.roles.includes(role));
  const [page, id, sub] = route;
  const allowed = nav.some((n) => n.id === page) || ['invoice'].includes(page) && role !== 'Crew';

  const alerts = useMemo(() => {
    const a = [];
    s.leads.filter((l) => l.fresh).forEach((l) => a.push({ text: `New enquiry: ${l.clientName} — ${l.type}`, go: 'pipeline', tone: 'cyan' }));
    if (role !== 'Crew') s.invoices.filter((i) => invoiceStatus(i, s.settings) === 'Overdue').forEach((i) => a.push({ text: `${i.number} is overdue`, go: `invoice/${i.id}`, tone: 'red' }));
    crewClashes(s).forEach((c) => a.push({ text: `${s.crew.find((x) => x.id === c.crewId)?.name} is double-booked on ${c.a.date}`, go: 'calendar', tone: 'saffron' }));
    gearClashes(s).forEach((c) => a.push({ text: `${c.gear.name} has overlapping bookings`, go: 'gear', tone: 'saffron' }));
    s.projects.filter((p) => p.status === 'Active').forEach((p) => {
      const over = p.budget.filter((b) => b.actual > b.estimate && b.estimate > 0);
      if (over.length) a.push({ text: `${p.name}: ${over.length} budget line${over.length > 1 ? 's' : ''} over estimate`, go: `productions/${p.id}/budget`, tone: 'saffron' });
    });
    return a;
  }, [s, role]);

  let content;
  if (!allowed) content = <div className="empty"><p className="empty__title">This area isn’t available in the {role} view.</p></div>;
  else if (page === 'control-room') content = <Dashboard alerts={alerts} />;
  else if (page === 'pipeline') content = <Pipeline focus={id} key={route.key} />;
  else if (page === 'productions' && id) content = <ProductionDetail id={id} tab={sub || 'overview'} />;
  else if (page === 'productions') content = <Productions create={route.query.get('new')} key={route.key} />;
  else if (page === 'calendar') content = <Calendar create={route.query.get('new')} key={route.key} />;
  else if (page === 'crew') content = <Crew />;
  else if (page === 'gear') content = <Gear />;
  else if (page === 'clients') content = <Clients />;
  else if (page === 'finance') content = <Finance tab={id || 'invoices'} key={route.key} />;
  else if (page === 'invoice') content = <InvoiceDetail id={id} />;
  else if (page === 'reports') content = <Reports />;
  else if (page === 'settings') content = <Settings />;
  else content = <Dashboard alerts={alerts} />;

  return (
    <div className={cx('app', navOpen && 'nav-open')}>
      <aside className="side" aria-label="Studio navigation">
        <a className="side__brand" href="#/control-room">
          <img src="media/ap-logo.jpeg" alt="" width="36" height="36" />
          <span><b>AMAN</b><small>STUDIO OS</small></span>
        </a>
        <button className="side__search" onClick={() => setPalette(true)}><Search size={15} /><span>Search or jump to…</span><kbd>⌘K</kbd></button>
        <nav className="side__nav">
          {nav.map((n) => {
            const count = n.badge?.(s) || 0;
            return (
              <a key={n.id} href={`#/${n.id}`} className={cx('side__link', (page === n.id || (n.id === 'finance' && page === 'invoice')) && 'is-active')} aria-current={page === n.id ? 'page' : undefined}>
                <n.icon size={18} strokeWidth={1.6} /><span>{n.label}</span>
                {count > 0 && <em className={cx('side__count', n.alert && 'is-alert', n.quiet && 'is-quiet')}>{count}</em>}
              </a>
            );
          })}
        </nav>
        <div className="side__foot">
          <a className="side__site" href="./" ><ArrowUpRight size={14} /> View the public website</a>
          <div className="side__demo"><i />Saved in this browser</div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <div className="main">
        <header className="top">
          <button className="btn btn--ghost btn--icon top__menu" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
          <button className="top__search" onClick={() => setPalette(true)}><Search size={15} /><span>Search productions, people, invoices…</span><kbd>⌘K</kbd></button>
          <div className="top__right">
            <QuickAdd />
            <div className="bell">
              <button className="btn btn--ghost btn--icon" onClick={() => setBell((v) => !v)} aria-label={`Notifications (${alerts.length})`} aria-expanded={bell}><Bell size={18} />{alerts.length > 0 && <i className="bell__dot">{alerts.length}</i>}</button>
              {bell && (
                <div className="pop bell__pop" onMouseLeave={() => setBell(false)}>
                  <p className="pop__title">Needs attention</p>
                  {alerts.length === 0 && <p className="muted small">All clear. Nothing is on fire.</p>}
                  {alerts.slice(0, 8).map((a, i) => <a key={i} href={`#/${a.go}`} className="pop__item" onClick={() => setBell(false)}><i className={`dot dot--${a.tone}`} />{a.text}</a>)}
                </div>
              )}
            </div>
            <button className="btn btn--ghost btn--icon" onClick={() => actions.saveSettings({ theme: s.settings.theme === 'dark' ? 'light' : 'dark' })} aria-label="Toggle light or dark theme">{s.settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <RoleSwitch />
          </div>
        </header>
        <main className="content" id="content">{content}</main>
      </div>

      <nav className="tabbar" aria-label="Quick navigation">
        {nav.slice(0, 4).map((n) => <a key={n.id} href={`#/${n.id}`} className={page === n.id ? 'is-active' : ''}><n.icon size={20} strokeWidth={1.6} /><span>{n.label.split(' ')[0]}</span></a>)}
        <button onClick={() => setNavOpen(true)}><Menu size={20} strokeWidth={1.6} /><span>More</span></button>
      </nav>

      {palette && <Palette onClose={() => setPalette(false)} nav={nav} />}
    </div>
  );
}

function RoleSwitch() {
  const s = useStudio();
  const [open, setOpen] = useState(false);
  const roles = [['Owner', 'Everything, including finance & reports'], ['Producer', 'Productions, pipeline and finance'], ['Crew', 'Schedules, tasks and call sheets only']];
  return (
    <div className="role">
      <button className="role__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}><Avatar name={s.settings.userName} size={30} color="var(--cyan-deep)" /><span><b>{s.settings.userName}</b><small>{s.settings.role}</small></span></button>
      {open && (
        <div className="pop role__pop" onMouseLeave={() => setOpen(false)}>
          <p className="pop__title">View the studio as…</p>
          {roles.map(([r, d]) => (
            <button key={r} className={cx('pop__item', s.settings.role === r && 'is-active')} onClick={() => { actions.saveSettings({ role: r }); setOpen(false); }}>
              <span><b>{r}</b><small>{d}</small></span>
            </button>
          ))}
          <p className="pop__note">Role views are a preview of permissions. Real sign-in arrives with the live backend.</p>
        </div>
      )}
    </div>
  );
}

function QuickAdd() {
  const [open, setOpen] = useState(false);
  const items = [
    { label: 'New lead', icon: UserPlus, go: 'pipeline/new' },
    { label: 'New event production', icon: PartyPopper, go: 'productions?new=event' },
    { label: 'New film production', icon: Film, go: 'productions?new=film' },
    { label: 'New invoice', icon: FileText, go: 'finance/new' },
    { label: 'Schedule something', icon: CalendarDays, go: 'calendar?new=1' },
  ];
  return (
    <div className="quick">
      <button className="btn btn--primary" onClick={() => setOpen((v) => !v)} aria-expanded={open}><Plus size={16} /><span className="hide-sm">Create</span></button>
      {open && (
        <div className="pop quick__pop" onMouseLeave={() => setOpen(false)}>
          {items.map((i) => <a key={i.label} href={`#/${i.go}`} className="pop__item" onClick={() => setOpen(false)}><i.icon size={16} />{i.label}</a>)}
        </div>
      )}
    </div>
  );
}

// ── Command palette ───────────────────────────────────────────────────────────
function Palette({ onClose, nav }) {
  const s = useStudio();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const all = [
      ...nav.map((n) => ({ group: 'Go to', label: n.label, icon: n.icon, go: n.id })),
      { group: 'Create', label: 'New lead', icon: UserPlus, go: 'pipeline/new' },
      { group: 'Create', label: 'New event production', icon: PartyPopper, go: 'productions?new=event' },
      { group: 'Create', label: 'New film production', icon: Film, go: 'productions?new=film' },
      ...(s.settings.role !== 'Crew' ? [{ group: 'Create', label: 'New invoice', icon: FileText, go: 'finance/new' }] : []),
      ...s.projects.map((p) => ({ group: 'Productions', label: p.name, hint: `${p.code} · ${p.location}`, icon: p.kind === 'film' ? Film : PartyPopper, go: `productions/${p.id}` })),
      ...s.leads.map((l) => ({ group: 'Pipeline', label: l.title, hint: `${l.clientName} · ${l.stage}`, icon: Workflow, go: `pipeline/${l.id}` })),
      ...s.crew.map((c) => ({ group: 'People', label: c.name, hint: c.role, icon: Users, go: 'crew' })),
      ...s.clients.map((c) => ({ group: 'Clients', label: c.name, hint: c.city, icon: Building2, go: 'clients' })),
      ...(s.settings.role !== 'Crew' ? s.invoices.map((i) => ({ group: 'Finance', label: `${i.kind} ${i.number}`, hint: s.projects.find((p) => p.id === i.projectId)?.name || i.clientName || '', icon: Receipt, go: `invoice/${i.id}` })) : []),
    ];
    const term = q.trim().toLowerCase();
    if (!term) return all.filter((r) => r.group === 'Go to' || r.group === 'Create');
    return all.filter((r) => `${r.label} ${r.hint || ''}`.toLowerCase().includes(term)).slice(0, 14);
  }, [q, s, nav]);
  useEffect(() => setSel(0), [q]);
  const go = (r) => { navigate(r.go); onClose(); };
  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={onClose}>
      <div className="palette__box" onClick={(e) => e.stopPropagation()}>
        <div className="palette__input"><Command size={16} /><input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a production, person, invoice or command…"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(results.length - 1, v + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(0, v - 1)); }
            if (e.key === 'Enter' && results[sel]) go(results[sel]);
          }} aria-label="Search" /></div>
        <ul className="palette__list" role="listbox">
          {results.map((r, i) => (
            <li key={r.group + r.label + i} role="option" aria-selected={i === sel}>
              {(i === 0 || results[i - 1].group !== r.group) && <p className="palette__group">{r.group}</p>}
              <button className={cx('palette__item', i === sel && 'is-sel')} onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
                <r.icon size={16} strokeWidth={1.6} /><span>{r.label}</span>{r.hint && <small>{r.hint}</small>}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="palette__none">No matches for “{q}”.</li>}
        </ul>
        <p className="palette__foot"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>↵</kbd> to open · <kbd>esc</kbd> to close</p>
      </div>
    </div>
  );
}
