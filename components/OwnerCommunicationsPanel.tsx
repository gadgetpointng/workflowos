'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff = { id: string; full_name?: string | null; email?: string | null; role?: string | null };
type Receipt = {
  sent: number;
  delivered: number;
  read: number;
  unread: number;
  readNames: string[];
  unreadNames: string[];
  recipientNames: string[];
};
type Action = {
  id: string;
  created_at: string;
  metadata?: {
    mode?: string;
    title?: string;
    message?: string;
    recipient_names?: string[];
    notification_ids?: string[];
  } | null;
  receipt?: Receipt;
};
type OwnerPolicies = {
  teamFeed: boolean;
  privateMessages: boolean;
  readReceipts: boolean;
  messageRetraction: boolean;
};

export default function OwnerCommunicationsPanel({
  staff,
  actions,
  retractedActionIds,
  policies,
}: {
  staff: Staff[];
  actions: Action[];
  retractedActionIds: string[];
  policies: OwnerPolicies;
}) {
  const router = useRouter();
  const firstMode: 'broadcast' | 'private' = policies.teamFeed ? 'broadcast' : 'private';
  const [mode, setMode] = useState<'broadcast' | 'private'>(firstMode);
  const [recipientId, setRecipientId] = useState(staff[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [retracting, setRetracting] = useState<string | null>(null);
  const retracted = new Set(retractedActionIds);

  const modeEnabled = mode === 'broadcast' ? policies.teamFeed : policies.privateMessages;

  async function send() {
    if (!modeEnabled || !title.trim() || !message.trim()) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/owner/communications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, recipientId, title, message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not send');
      setTitle('');
      setMessage('');
      setStatus(mode === 'private' ? 'Private message sent.' : `Team feed sent to ${body.recipients} staff.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  }

  async function retract(actionId: string) {
    setRetracting(actionId);
    setStatus('');
    try {
      const response = await fetch('/api/owner/communications', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not retract');
      setStatus(`Message retracted from ${body.retracted} notification${body.retracted === 1 ? '' : 's'}.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not retract');
    } finally {
      setRetracting(null);
    }
  }

  function chooseMode(next: 'broadcast' | 'private') {
    const allowed = next === 'broadcast' ? policies.teamFeed : policies.privateMessages;
    if (allowed) setMode(next);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner messaging</div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Send to your team</h2>
            <p className="mt-1 text-sm text-slate-500">Messaging modes follow the Yes / No switches in Owner Control.</p>
          </div>

          <div className="flex gap-1.5 rounded-[16px] border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
            <button
              type="button"
              disabled={!policies.teamFeed}
              onClick={() => chooseMode('broadcast')}
              className={`ios-action rounded-[12px] px-3.5 py-2 text-xs font-black ${mode === 'broadcast' && policies.teamFeed ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'} disabled:opacity-40`}
            >
              Team feed {policies.teamFeed ? '' : '· Off'}
            </button>
            <button
              type="button"
              disabled={!policies.privateMessages}
              onClick={() => chooseMode('private')}
              className={`ios-action rounded-[12px] px-3.5 py-2 text-xs font-black ${mode === 'private' && policies.privateMessages ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'} disabled:opacity-40`}
            >
              Private {policies.privateMessages ? '' : '· Off'}
            </button>
          </div>
        </div>

        {!modeEnabled && (
          <div className="mt-5 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            This messaging option is Off. Turn it On from Owner Control to use it.
          </div>
        )}

        {mode === 'private' && policies.privateMessages && (
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Staff member</span>
            <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500">
              {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}
            </select>
          </label>
        )}

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Title</span>
          <input disabled={!modeEnabled} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder={mode === 'private' ? 'Private message title' : 'Team feed title'} className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100" />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Message</span>
          <textarea disabled={!modeEnabled} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={8} placeholder="Write your message to staff…" className="w-full resize-y rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100" />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button disabled={busy || !modeEnabled || !title.trim() || !message.trim() || (mode === 'private' && !recipientId)} onClick={send} className="ios-action rounded-[14px] bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45">
            {busy ? 'Sending…' : mode === 'private' ? 'Send private message' : 'Send team feed'}
          </button>
          <span className="text-xs font-semibold text-slate-500">{mode === 'broadcast' ? `${staff.length} active staff will receive it.` : 'Only the selected staff member receives it.'}</span>
        </div>

        {status && <div className="mt-4 rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{status}</div>}
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Delivery & control history</div>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Recent owner messages</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Review sent messages. Read tracking appears only when Read Receipts is On. Retraction appears only when Message Retraction is On.</p>

        <div className="mt-5 grid gap-3">
          {actions.map((action) => {
            const names = action.metadata?.recipient_names ?? [];
            const isRetracted = retracted.has(action.id);
            const receipt = action.receipt;
            const total = receipt?.sent ?? names.length;
            const read = receipt?.read ?? 0;
            const unreadNames = receipt?.unreadNames ?? [];
            const allRead = total > 0 && read >= total;
            const privateMessage = action.metadata?.mode === 'private';

            return (
              <article key={action.id} className={`rounded-[18px] border p-4 ${isRetracted ? 'border-slate-200 bg-slate-100/80 opacity-75' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{privateMessage ? 'Private message' : 'Team feed'}</div>
                      {isRetracted && <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">Retracted</span>}
                      {!isRetracted && policies.readReceipts && receipt && total > 0 && (
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${allRead ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {privateMessage ? (allRead ? 'Read' : 'Unread') : `${read}/${total} read`}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-extrabold text-slate-950">{action.metadata?.title || 'Owner message'}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{action.metadata?.message}</p>

                    {!isRetracted && policies.readReceipts && receipt && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Sent</div>
                          <div className="mt-0.5 text-sm font-black tabular-nums text-slate-950">{receipt.sent}</div>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Read</div>
                          <div className="mt-0.5 text-sm font-black tabular-nums text-slate-950">{receipt.read}</div>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-wide text-amber-700">Unread</div>
                          <div className="mt-0.5 text-sm font-black tabular-nums text-slate-950">{receipt.unread}</div>
                        </div>
                      </div>
                    )}

                    {!isRetracted && policies.readReceipts && unreadNames.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-[11px] font-semibold text-amber-800">Waiting on: {unreadNames.join(', ')}</div>
                    )}

                    <div className="mt-3 text-[11px] font-semibold text-slate-400">{names.length ? names.join(', ') : 'Staff'} · {new Date(action.created_at).toLocaleString()}</div>
                  </div>

                  {isRetracted ? (
                    <span className="shrink-0 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500">Retracted</span>
                  ) : policies.messageRetraction ? (
                    <button disabled={retracting === action.id} onClick={() => retract(action.id)} className="ios-action shrink-0 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">{retracting === action.id ? 'Retracting…' : 'Retract'}</button>
                  ) : (
                    <span className="shrink-0 rounded-[12px] border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">Retraction Off</span>
                  )}
                </div>
              </article>
            );
          })}
          {!actions.length && <div className="rounded-[18px] border border-dashed border-slate-200 p-6 text-sm font-medium text-slate-500">No owner messages sent yet.</div>}
        </div>
      </section>
    </div>
  );
}
