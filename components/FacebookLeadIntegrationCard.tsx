'use client';

import { FormEvent, useEffect, useState } from 'react';

type Staff = { id: string; full_name?: string | null; email?: string | null; role?: string | null };
type State = {
  canManage: boolean;
  ready: boolean;
  webhookUrl: string;
  verifyToken?: string;
  verifyTokenSource?: 'workspace' | 'environment' | 'missing';
  env: { verifyToken: boolean; appSecret: boolean; pageAccessToken: boolean; graphVersion: boolean };
  integration: null | { pageId?: string; pageName?: string; defaultAssigneeId?: string; followupMinutes?: number; status?: string; lastSyncedAt?: string | null };
  staff: Staff[];
  eventCounts: Record<string, number>;
};

export default function FacebookLeadIntegrationCard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/integrations/facebook-leads', { cache: 'no-store' });
    const body = await response.json();
    if (response.ok) setState(body);
    else setMessage(body.error || 'Could not load Facebook lead integration');
  }

  useEffect(() => { load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/integrations/facebook-leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: form.get('pageId'),
        pageName: form.get('pageName'),
        defaultAssigneeId: form.get('defaultAssigneeId'),
        followupMinutes: Number(form.get('followupMinutes') || 15),
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(body.error || 'Could not save Facebook lead integration'); return; }
    setMessage(body.ready ? 'Facebook lead capture is ready.' : 'Page saved. WorkflowOS generated the webhook verify token; complete the remaining Meta server credentials to activate lead capture.');
    await load();
  }

  async function rotateVerifyToken() {
    if (!state?.integration?.pageId || busy) return;
    setBusy(true); setMessage('');
    const response = await fetch('/api/integrations/facebook-leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: state.integration.pageId,
        pageName: state.integration.pageName || '',
        defaultAssigneeId: state.integration.defaultAssigneeId || '',
        followupMinutes: state.integration.followupMinutes || 15,
        rotateVerifyToken: true,
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(body.error || 'Could not rotate the webhook verify token'); return; }
    setMessage('New Facebook webhook verify token generated. Update the token in Meta before verifying the callback again.');
    await load();
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Could not copy ${label.toLowerCase()} automatically. Select the value and copy it manually.`);
    }
  }

  if (!state) return <section className="rounded-[8px] border border-[#e4e7ec] bg-white p-5 text-sm text-[#697586]">Loading Facebook lead connection…</section>;
  const checks = [
    ['Webhook verify token', state.env.verifyToken],
    ['Meta app secret', state.env.appSecret],
    ['Page access token', state.env.pageAccessToken],
    ['Graph API version', state.env.graphVersion],
  ] as const;

  return <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec] bg-white">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e4e7ec] px-5 py-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2377ff]">Facebook acquisition</div>
        <h2 className="mt-1 text-lg font-black text-[#08111f]">Facebook Leads</h2>
        <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-[#697586]">New Meta lead-form submissions enter WorkflowOS automatically as CRM leads, with deduplication, assignment, notification and follow-up timing.</p>
      </div>
      <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${state.ready ? 'bg-[#edf7ef] text-[#39764a]' : 'bg-[#fff6df] text-[#9a6b16]'}`}>{state.ready ? 'Ready' : state.integration?.status || 'Setup required'}</span>
    </div>

    <div className="grid gap-px bg-[#e4e7ec] sm:grid-cols-4">
      {checks.map(([label, ok]) => <div key={label} className="bg-white p-4"><div className="text-[9px] font-bold uppercase tracking-wide text-[#8b95a3]">{label}</div><div className={`mt-2 text-sm font-black ${ok ? 'text-[#39764a]' : 'text-[#9a6b16]'}`}>{ok ? 'Configured' : 'Missing'}</div></div>)}
    </div>

    <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_.85fr]">
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Facebook Page ID</span><input name="pageId" defaultValue={state.integration?.pageId || ''} disabled={!state.canManage} required className="app-input w-full" placeholder="Page ID" /></label>
          <label><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Page name</span><input name="pageName" defaultValue={state.integration?.pageName || ''} disabled={!state.canManage} className="app-input w-full" placeholder="GadgetPoint" /></label>
          <label><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Default owner</span><select name="defaultAssigneeId" defaultValue={state.integration?.defaultAssigneeId || ''} disabled={!state.canManage} className="app-input w-full"><option value="">Owner / unassigned fallback</option>{state.staff.map(person => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}</select></label>
          <label><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Follow-up SLA</span><select name="followupMinutes" defaultValue={String(state.integration?.followupMinutes || 15)} disabled={!state.canManage} className="app-input w-full"><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></select></label>
        </div>
        {state.canManage && <button disabled={busy} className="workflow-primary-action rounded-md px-4 py-2.5 text-sm font-bold">{busy ? 'Saving…' : 'Save Facebook connection'}</button>}
        {message && <div className="rounded-md border border-[#cfe0ff] bg-[#edf5ff] px-3 py-2 text-xs font-semibold text-[#175fc7]">{message}</div>}
      </form>

      <div className="space-y-3">
        <div className="rounded-md border border-[#e4e7ec] bg-[#f5f6f8] p-4">
          <div className="flex items-center justify-between gap-3"><div className="text-[9px] font-bold uppercase tracking-wide text-[#697586]">Webhook URL</div>{state.canManage && <button type="button" onClick={() => copy(state.webhookUrl, 'Webhook URL')} className="text-[10px] font-bold text-[#2377ff]">Copy</button>}</div>
          <code className="mt-2 block break-all text-[11px] font-semibold text-[#08111f]">{state.webhookUrl}</code>
          <div className="mt-2 text-[11px] leading-5 text-[#697586]">Use this exact URL for the Meta Page <code>leadgen</code> webhook. The workspace identifier keeps verification isolated to GadgetPoint.</div>
        </div>

        <div className="rounded-md border border-[#e4e7ec] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><div className="text-[9px] font-bold uppercase tracking-wide text-[#697586]">Webhook verify token</div>{state.verifyToken && state.canManage && <button type="button" onClick={() => copy(state.verifyToken || '', 'Verify token')} className="text-[10px] font-bold text-[#2377ff]">Copy</button>}</div>
          {state.verifyToken ? <code className="mt-2 block break-all rounded-md bg-[#f5f6f8] px-3 py-2 text-[11px] font-semibold text-[#08111f]">{state.verifyToken}</code> : <div className="mt-2 text-xs font-semibold text-[#697586]">{state.verifyTokenSource === 'environment' ? 'Managed by the production environment.' : 'Save the Facebook Page connection to generate a token.'}</div>}
          {state.canManage && state.integration?.pageId && state.verifyTokenSource !== 'environment' && <button type="button" disabled={busy} onClick={rotateVerifyToken} className="ios-action secondary-button mt-3 rounded-[13px] px-3 py-2 text-xs font-bold">Generate new token</button>}
          <div className="mt-2 text-[11px] leading-5 text-[#697586]">Paste this token into Meta when verifying the callback. It is generated and stored server-side for this workspace rather than exposed as a browser secret.</div>
        </div>

        <div className="grid grid-cols-3 gap-2">{[['Processed', state.eventCounts.processed || 0], ['Pending', state.eventCounts.pending || 0], ['Failed', state.eventCounts.failed || 0]].map(([label, count]) => <div key={String(label)} className="rounded-md border border-[#e4e7ec] p-3"><div className="text-[9px] font-bold uppercase text-[#8b95a3]">{label}</div><div className="mt-1 text-lg font-black text-[#08111f]">{count}</div></div>)}</div>
        <div className="text-[11px] leading-5 text-[#697586]">Remaining server credentials: <code>META_APP_SECRET</code>, <code>META_PAGE_ACCESS_TOKEN</code>, and <code>META_GRAPH_VERSION</code>. The webhook verify token is now managed inside WorkflowOS.</div>
      </div>
    </div>
  </section>;
}
