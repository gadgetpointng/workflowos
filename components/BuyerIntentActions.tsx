'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  leadId?: string | null;
  canContact: boolean;
  workflowTaskId?: string | null;
  workflowStage?: string | null;
  hasInventoryMatch?: boolean;
};

export default function BuyerIntentActions({ id, leadId, canContact, workflowTaskId, workflowStage, hasInventoryMatch = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch('/api/buyer-intents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: 'error', text: payload.error || 'Action could not be completed.' });
        return;
      }
      const successText = action === 'refresh_match'
        ? 'Inventory matches refreshed.'
        : action === 'create_task'
          ? 'Buyer work task created.'
          : action === 'mark_sourcing'
            ? 'Buyer request moved into sourcing.'
            : action === 'convert_to_lead'
              ? 'Sales lead created.'
              : 'Buyer demand closed.';
      setMessage({ tone: 'success', text: successText });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Connection problem. Nothing was changed.' });
    } finally {
      setBusy('');
    }
  }

  const stage = String(workflowStage || '').toLowerCase();
  const sourcing = stage === 'sourcing_required' || stage === 'sourcing';

  let primary: ReactNode;
  let nextLabel = 'Create work task';

  if (!workflowTaskId) {
    primary = <button type="button" className="ios-action primary-button min-h-[42px] rounded-[13px] px-4 text-sm font-black" disabled={Boolean(busy)} onClick={() => act('create_task')}>{busy === 'create_task' ? 'Creating…' : 'Create work task →'}</button>;
  } else if (sourcing) {
    nextLabel = 'Record supplier option';
    primary = <a href={`#sourcing-${id}`} className="ios-action primary-button inline-flex min-h-[42px] items-center rounded-[13px] px-4 text-sm font-black">Record supplier option →</a>;
  } else if (!hasInventoryMatch) {
    nextLabel = 'Move to sourcing';
    primary = <button type="button" className="ios-action primary-button min-h-[42px] rounded-[13px] px-4 text-sm font-black" disabled={Boolean(busy)} onClick={() => act('mark_sourcing')}>{busy === 'mark_sourcing' ? 'Moving…' : 'Move to sourcing →'}</button>;
  } else if (!leadId && canContact) {
    nextLabel = 'Create sales lead';
    primary = <button type="button" className="ios-action primary-button min-h-[42px] rounded-[13px] px-4 text-sm font-black" disabled={Boolean(busy)} onClick={() => act('convert_to_lead')}>{busy === 'convert_to_lead' ? 'Creating…' : 'Create sales lead →'}</button>;
  } else {
    nextLabel = 'Open work task';
    primary = <Link href="/tasks" className="ios-action primary-button inline-flex min-h-[42px] items-center rounded-[13px] px-4 text-sm font-black">Open work task →</Link>;
  }

  return <div className="space-y-3">
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Next action</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {primary}
        <span className="text-xs font-semibold text-slate-500">{nextLabel}</span>
      </div>
    </div>

    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-slate-600">More actions <span className="float-right text-slate-400 group-open:rotate-180">⌄</span></summary>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
        {workflowTaskId && <Link href="/tasks" className="ios-action secondary-button inline-flex min-h-[38px] items-center rounded-[11px] px-3 text-xs font-bold">Open task</Link>}
        <button type="button" className="ios-action secondary-button min-h-[38px] rounded-[11px] px-3 text-xs font-bold" disabled={Boolean(busy)} onClick={() => act('refresh_match')}>{busy === 'refresh_match' ? 'Checking…' : 'Refresh inventory'}</button>
        <button type="button" className="ios-action secondary-button min-h-[38px] rounded-[11px] px-3 text-xs font-bold" disabled={Boolean(busy) || sourcing} onClick={() => act('mark_sourcing')}>{sourcing ? 'Sourcing active' : 'Needs sourcing'}</button>
        {!leadId && canContact && <button type="button" className="ios-action secondary-button min-h-[38px] rounded-[11px] px-3 text-xs font-bold" disabled={Boolean(busy)} onClick={() => act('convert_to_lead')}>{busy === 'convert_to_lead' ? 'Creating…' : 'Create sales lead'}</button>}
        {leadId && <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Sales lead created</span>}
        {!canContact && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Contact permission needed for sales</span>}
        <button type="button" className="min-h-[38px] rounded-[11px] border border-red-200 bg-white px-3 text-xs font-bold text-red-700" disabled={Boolean(busy)} onClick={() => act('close')}>{busy === 'close' ? 'Closing…' : 'Close demand'}</button>
      </div>
    </details>

    {message && <div aria-live="polite" className={`inline-flex rounded-xl px-3 py-2 text-xs font-bold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
  </div>;
}
