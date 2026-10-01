import React, { useMemo, useState } from 'react';
import { Plus, Printer, ArrowLeft, Trash2, Wallet, IndianRupee, AlertTriangle, Receipt, ArrowRight, MessageCircle } from 'lucide-react';
import { useStudio, actions } from '../store.js';
import { Button, Card, Field, Modal, PageHead, Stat, StatusBadge, Tabs, useUI, Empty, InlineEdit } from '../ui.jsx';
import { inr, compactInr, fmtDate, today, addDays, sum, invoiceTotals, invoiceStatus, uid } from '../lib.js';
import { navigate } from '../App.jsx';

export function Finance({ tab }) {
  const s = useStudio();
  const creating = tab === 'new';
  const current = creating ? 'invoices' : tab;
  const rows = useMemo(() => s.invoices.map((i) => ({ i, t: invoiceTotals(i, s.settings), st: invoiceStatus(i, s.settings), p: s.projects.find((p) => p.id === i.projectId) })), [s]);
  const invs = rows.filter((r) => r.i.kind === 'Invoice');
  const quotes = rows.filter((r) => r.i.kind === 'Quote');
  const payments = invs.flatMap((r) => r.i.payments.map((p) => ({ ...p, inv: r.i, proj: r.p }))).sort((a, b) => b.date.localeCompare(a.date));
  const month = today().slice(0, 7);
  const overdue = invs.filter((r) => r.st === 'Overdue');
  const projectFromQuery = new URLSearchParams(location.hash.split('?')[1] || '').get('project');

  return (
    <div>
      <PageHead eyebrow="Finance" title="Money, with nothing left to chance."
        actions={<Button variant="primary" icon={Plus} onClick={() => navigate('finance/new')}>New invoice</Button>}>
        Quotes, GST invoices and payments. Amounts in INR.
      </PageHead>
      <div className="stats">
        <Stat label="Collected this month" value={compactInr(sum(payments.filter((p) => p.date.startsWith(month)), (p) => p.amount))} icon={Wallet} />
        <Stat label="Collected all time" value={compactInr(sum(payments, (p) => p.amount))} sub={`${payments.length} payments`} />
        <Stat label="Outstanding" value={compactInr(sum(invs.filter((r) => r.st !== 'Draft'), (r) => r.t.balance))} sub={`${invs.filter((r) => r.t.balance > 0 && r.st !== 'Draft').length} invoices`} icon={IndianRupee} />
        <Stat label="Overdue" value={compactInr(sum(overdue, (r) => r.t.balance))} sub={overdue.length ? `${overdue.length} need chasing` : 'Nothing overdue'} tone={overdue.length ? 'warn' : undefined} icon={AlertTriangle} />
      </div>
      <Tabs value={current} onChange={(t) => navigate(`finance/${t}`)} tabs={[{ id: 'invoices', label: 'Invoices', count: invs.length }, { id: 'quotes', label: 'Quotes', count: quotes.length }, { id: 'payments', label: 'Payments', count: payments.length }]} />
      {current === 'invoices' && <DocTable rows={invs} />}
      {current === 'quotes' && <DocTable rows={quotes} quotes />}
      {current === 'payments' && (
        payments.length === 0 ? <Empty icon={Wallet} title="No payments yet." /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Date</th><th>Invoice</th><th>Production</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id} className="is-link" onClick={() => navigate(`invoice/${p.inv.id}`)}><td>{fmtDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="mono">{p.inv.number}</td><td>{p.proj?.name || '—'}</td><td>{p.method}</td><td className="mono">{p.ref}</td><td className="num">{inr(p.amount)}</td></tr>)}</tbody>
          </table></div>
        )
      )}
      {creating && <NewInvoice projectId={projectFromQuery} onClose={() => navigate('finance')} />}
    </div>
  );
}

