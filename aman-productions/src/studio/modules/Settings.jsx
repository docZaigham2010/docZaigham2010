import React, { useRef } from 'react';
import { Download, Upload, RotateCcw, ShieldCheck, Database, Users, Mail, Cloud } from 'lucide-react';
import { useStudio, actions, exportData, importData, resetDemo } from '../store.js';
import { Button, Card, Field, PageHead, useForm, useUI, Segmented } from '../ui.jsx';

export default function Settings() {
  const s = useStudio();
  const { toast, confirm } = useUI();
  const file = useRef(null);
  const { values: v, bind } = useForm({ ...s.settings });
  const owner = s.settings.role === 'Owner';
  return (
    <div>
      <PageHead eyebrow="Settings" title="The studio, configured." />
      <div className="grid-2 grid-2--wide">
        <Card title="Business details" action={<Button variant="primary" size="sm" onClick={() => { actions.saveSettings({ ...v, gstRate: Number(v.gstRate) || 0 }); toast('Settings saved'); }} disabled={!owner}>Save</Button>}>
          {!owner && <p className="muted small">Switch to the Owner view to edit business details.</p>}
          <fieldset disabled={!owner} className="bare">
            <div className="form-grid">
              <Field label="Company name"><input {...bind('company')} /></Field>
              <Field label="Tagline"><input {...bind('tagline')} /></Field>
              <Field label="Address" span={2}><input {...bind('address')} /></Field>
              <Field label="Phone"><input {...bind('phone')} /></Field>
              <Field label="Email"><input type="email" {...bind('email')} /></Field>
              <Field label="GSTIN" hint="Shown on invoices. Leave empty in the preview."><input {...bind('gstin')} placeholder="01XXXXX0000X1ZX" /></Field>
              <Field label="GST rate (%)"><input type="number" min="0" max="28" {...bind('gstRate', { number: true })} /></Field>
              <Field label="Invoice number prefix"><input {...bind('invoicePrefix')} /></Field>
              <Field label="Quote number prefix"><input {...bind('quotePrefix')} /></Field>
              <Field label="Bank / UPI details for invoices" span={2}><textarea rows={2} {...bind('bank')} placeholder="Account name · A/C no. · IFSC · UPI ID" /></Field>
              <Field label="Your name"><input {...bind('userName')} /></Field>
            </div>
          </fieldset>
        </Card>
        <div className="stack">
          <Card title="Appearance">
            <Segmented options={[{ value: 'dark', label: 'Dark — control room' }, { value: 'light', label: 'Light — daylight' }]} value={s.settings.theme} onChange={(t) => actions.saveSettings({ theme: t })} label="Theme" />
          </Card>
          <Card title="Your data">
            <p className="muted small" style={{ marginTop: 0 }}>In this client preview, everything is stored in this browser only. Export a copy any time.</p>
            <div className="row">
              <Button icon={Download} onClick={exportData}>Export JSON</Button>
              <Button icon={Upload} onClick={() => file.current.click()}>Import</Button>
              <Button variant="ghost" icon={RotateCcw} onClick={async () => { if (await confirm({ title: 'Reset the demo workspace?', text: 'All changes in this browser will be replaced by the original sample data.', danger: true, ok: 'Reset' })) { resetDemo(); toast('Demo data restored'); } }}>Reset demo</Button>
              <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return;
                try { importData(JSON.parse(await f.text())); toast('Workspace imported', 'green'); } catch (err) { toast(err.message || 'Could not import that file', 'red'); }
                e.target.value = '';
              }} />
            </div>
          </Card>
          <Card title="Going live — what changes" className="golive">
            <ul className="checks">
              <li><Cloud size={16} /><span><b>Shared cloud database</b> — every device and team member sees the same live data.</span></li>
              <li><Users size={16} /><span><b>Real sign-in & roles</b> — Owner, Producer and Crew permissions enforced on the server.</span></li>
              <li><Mail size={16} /><span><b>Live enquiries</b> — website scenes land in the pipeline and notify the team on WhatsApp/email.</span></li>
              <li><Database size={16} /><span><b>Files & backups</b> — contracts, moodboards and deliverables stored with daily backups.</span></li>
              <li><ShieldCheck size={16} /><span><b>Registered GST invoices</b> — with the studio’s GSTIN, sequential numbering and audit history.</span></li>
            </ul>
            <p className="muted small">The data layer is already isolated in one module, so connecting a backend doesn’t require redesigning any screen.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
