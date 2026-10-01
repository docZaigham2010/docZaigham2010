import React, { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cx, initials } from './lib.js';

export function Button({ variant = 'default', size, icon: Icon, children, className, ...rest }) {
  return (
    <button className={cx('btn', `btn--${variant}`, size && `btn--${size}`, !children && 'btn--icon', className)} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.75} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Badge({ tone = 'neutral', children, dot }) {
  return <span className={cx('badge', `badge--${tone}`)}>{dot && <i className="badge__dot" />}{children}</span>;
}

export const STATUS_TONE = {
  New: 'cyan', Contacted: 'blue', Proposal: 'violet', Negotiation: 'saffron', Won: 'green', Lost: 'muted',
  Active: 'cyan', 'On hold': 'saffron', Wrapped: 'muted',
  Draft: 'muted', Sent: 'blue', 'Part-paid': 'saffron', Paid: 'green', Overdue: 'red', Accepted: 'green', Declined: 'muted',
  'Not started': 'muted', 'In progress': 'blue', 'In review': 'saffron', Delivered: 'green',
  Planned: 'muted', Shot: 'green', 'Pick-up': 'saffron',
  Available: 'green', Booked: 'blue', Maintenance: 'red',
  Event: 'cyan', Shoot: 'saffron', Recce: 'violet', Meeting: 'blue', Deadline: 'red', 'Invoice due': 'pink', Other: 'muted',
  todo: 'muted', doing: 'blue', done: 'green',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'neutral'} dot>{status}</Badge>;

export function Card({ title, action, children, className, pad = true, ...rest }) {
  return (
    <section className={cx('card', className)} {...rest}>
      {(title || action) && <header className="card__head"><h2>{title}</h2>{action}</header>}
      <div className={pad ? 'card__body' : ''}>{children}</div>
    </section>
  );
}

export function Avatar({ name, size = 32, color }) {
  const hue = [...(name || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * .36, background: color || `hsl(${hue} 35% 26%)`, color: `hsl(${hue} 70% 82%)` }} aria-hidden="true">{initials(name)}</span>;
}

export function Progress({ value, tone = 'cyan', label }) {
  return <div className={cx('progress', `progress--${tone}`)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin="0" aria-valuemax="100" aria-label={label}><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <span className="empty__icon"><Icon size={22} strokeWidth={1.5} /></span>}
      <p className="empty__title">{title}</p>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone, trend, meter }) {
  return (
    <div className={cx('stat', tone && `stat--${tone}`)}>
      <div className="stat__top"><span>{Icon && <i className="stat__icon"><Icon size={15} strokeWidth={1.75} /></i>}{label}</span>{meter != null && <em className="stat__pct">{Math.round(meter * 100)}%</em>}</div>
      <p className="stat__value">{value}</p>
      {meter != null && <div className="capsules" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} className={i < Math.round(meter * 8) ? 'on' : ''} />)}</div>}
      {sub && <p className="stat__sub">{trend && <b className={trend > 0 ? 'up' : 'down'}>{trend > 0 ? '▲' : '▼'}</b>}{sub}</p>}
    </div>
  );
}

export function Field({ label, hint, children, className, span }) {
  return (
    <label className={cx('field', className)} style={span ? { gridColumn: `span ${span}` } : undefined}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={cx('tab', value === t.id && 'is-active')} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={15} strokeWidth={1.75} />}{t.label}{t.count != null && <span className="tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <button key={v} aria-pressed={value === v} className={value === v ? 'is-active' : ''} onClick={() => onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

// Native <dialog> keeps focus management and Escape behaviour for free
export function Modal({ open, onClose, title, children, footer, size = 'md', kind = 'modal' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={cx(kind, `${kind}--${size}`)} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label={title}>
      {open && (
        <div className={`${kind}__inner`}>
          <header className={`${kind}__head`}><h2>{title}</h2><button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
          <div className={`${kind}__body`}>{children}</div>
          {footer && <footer className={`${kind}__foot`}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
export const Drawer = (props) => <Modal kind="drawer" {...props} />;

// ── Toasts & confirm ─────────────────────────────────────────────────────────
const UIContext = createContext(null);
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirm] = useState(null);
  const toast = useCallback((text, tone = 'default') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setConfirm({ ...opts, resolve })), []);
  const close = (v) => { confirmState?.resolve(v); setConfirm(null); };
  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={cx('toast', `toast--${t.tone}`)}>{t.text}</div>)}</div>
      <Modal open={!!confirmState} onClose={() => close(false)} title={confirmState?.title || 'Are you sure?'} size="sm"
        footer={<><Button variant="ghost" onClick={() => close(false)}>Cancel</Button><Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{confirmState?.ok || 'Confirm'}</Button></>}>
        <div className="confirm">{confirmState?.danger && <AlertTriangle size={20} />}<p>{confirmState?.text}</p></div>
      </Modal>
    </UIContext.Provider>
  );
}
export const useUI = () => useContext(UIContext);

// Controlled form helper
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const bind = (k, opts = {}) => ({
    value: values[k] ?? '',
    onChange: (e) => setValues((v) => ({ ...v, [k]: opts.number ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })),
  });
  return { values, setValues, bind, set: (k, val) => setValues((v) => ({ ...v, [k]: val })) };
}

// Inline-editable text cell
export function InlineEdit({ value, onSave, type = 'text', className, placeholder, ariaLabel, format }) {
  const [v, setV] = useState(value ?? '');
  const [focus, setFocus] = useState(false);
  useEffect(() => setV(value ?? ''), [value]);
  // Money cells read as ₹1,80,000 at rest and become a plain number while editing
  const shown = format && !focus ? format(v) : v;
  return (
    <input className={cx('inline-edit', className)} type={format ? 'text' : type} inputMode={type === 'number' ? 'numeric' : undefined} value={shown} placeholder={placeholder} aria-label={ariaLabel}
      onFocus={() => setFocus(true)}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { setFocus(false); if (String(v) !== String(value ?? '')) onSave(type === 'number' ? Number(String(v).replace(/[^\d.-]/g, '')) || 0 : v); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur(); } }} />
  );
}

export const PageHead = ({ eyebrow, title, children, actions }) => (
  <header className="page-head">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <p className="page-head__sub">{children}</p>}
    </div>
    {actions && <div className="page-head__actions">{actions}</div>}
  </header>
);
