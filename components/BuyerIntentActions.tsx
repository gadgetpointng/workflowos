'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  leadId?: string | null;
  canContact: boolean;
  workflowTaskId?: string | null;
  workflowStage?: string | null;
};

export default function BuyerIntentActions({ id, leadId, canContact, workflowTaskId, workflowStage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch('/api/buyer-intents', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage({ tone: 'error', text: payload.error || 'Action could not be completed.' }); return; }
      const successText = action === 'refresh_match' ? 'Product matches refreshed.' : action === 'create_task' ? 'Buyer work task created.' : action === 'mark_sourcing' ? 'Buyer request moved into sourcing work.' : action === 'convert_to_lead' ? 'Sales lead created.' : 'Buyer demand closed.';
      setMessage({ tone: 'success', text: successText });
      router.refresh();
    } catch { setMessage({ tone: 'error', text: 'Connection problem. Nothing was changed.' }); }
    finally { setBusy(''); }
  }

  const stageLabel = workflowStage === 'sourcing_required' ? 'Sourcing required' : workflowTaskId ? 'Product search task' : null;

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {!workflowTaskId && <button type="button" className="ios-action primary-button min-h-[42px] rounded-[13px]" disabled={Boolean(busy)} onClick={() => act('create_task')}>{busy === 'create_task' ? 'Creating task…' : 'Create buyer task'}</button>}
      {workflowTaskId && <Link href="/tasks" className="ios-action primary-button inline-flex min-h-[42px] items-center rounded-[13px] px-4 text-sm font-bold">Open work task →</Link>}
      <button type="button" className="ios-action secondary-button min-h-[42px] rounded-[13px]" disabled={Boolean(busy)} onClick={() => act('refresh_match')}>{busy === 'refresh_match' ? 'Matching…' : 'Check inventory again'}</button>
      <button type="button" className="ios-action secondary-button min-h-[42px] rounded-[13px]" disabled={Boolean(busy)} onClick={() => act('mark_sourcing')}>{busy === 'mark_sourcing' ? 'Moving to sourcing…' : workflowStage === 'sourcing_required' ? 'Sourcing active' : 'Needs sourcing'}</button>
      {!leadId && canContact && <button type="button" className="ios-action secondary-button min-h-[42px] rounded-[13px]" disabled={Boolean(busy)} onClick={() => act('convert_to_lead')}>{busy === 'convert_to_lead' ? 'Creating lead…' : 'Create sales lead'}</button>}
      {leadId && <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Sales lead created</span>}
      {stageLabel && <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{stageLabel}</span>}
      {!leadId && !canContact && <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Contact permission required for Sales</span>}
      <button type="button" className="ios-action min-h-[42px] rounded-[13px] border border-red-200 bg-white px-4 text-sm font-bold text-red-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(busy)} onClick={() => act('close')}>{busy === 'close' ? 'Closing…' : 'Close demand'}</button>
    </div>
    {message && <div aria-live="polite" className={`inline-flex rounded-xl px-3 py-2 text-xs font-bold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
  </div>;
}