function DocTable({ rows, quotes }) {
  if (!rows.length) return <Empty icon={Receipt} title={quotes ? 'No quotes yet.' : 'No invoices yet.'}>{quotes ? 'Draft one from a lead in the pipeline.' : 'Create one from a production.'}</Empty>;
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Number</th><th>For</th><th>Issued</th><th>{quotes ? 'Valid until' : 'Due'}</th><th className="num">Total</th>{!quotes && <th className="num">Balance</th>}<th>Status</th></tr></thead>
      <tbody>{rows.sort((a, b) => (b.i.issueDate || '').localeCompare(a.i.issueDate || '')).map(({ i, t, st, p }) => (
        <tr key={i.id} className="is-link" onClick={() => navigate(`invoice/${i.id}`)}>
          <td className="mono">{i.number}</td><td>{p?.name || i.clientName || '—'}</td><td>{fmtDate(i.issueDate)}</td><td>{fmtDate(i.dueDate)}</td>
          <td className="num">{inr(t.total)}</td>{!quotes && <td className="num">{inr(t.balance)}</td>}<td><StatusBadge status={st} /></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function NewInvoice({ projectId, onClose }) {
  const s = useStudio();
  const projects = s.projects.filter((p) => p.status !== 'Wrapped' || p.id === projectId);
  const [pid, setPid] = useState(projectId || projects[0]?.id || '');
  const p = s.projects.find((x) => x.id === pid);
  const invoiced = sum(s.invoices.filter((i) => i.kind === 'Invoice' && i.projectId === pid), (i) => invoiceTotals(i, s.settings).subtotal);
  const left = Math.max(0, (p?.fee || 0) - invoiced);
  const [share, setShare] = useState(50);
  const amount = Math.round(left * share / 100);
  const create = () => {
    const id = actions.saveInvoice({
      kind: 'Invoice', status: 'Sent', projectId: pid, clientId: p?.clientId, issueDate: today(), dueDate: addDays(today(), 14), gst: true, notes: '',
      items: [{ desc: `${p?.service || 'Production'} — ${share === 100 ? 'balance' : `instalment (${share}% of remaining)`}`, qty: 1, rate: amount }],
    });
    navigate(`invoice/${id}`);
  };
  return (
    <Modal open onClose={onClose} title="New invoice" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={create} disabled={!pid}>Create & open</Button></>}>
      <div className="form-grid">
        <Field label="Production" span={2}><select value={pid} onChange={(e) => setPid(e.target.value)}>{projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Contract value"><input readOnly value={inr(p?.fee || 0)} /></Field>
        <Field label="Already invoiced (ex-GST)"><input readOnly value={inr(invoiced)} /></Field>
        <Field label="Invoice for" span={2} hint={`${inr(amount)} + GST of ${inr(left)} left to invoice`}>
          <div className="segmented">{[25, 40, 50, 100].map((n) => <button key={n} type="button" aria-pressed={share === n} className={share === n ? 'is-active' : ''} onClick={() => setShare(n)}>{n === 100 ? 'Full balance' : `${n}%`}</button>)}</div>
        </Field>
      </div>
      <p className="muted small">You can edit line items, dates and GST on the next screen.</p>
    </Modal>
  );
}

export function InvoiceDetail({ id }) {
  const s = useStudio();
  const { toast, confirm } = useUI();
  const [paying, setPaying] = useState(false);
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return <Empty icon={Receipt} title="Invoice not found." action={<a className="btn" href="#/finance">Back to finance</a>} />;
  const t = invoiceTotals(inv, s.settings);
  const st = invoiceStatus(inv, s.settings);
  const p = s.projects.find((x) => x.id === inv.projectId);
  const client = s.clients.find((c) => c.id === (inv.clientId || p?.clientId));
  const save = (fn) => { const draft = structuredClone(inv); fn(draft); actions.saveInvoice(draft); };
  const isQuote = inv.kind === 'Quote';
  const wa = (client?.phone || '').replace(/[^\d]/g, '');
  const reminder = `Hello ${client?.name || ''}, a gentle reminder from ${s.settings.company}: ${inv.number} for ${inr(t.balance)} ${st === 'Overdue' ? 'was due' : 'is due'} on ${fmtDate(inv.dueDate, { day: 'numeric', month: 'long' })}. Thank you!`;

  return (
    <div>
      <a className="back no-print" href={`#/finance/${isQuote ? 'quotes' : 'invoices'}`}><ArrowLeft size={15} /> Finance</a>
      <div className="invoice-layout">
        <article className="invoice print-area">
          <header className="invoice__head">
            <div className="invoice__brand"><img src="media/ap-logo.jpeg" alt="" width="56" height="56" /><div><b>{s.settings.company}</b><small>{s.settings.tagline}</small><small>{s.settings.address}</small><small>{s.settings.phone}{s.settings.email && ` · ${s.settings.email}`}</small>{s.settings.gstin && <small>GSTIN {s.settings.gstin}</small>}</div></div>
            <div className="invoice__title"><h1>{isQuote ? 'Quotation' : 'Tax invoice'}</h1><p className="mono">{inv.number}</p><StatusBadge status={st} /></div>
          </header>
          <div className="invoice__meta">
            <div><span>Billed to</span><b>{client?.name || inv.clientName || '—'}</b>{client?.company && client.company !== client.name && <small>{client.company}</small>}<small>{client?.city}</small></div>
            <div><span>For</span><b>{p?.name || 'Proposed production'}</b>{p && <small>{p.code}</small>}</div>
            <div><span>Issued</span><input type="date" value={inv.issueDate || ''} onChange={(e) => save((d) => { d.issueDate = e.target.value; })} aria-label="Issue date" /></div>
            <div><span>{isQuote ? 'Valid until' : 'Due'}</span><input type="date" value={inv.dueDate || ''} onChange={(e) => save((d) => { d.dueDate = e.target.value; })} aria-label="Due date" /></div>
          </div>
          <table className="invoice__items">
            <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th className="no-print" /></tr></thead>
            <tbody>
              {inv.items.map((it, k) => (
                <tr key={k}>
                  <td><InlineEdit value={it.desc} onSave={(v) => save((d) => { d.items[k].desc = v; })} ariaLabel="Description" /></td>
                  <td className="num" style={{ width: 70 }}><InlineEdit type="number" value={it.qty} onSave={(v) => save((d) => { d.items[k].qty = v; })} ariaLabel="Quantity" /></td>
                  <td className="num" style={{ width: 130 }}><InlineEdit type="number" value={it.rate} onSave={(v) => save((d) => { d.items[k].rate = v; })} ariaLabel="Rate" format={inr} /></td>
                  <td className="num">{inr(it.qty * it.rate)}</td>
                  <td className="no-print"><button className="icon-x" aria-label="Remove line" onClick={() => save((d) => { d.items.splice(k, 1); })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="link no-print" onClick={() => save((d) => { d.items.push({ desc: 'New item', qty: 1, rate: 0 }); })}><Plus size={14} /> Add line</button>
          <div className="invoice__totals">
            <div><span>Subtotal</span><b>{inr(t.subtotal)}</b></div>
            {inv.gst ? <><div><span>CGST @ {t.rate / 2}%</span><b>{inr(t.cgst)}</b></div><div><span>SGST @ {t.rate / 2}%</span><b>{inr(t.sgst)}</b></div></> : <div><span>GST</span><b>Not applied</b></div>}
            <div className="is-total"><span>Total</span><b>{inr(t.total)}</b></div>
            {!isQuote && t.paid > 0 && <><div><span>Paid</span><b>− {inr(t.paid)}</b></div><div className="is-total"><span>Balance due</span><b>{inr(t.balance)}</b></div></>}
          </div>
          {s.settings.bank && <p className="invoice__bank"><b>Payment details</b><br />{s.settings.bank}</p>}
          <p className="invoice__demo">{s.settings.gstin ? 'Thank you for letting us tell your story.' : 'Client preview — not a valid tax invoice until the studio’s GSTIN and registered details are added in Settings.'}</p>
        </article>

        <aside className="stack no-print">
          <Card title="Actions">
            <div className="stack stack--tight">
              <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print / save PDF</Button>
              {!isQuote && t.balance > 0 && st !== 'Draft' && <Button icon={Wallet} onClick={() => setPaying(true)}>Record a payment</Button>}
              {!isQuote && st === 'Draft' && <Button onClick={() => save((d) => { d.status = 'Sent'; })}>Mark as sent</Button>}
              {!isQuote && t.balance > 0 && wa && <a className="btn" href={`https://wa.me/${wa}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noopener"><MessageCircle size={16} /> Send reminder on WhatsApp</a>}
              {isQuote && <>
                <select className="select-sm" value={inv.status} onChange={(e) => save((d) => { d.status = e.target.value; })} aria-label="Quote status">{['Draft', 'Sent', 'Accepted', 'Declined'].map((x) => <option key={x}>{x}</option>)}</select>
                <Button icon={ArrowRight} onClick={() => { const nid = actions.quoteToInvoice(inv.id); save((d) => { d.status = 'Accepted'; }); toast('Invoice created from the quote', 'green'); navigate(`invoice/${nid}`); }}>Convert to invoice</Button>
              </>}
              <label className="check"><input type="checkbox" checked={!!inv.gst} onChange={(e) => save((d) => { d.gst = e.target.checked; })} /> Apply GST ({s.settings.gstRate}%)</label>
              <Button variant="ghost" icon={Trash2} onClick={async () => { if (await confirm({ title: `Delete ${inv.number}?`, text: 'This can’t be undone.', danger: true, ok: 'Delete' })) { actions.deleteInvoice(inv.id); navigate('finance'); } }}>Delete</Button>
            </div>
          </Card>
          {!isQuote && (
            <Card title="Payment history" pad={false}>
              {inv.payments.length === 0 ? <p className="muted small" style={{ padding: '0 20px 16px' }}>No payments recorded yet.</p> : (
                <ul className="log">{inv.payments.map((pm) => <li key={pm.id}><i className="dot dot--money" /><span>{inr(pm.amount)} · {pm.method}<br /><small className="muted">{fmtDate(pm.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {pm.ref}</small></span></li>)}</ul>
              )}
            </Card>
          )}
          <p className="muted small">Recording a payment updates the studio’s books only — no money is moved.</p>
        </aside>
      </div>
      {paying && <PaymentModal inv={inv} balance={t.balance} onClose={() => setPaying(false)} />}
    </div>
  );
}

function PaymentModal({ inv, balance, onClose }) {
  const { toast } = useUI();
  const [amount, setAmount] = useState(balance);
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState('UPI');
  const [ref, setRef] = useState('');
  const submit = () => {
    const a = Number(amount);
    if (!a || a <= 0) { toast('Enter an amount.', 'red'); return; }
    if (a > balance) { toast(`That’s more than the ${inr(balance)} balance.`, 'red'); return; }
    actions.recordPayment(inv.id, { amount: a, date, method, ref });
    toast(a === balance ? 'Paid in full 🎉' : 'Part-payment recorded', 'green');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Payment on ${inv.number}`} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Record payment</Button></>}>
      <div className="form-grid">
        <Field label="Amount (₹)" hint={`Balance ${inr(balance)}`}><input type="number" min="1" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Method"><select value={method} onChange={(e) => setMethod(e.target.value)}>{['UPI', 'Bank transfer', 'Cheque', 'Cash', 'Card'].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Reference"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR / cheque no." /></Field>
      </div>
    </Modal>
  );
}
